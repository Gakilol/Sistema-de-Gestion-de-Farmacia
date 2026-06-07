import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { productoSchema, emptyToNull } from "@/lib/validations"
import { z } from "zod"
import { registrarLog } from "@/lib/audit"

// GET /api/productos?estado=activos|inactivos|todos
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const estado = searchParams.get("estado") ?? "activos" // por defecto solo activos

    let where: any = {}

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    } else if (estado === "todos") {
      // no filtramos por activo
    }

    const productos = await prisma.producto.findMany({
      where,
      include: { 
        categoria: true,
        lotes: {
          where: { activo: true, stockActual: { gt: 0 } },
          orderBy: { fechaVencimiento: "asc" },
        },
      },
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(productos)
  } catch (error) {
    console.error("Error fetching productos:", error)
    return NextResponse.json({ error: "Error fetching productos" }, { status: 500 })
  }
}

// POST /api/productos  -> crear producto nuevo (CATÁLOGO solamente — stock=0 por defecto)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    // si quieres que solo ADMIN pueda crear productos
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    console.log("POST /api/productos received body:", body)
    
    // Zod validation
    const parsed = productoSchema.safeParse(body)
    if (!parsed.success) {
      console.log("POST /api/productos validation failed:", parsed.error.format())
      return NextResponse.json(
        { error: "Datos inválidos", details: parsed.error.format() },
        { status: 400 }
      )
    }

    const data = parsed.data

    const producto = await prisma.$transaction(async (tx) => {
      const prod = await tx.producto.create({
        data: {
          nombre: data.nombre,
          codigoBarras: emptyToNull(data.codigoBarras),
          descripcion: emptyToNull(data.descripcion),
          idCategoria: data.idCategoria,
          precioCompra: data.precioCompra || 0,
          precioVenta: data.precioVenta,
          precioBlister: data.precioBlister,
          precioCaja: data.precioCaja,
          unidadesPorBlister: data.unidadesPorBlister,
          unidadesPorCaja: data.unidadesPorCaja,
          stockActual: (data as any).stockInicial || 0,
          stockMinimo: data.stockMinimo,
          activo: data.activo,
        },
        include: { categoria: true },
      })

      const stockInicialVal = (data as any).stockInicial || 0
      if (stockInicialVal > 0) {
        const loteInicial = await tx.lote.create({
          data: {
            idProducto: prod.id,
            codigoLote: `INICIAL-${Date.now()}`,
            stockInicial: stockInicialVal,
            stockActual: stockInicialVal,
            costoCompra: prod.precioCompra,
            activo: true,
          },
        })

        await tx.movimientoInventario.create({
          data: {
            idProducto: prod.id,
            idLote: loteInicial.id,
            tipo: "AJUSTE_POSITIVO",
            cantidad: stockInicialVal,
            stockResultante: stockInicialVal,
            costoUnitario: prod.precioCompra,
            referencia: "Stock inicial al registrar producto",
            idUsuario: user.id,
          },
        })
      }

      return prod
    })

    // Registrar auditoría
    registrarLog({
      accion: "CREAR_PRODUCTO",
      entidad: "Producto",
      entidadId: producto.id,
      idUsuario: user.id,
      detalles: { nombre: producto.nombre, precioVenta: producto.precioVenta, stockActual: producto.stockActual },
    })

    return NextResponse.json(producto, { status: 201 })
  } catch (error) {
    console.error("Error creating producto:", error)
    return NextResponse.json({ 
      error: "Error creating producto", 
      details: { _errors: [error instanceof Error ? error.message : String(error)] } 
    }, { status: 500 })
  }
}
