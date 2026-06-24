import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { proveedorSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const proveedor = await prisma.proveedor.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!proveedor) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 })
    }

    return NextResponse.json(proveedor)
  } catch (error) {
    console.error("Error fetching proveedor:", error)
    return NextResponse.json({ error: "Error fetching proveedor" }, { status: 500 })
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
    const providerId = Number.parseInt(id)
    const body = await request.json()
    const validation = proveedorSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, telefono, correo, direccion, ruc, contacto, activo } = validation.data

    // Check duplicates manually
    const duplicateChecks = []
    if (nombre) {
      duplicateChecks.push(
        prisma.proveedor.findFirst({
          where: { nombre: { equals: nombre, mode: "insensitive" }, id: { not: providerId } }
        }).then(res => { if (res) throw new Error("Ya existe otro proveedor registrado con este nombre"); })
      )
    }

    if (ruc) {
      const cleanRuc = ruc.replace(/[\s-]/g, "").toUpperCase()
      const formattedRuc = `${cleanRuc.substring(0, 3)}-${cleanRuc.substring(3, 9)}-${cleanRuc.substring(9, 13)}${cleanRuc.charAt(13)}`
      duplicateChecks.push(
        prisma.proveedor.findFirst({
          where: {
            id: { not: providerId },
            OR: [
              { ruc: cleanRuc },
              { ruc: formattedRuc }
            ]
          }
        }).then(res => { if (res) throw new Error("El RUC ya está registrado para otro proveedor"); })
      )
    }

    if (telefono) {
      const cleanTel = telefono.replace(/[\s-]/g, "")
      duplicateChecks.push(
        prisma.proveedor.findFirst({
          where: {
            id: { not: providerId },
            OR: [
              { telefono: cleanTel },
              { telefono }
            ]
          }
        }).then(res => { if (res) throw new Error("El teléfono ya está registrado para otro proveedor"); })
      )
    }

    if (correo) {
      duplicateChecks.push(
        prisma.proveedor.findFirst({
          where: { correo: { equals: correo, mode: "insensitive" }, id: { not: providerId } }
        }).then(res => { if (res) throw new Error("El correo electrónico ya está registrado para otro proveedor"); })
      )
    }

    try {
      await Promise.all(duplicateChecks)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const proveedor = await prisma.proveedor.update({
      where: { id: providerId },
      data: {
        nombre,
        telefono: emptyToNull(telefono),
        correo: emptyToNull(correo),
        direccion: emptyToNull(direccion),
        ruc: emptyToNull(ruc),
        contacto: emptyToNull(contacto),
        activo: activo ?? true,
      },
    })

    registrarLog({
      accion: "ACTUALIZAR_PROVEEDOR",
      entidad: "Proveedor",
      entidadId: proveedor.id,
      idUsuario: user.id,
      detalles: { nombre: proveedor.nombre }
    })

    return NextResponse.json(proveedor)
  } catch (error: any) {
    console.error("Error updating proveedor:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar el proveedor" }, { status: 500 })
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
    const providerId = Number.parseInt(id)
    const { activo } = await request.json()

    const proveedor = await prisma.proveedor.update({
      where: { id: providerId },
      data: { activo },
    })

    registrarLog({
      accion: activo ? "ACTIVAR_PROVEEDOR" : "DESACTIVAR_PROVEEDOR",
      entidad: "Proveedor",
      entidadId: proveedor.id,
      idUsuario: user.id,
      detalles: { nombre: proveedor.nombre, activo }
    })

    return NextResponse.json(proveedor)
  } catch (error) {
    console.error("Error patching proveedor:", error)
    return NextResponse.json({ error: "Error patching proveedor" }, { status: 500 })
  }
}

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
    const providerId = Number.parseInt(id)

    const proveedor = await prisma.proveedor.findUnique({
      where: { id: providerId }
    })

    if (!proveedor) {
      return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 })
    }

    // Logical delete
    const proveedorActualizado = await prisma.proveedor.update({
      where: { id: providerId },
      data: { activo: false }
    })

    registrarLog({
      accion: "ELIMINAR_PROVEEDOR",
      entidad: "Proveedor",
      entidadId: providerId,
      idUsuario: user.id,
      detalles: { nombre: proveedor.nombre }
    })

    return NextResponse.json({ success: true, message: "Proveedor desactivado lógicamente" })
  } catch (error) {
    console.error("Error deleting proveedor:", error)
    return NextResponse.json({ error: "Error deleting proveedor" }, { status: 500 })
  }
}
