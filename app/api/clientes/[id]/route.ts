import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { clienteSchema, emptyToNull } from "@/lib/validations"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number.parseInt(id) },
    })

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Error fetching cliente:", error)
    return NextResponse.json({ error: "Error fetching cliente" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const clientId = Number.parseInt(id)
    const body = await request.json()
    const validation = clienteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombreCompleto, telefono, correo, cedula, ruc, direccion, activo } = validation.data

    // 1. Validar duplicados de Cédula
    if (cedula) {
      const cleanCed = cedula.replace(/[\s-]/g, "").toUpperCase();
      const formattedCed = `${cleanCed.substring(0, 3)}-${cleanCed.substring(3, 9)}-${cleanCed.substring(9, 13)}${cleanCed.charAt(13)}`;
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: clientId },
          OR: [
            { cedula: formattedCed },
            { cedula: cleanCed }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "La cédula ya está registrada en otro cliente" }, { status: 400 });
      }
    }

    // 1.1. Validar duplicados de RUC
    if (ruc) {
      const cleanRuc = ruc.replace(/[\s-]/g, "").toUpperCase();
      const formattedRuc = `${cleanRuc.substring(0, 3)}-${cleanRuc.substring(3, 9)}-${cleanRuc.substring(9, 13)}${cleanRuc.charAt(13)}`;
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: clientId },
          OR: [
            { ruc: formattedRuc },
            { ruc: cleanRuc }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El RUC ya está registrado en otro cliente" }, { status: 400 });
      }
    }

    // 2. Validar duplicados de Teléfono
    if (telefono) {
      const cleanTel = telefono.replace(/[\s-]/g, "");
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: clientId },
          OR: [
            { telefono: cleanTel },
            { telefono }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El teléfono ya está registrado en otro cliente" }, { status: 400 });
      }
    }

    // 3. Validar duplicados de Correo
    if (correo) {
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: clientId },
          correo: { equals: correo, mode: "insensitive" }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El correo electrónico ya está registrado en otro cliente" }, { status: 400 });
      }
    }

    // 4. Validar duplicados de Nombre Completo
    if (nombreCompleto) {
      const cleanNombre = nombreCompleto.trim().replace(/\s+/g, " ");
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: clientId },
          nombreCompleto: { equals: cleanNombre, mode: "insensitive" }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "Ya existe otro cliente registrado con ese mismo nombre" }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id: clientId },
      data: {
        nombreCompleto,
        telefono: emptyToNull(telefono),
        correo: emptyToNull(correo),
        cedula: emptyToNull(cedula),
        ruc: emptyToNull(ruc),
        direccion: emptyToNull(direccion),
        activo: activo ?? true,
      },
    })

    return NextResponse.json(cliente)
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[];
      if (target?.includes("cedula")) return NextResponse.json({ error: "La cédula ya existe en otro cliente" }, { status: 400 });
      if (target?.includes("ruc")) return NextResponse.json({ error: "El RUC ya existe en otro cliente" }, { status: 400 });
      if (target?.includes("correo")) return NextResponse.json({ error: "El correo electrónico ya está registrado en otro cliente" }, { status: 400 });
      if (target?.includes("telefono")) return NextResponse.json({ error: "El teléfono ya está registrado en otro cliente" }, { status: 400 });
      return NextResponse.json({ error: "El cliente ya existe (dato duplicado)" }, { status: 400 });
    }
    console.error("Error updating cliente:", error)
    return NextResponse.json({ error: "Error updating cliente" }, { status: 500 })
  }
}

// 👇 NUEVO: activar / desactivar
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const { activo } = await request.json()

    const cliente = await prisma.cliente.update({
      where: { id: Number.parseInt(id) },
      data: { activo },
    })

    return NextResponse.json(cliente)
  } catch (error) {
    console.error("Error patching cliente:", error)
    return NextResponse.json({ error: "Error patching cliente" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    
    // Check if it has sales, if so, maybe prevent deletion
    const cliente = await prisma.cliente.findUnique({
      where: { id: Number.parseInt(id) },
      include: { _count: { select: { ventas: true } } }
    })

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 })
    }

    if (cliente._count.ventas > 0) {
      return NextResponse.json({ error: "No se puede eliminar el cliente porque tiene ventas asociadas. Considérelo desactivarlo en su lugar." }, { status: 400 })
    }

    await prisma.cliente.delete({
      where: { id: Number.parseInt(id) },
    })

    return NextResponse.json({ message: "Cliente eliminado" })
  } catch (error) {
    console.error("Error deleting cliente:", error)
    return NextResponse.json({ error: "Error deleting cliente" }, { status: 500 })
  }
}
