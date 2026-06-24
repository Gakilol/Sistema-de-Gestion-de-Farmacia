import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { proveedorSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const estado = searchParams.get("estado") ?? "activos"

    const where: any = {
      OR: [
        { nombre: { contains: search, mode: "insensitive" } },
        { ruc: { contains: search, mode: "insensitive" } },
      ],
    }

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }

    const proveedores = await prisma.proveedor.findMany({
      where,
      orderBy: { nombre: "asc" },
    })

    return NextResponse.json(proveedores)
  } catch (error) {
    console.error("Error fetching proveedores:", error)
    return NextResponse.json({ error: "Error fetching proveedores" }, { status: 500 })
  }
}

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

    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const validation = proveedorSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombre, telefono, correo, direccion, ruc, contacto, activo } = validation.data

    // Check duplicates manually to provide clean error messages
    const duplicateChecks = []
    if (nombre) {
      duplicateChecks.push(
        prisma.proveedor.findFirst({
          where: { nombre: { equals: nombre, mode: "insensitive" } }
        }).then(res => { if (res) throw new Error("Ya existe un proveedor registrado con este nombre"); })
      )
    }

    if (ruc) {
      const cleanRuc = ruc.replace(/[\s-]/g, "").toUpperCase()
      const formattedRuc = `${cleanRuc.substring(0, 3)}-${cleanRuc.substring(3, 9)}-${cleanRuc.substring(9, 13)}${cleanRuc.charAt(13)}`
      duplicateChecks.push(
        prisma.proveedor.findFirst({
          where: {
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
          where: { correo: { equals: correo, mode: "insensitive" } }
        }).then(res => { if (res) throw new Error("El correo electrónico ya está registrado para otro proveedor"); })
      )
    }

    try {
      await Promise.all(duplicateChecks)
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 400 })
    }

    const proveedor = await prisma.proveedor.create({
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
      accion: "CREAR_PROVEEDOR",
      entidad: "Proveedor",
      entidadId: proveedor.id,
      idUsuario: user.id,
      detalles: { nombre: proveedor.nombre }
    })

    return NextResponse.json(proveedor, { status: 201 })
  } catch (error: any) {
    console.error("Error creating proveedor:", error)
    return NextResponse.json({ error: error.message || "Error al crear el proveedor" }, { status: 500 })
  }
}
