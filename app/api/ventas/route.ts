import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const idCliente = searchParams.get("idCliente")

    const whereClause: any = {}

    if (startDate || endDate) {
      whereClause.fecha = {}
      if (startDate) {
        whereClause.fecha.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.fecha.lte = new Date(endDate)
      }
    }

    if (idCliente) {
      whereClause.idCliente = Number.parseInt(idCliente)
    }

    const ventas = await prisma.venta.findMany({
      where: whereClause,
      include: {
        cliente: true,
        usuario: { include: { rol: true } },
        detalles: { include: { producto: true } },
      },
      orderBy: { fecha: "desc" },
    })

    return NextResponse.json(ventas)
  } catch (error) {
    console.error("Error fetching ventas:", error)
    return NextResponse.json({ error: "Error fetching ventas" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ventaSchema } = require('@/lib/validations')
    const validation = ventaSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.errors[0].message, details: validation.error.errors },
        { status: 400 }
      )
    }

    const { idCliente, detalles, metodoPago, nombrePodologo, numeroReceta } = validation.data

    // Validar stock disponible y precios correctos
    for (const detalle of detalles) {
      const producto = await prisma.producto.findUnique({
        where: { id: detalle.idProducto },
      })

      if (!producto) {
        return NextResponse.json({ error: `Producto ${detalle.idProducto} no encontrado` }, { status: 404 })
      }

      let cantidadDeducir = Number.parseInt(detalle.cantidad)
      const tipoUnidad = detalle.tipoUnidad || "UNIDAD"
      if (tipoUnidad === "BLISTER") {
        cantidadDeducir = cantidadDeducir * (producto.unidadesPorBlister || 1)
      } else if (tipoUnidad === "CAJA") {
        cantidadDeducir = cantidadDeducir * (producto.unidadesPorCaja || 1)
      }
      
      // Guardar cantidadDeducir para usarlo en el update final
      detalle.cantidadDeducir = cantidadDeducir

      if (producto.stockActual < cantidadDeducir) {
        return NextResponse.json({ error: `Stock insuficiente para ${producto.nombre}` }, { status: 400 })
      }

      // Validar y asignar precio real desde la base de datos para evitar alteraciones en red
      let expectedPrice = 0
      if (tipoUnidad === "UNIDAD") {
        expectedPrice = Number(producto.precioVenta)
      } else if (tipoUnidad === "BLISTER") {
        if (!producto.precioBlister) {
          return NextResponse.json({ error: `El producto ${producto.nombre} no cuenta con presentación por blíster` }, { status: 400 })
        }
        expectedPrice = Number(producto.precioBlister)
      } else if (tipoUnidad === "CAJA") {
        if (!producto.precioCaja) {
          return NextResponse.json({ error: `El producto ${producto.nombre} no cuenta con presentación por caja` }, { status: 400 })
        }
        expectedPrice = Number(producto.precioCaja)
      }

      if (expectedPrice <= 0) {
        return NextResponse.json({ error: `El precio configurado para ${producto.nombre} (${tipoUnidad}) no es válido (debe ser mayor a 0)` }, { status: 400 })
      }

      // Sobrescribimos el precio enviado por el cliente con el verificado de la base de datos
      detalle.precioUnitario = expectedPrice
    }

    // Calcular total de forma segura
    let total = 0
    for (const detalle of detalles) {
      const subtotal = detalle.precioUnitario * Number.parseInt(detalle.cantidad)
      total += subtotal
    }

    // Crear venta
    const venta = await prisma.venta.create({
      data: {
        fecha: new Date(),
        idCliente: idCliente ? Number.parseInt(idCliente) : null,
        idUsuario: user.id,
        total,
        metodoPago,
        nombrePodologo: nombrePodologo || null,
        numeroReceta: numeroReceta || null,
        detalles: {
          create: detalles.map((d: any) => ({
            idProducto: d.idProducto,
            cantidad: Number.parseInt(d.cantidad),
            precioUnitario: d.precioUnitario,
            subtotal: d.precioUnitario * Number.parseInt(d.cantidad),
            tipoUnidad: d.tipoUnidad || "UNIDAD",
          })),
        },
      },
      include: {
        detalles: { include: { producto: true } },
        cliente: true,
        usuario: { include: { rol: true } },
      },
    })

    // Actualizar stock de productos (disminuir)
    for (const detalle of detalles) {
      await prisma.producto.update({
        where: { id: detalle.idProducto },
        data: {
          stockActual: {
            decrement: detalle.cantidadDeducir,
          },
        },
      })
    }

    return NextResponse.json(venta, { status: 201 })
  } catch (error) {
    console.error("Error creating venta:", error)
    return NextResponse.json({ error: "Error creating venta" }, { status: 500 })
  }
}
