import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { descuentoSchema } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

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
        usuario: { select: { id: true, nombreCompleto: true } }
      }
    })

    if (!descuento) {
      return NextResponse.json({ error: "Descuento no encontrado" }, { status: 404 })
    }

    return NextResponse.json(descuento)
  } catch (error) {
    console.error("Error fetching descuento:", error)
    return NextResponse.json({ error: "Error fetching descuento" }, { status: 500 })
  }
}

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

    const { tipo, valor, motivo, fechaInicio, fechaFin, montoMinimo, maxDescuento, esAcumulable, estado } = validation.data

    const descuento = await prisma.descuento.update({
      where: { id: discountId },
      data: {
        tipo,
        valor,
        motivo,
        fechaInicio: fechaInicio ? new Date(fechaInicio) : null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
        montoMinimo,
        maxDescuento,
        esAcumulable: esAcumulable ?? false,
        estado: estado ?? "ACTIVO",
      },
    })

    registrarLog({
      accion: "ACTUALIZAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: descuento.id,
      idUsuario: user.id,
      detalles: { motivo: descuento.motivo, valor: Number(descuento.valor), tipo: descuento.tipo }
    })

    return NextResponse.json(descuento)
  } catch (error) {
    console.error("Error updating descuento:", error)
    return NextResponse.json({ error: "Error al actualizar el descuento" }, { status: 500 })
  }
}

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
    const { estado } = await request.json()

    if (estado !== "ACTIVO" && estado !== "INACTIVO") {
      return NextResponse.json({ error: "Estado de descuento inválido" }, { status: 400 })
    }

    const descuento = await prisma.descuento.update({
      where: { id: discountId },
      data: { estado },
    })

    registrarLog({
      accion: estado === "ACTIVO" ? "ACTIVAR_DESCUENTO" : "DESACTIVAR_DESCUENTO",
      entidad: "Descuento",
      entidadId: descuento.id,
      idUsuario: user.id,
      detalles: { motivo: descuento.motivo, estado }
    })

    return NextResponse.json(descuento)
  } catch (error) {
    console.error("Error patching descuento:", error)
    return NextResponse.json({ error: "Error al cambiar estado de descuento" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      // Perform logical delete: set status to INACTIVO
      await prisma.descuento.update({
        where: { id: discountId },
        data: { estado: "INACTIVO" }
      })
      registrarLog({
        accion: "DESACTIVAR_DESCUENTO_POR_DELETE",
        entidad: "Descuento",
        entidadId: discountId,
        idUsuario: user.id,
        detalles: { motivo: descuento.motivo, nota: "Desactivado lógicamente por tener ventas asociadas" }
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
      detalles: { motivo: descuento.motivo }
    })

    return NextResponse.json({ success: true, message: "Descuento eliminado exitosamente" })
  } catch (error) {
    console.error("Error deleting descuento:", error)
    return NextResponse.json({ error: "Error al eliminar el descuento" }, { status: 500 })
  }
}
