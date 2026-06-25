import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { descuentoSchema } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

// GET /api/descuentos/[id]
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const descuento = await prisma.descuento.findUnique({
      where: { id: Number.parseInt(id) },
      include: {
        usuario: { select: { id: true, nombreCompleto: true } },
        productos: { select: { idProducto: true } },
        categorias: { select: { idCategoria: true } },
        clientes: { select: { idCliente: true } }
      }
    })

    if (!descuento) {
      return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 })
    }

    // Adaptar para el frontend (devolver IDs como arreglos planos)
    const formatted = {
      ...descuento,
      productosIds: descuento.productos.map(p => p.idProducto),
      categoriasIds: descuento.categorias.map(c => c.idCategoria),
      clientesIds: descuento.clientes.map(c => c.idCliente),
    }

    return NextResponse.json(formatted)
  } catch (error) {
    console.error("Error fetching descuento:", error)
    return NextResponse.json({ error: "Error fetching descuento" }, { status: 500 })
  }
}

// PUT /api/descuentos/[id] (ADMIN)
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const discountId = Number.parseInt(id)
    const body = await request.json()
    const validation = descuentoSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    const descuentoActualizado = await prisma.$transaction(async (tx) => {
      // 1. Limpiar relaciones previas
      await tx.descuentoProducto.deleteMany({ where: { idDescuento: discountId } })
      await tx.descuentoCategoria.deleteMany({ where: { idDescuento: discountId } })
      await tx.descuentoCliente.deleteMany({ where: { idDescuento: discountId } })

      // 2. Actualizar descuento principal
      const desc = await tx.descuento.update({
        where: { id: discountId },
        data: {
          nombre: data.nombre,
          descripcion: data.descripcion,
          tipoAplicacion: data.tipoAplicacion,
          tipoValor: data.tipoValor,
          tipo: data.tipoValor === "PORCENTAJE" ? "PORCENTAJE" : "MONTO", // compatibility
          valor: data.valor,
          motivo: data.nombre, // compatibility
          fechaInicio: data.fechaInicio ? new Date(data.fechaInicio) : null,
          fechaFin: data.fechaFin ? new Date(data.fechaFin) : null,
          montoMinimoCompra: data.montoMinimoCompra,
          montoMinimo: data.montoMinimoCompra, // compatibility
          cantidadMinima: data.cantidadMinima,
          limiteUso: data.limiteUso,
          esAcumulable: data.esAcumulable ?? false,
          activo: data.activo ?? true,
          estado: (data.activo ?? true) ? "ACTIVO" : "INACTIVO", // compatibility
        },
      })

      // 3. Re-asociar según tipo de aplicación
      if (data.tipoAplicacion === "PRODUCTO" && data.productosIds && data.productosIds.length > 0) {
        await tx.descuentoProducto.createMany({
          data: data.productosIds.map(prodId => ({
            idDescuento: desc.id,
            idProducto: prodId
          }))
        })
      } else if (data.tipoAplicacion === "CATEGORIA" && data.categoriasIds && data.categoriasIds.length > 0) {
        await tx.descuentoCategoria.createMany({
          data: data.categoriasIds.map(catId => ({
            idDescuento: desc.id,
            idCategoria: catId
          }))
        })
      } else if (data.tipoAplicacion === "CLIENTE" && data.clientesIds && data.clientesIds.length > 0) {
        await tx.descuentoCliente.createMany({
          data: data.clientesIds.map(cliId => ({
            idDescuento: desc.id,
            idCliente: cliId
          }))
        })
      }

      return desc
    })

    registrarLog({
      accion: "ACTUALIZAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: descuentoActualizado.id,
      idUsuario: user.id,
      detalles: { nombre: descuentoActualizado.nombre, valor: Number(descuentoActualizado.valor), tipoAplicacion: descuentoActualizado.tipoAplicacion }
    })

    return NextResponse.json(descuentoActualizado)
  } catch (error) {
    console.error("Error updating descuento:", error)
    return NextResponse.json({ error: "Error al actualizar el descuento" }, { status: 500 })
  }
}

// PATCH /api/descuentos/[id] (ADMIN)
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const discountId = Number.parseInt(id)
    const { activo } = await request.json()

    if (activo === undefined) {
      return NextResponse.json({ error: "El campo activo es requerido" }, { status: 400 })
    }

    const descuento = await prisma.descuento.update({
      where: { id: discountId },
      data: {
        activo: Boolean(activo),
        estado: Boolean(activo) ? "ACTIVO" : "INACTIVO" // compatibility
      },
    })

    registrarLog({
      accion: descuento.activo ? "ACTIVAR_DESCUENTO" : "DESACTIVAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: descuento.id,
      idUsuario: user.id,
      detalles: { nombre: descuento.nombre, activo: descuento.activo }
    })

    return NextResponse.json(descuento)
  } catch (error) {
    console.error("Error patching descuento:", error)
    return NextResponse.json({ error: "Error al cambiar estado de descuento" }, { status: 500 })
  }
}

// DELETE /api/descuentos/[id] (ADMIN)
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { id } = await params
    const discountId = Number.parseInt(id)

    // Check if discount has been used in sales
    const count = await prisma.venta.count({
      where: { idDescuento: discountId }
    })

    const descuento = await prisma.descuento.findUnique({
      where: { id: discountId }
    })

    if (!descuento) {
      return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 })
    }

    if (count > 0) {
      // Perform logical delete
      await prisma.descuento.update({
        where: { id: discountId },
        data: {
          activo: false,
          estado: "INACTIVO"
        }
      })
      registrarLog({
        accion: "DESACTIVAR_DESCUENTO_POR_DELETE",
        entidad: "Descuento",
        entidadId: discountId,
        idUsuario: user.id,
        detalles: { nombre: descuento.nombre, nota: "Desactivado lógicamente por tener ventas asociadas" }
      })
      return NextResponse.json({ success: true, message: "Descuento desactivado por tener historial" })
    }

    // Physical delete if not used
    await prisma.descuento.delete({
      where: { id: discountId }
    })

    registrarLog({
      accion: "ELIMINAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: discountId,
      idUsuario: user.id,
      detalles: { nombre: descuento.nombre }
    })

    return NextResponse.json({ success: true, message: "Descuento eliminado exitosamente" })
  } catch (error) {
    console.error("Error deleting descuento:", error)
    return NextResponse.json({ error: "Error al eliminar el descuento" }, { status: 500 })
  }
}
