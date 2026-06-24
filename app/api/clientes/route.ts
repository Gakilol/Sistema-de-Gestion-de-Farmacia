import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { clienteSchema, emptyToNull } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const estado = searchParams.get("estado") ?? "activos"

    const baseWhere = {
      tipoPerfil: { in: ["FARMACIA", "AMBOS"] },
      OR: [
        { nombreCompleto: { contains: search, mode: "insensitive" } },
        { cedula: { contains: search, mode: "insensitive" } },
      ],
    }

    const where: any = { ...baseWhere }

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }

    const clientes = await prisma.cliente.findMany({
      where,
      orderBy: { nombreCompleto: "asc" },
    })

    return NextResponse.json(clientes)
  } catch (error) {
    console.error("Error fetching clientes:", error)
    return NextResponse.json({ error: "Error fetching clientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validation = clienteSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const { nombreCompleto, telefono, correo, cedula, ruc, direccion, activo, tipoPerfil, fechaNacimiento, sexo } = validation.data

    // 1. Validar duplicados de Cédula (tanto versión limpia como formateada)
    if (cedula) {
      const cleanCed = cedula.replace(/[\s-]/g, "").toUpperCase();
      const formattedCed = `${cleanCed.substring(0, 3)}-${cleanCed.substring(3, 9)}-${cleanCed.substring(9, 13)}${cleanCed.charAt(13)}`;
      const existing = await prisma.cliente.findFirst({
        where: {
          OR: [
            { cedula: formattedCed },
            { cedula: cleanCed }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "La cédula ya está registrada" }, { status: 400 });
      }
    }

    // 1.1. Validar duplicados de RUC (tanto versión limpia como formateada)
    if (ruc) {
      const cleanRuc = ruc.replace(/[\s-]/g, "").toUpperCase();
      const formattedRuc = `${cleanRuc.substring(0, 3)}-${cleanRuc.substring(3, 9)}-${cleanRuc.substring(9, 13)}${cleanRuc.charAt(13)}`;
      const existing = await prisma.cliente.findFirst({
        where: {
          OR: [
            { ruc: formattedRuc },
            { ruc: cleanRuc }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El RUC ya está registrado" }, { status: 400 });
      }
    }

    // 2. Validar duplicados de Teléfono
    if (telefono) {
      const cleanTel = telefono.replace(/[\s-]/g, "");
      const existing = await prisma.cliente.findFirst({
        where: {
          OR: [
            { telefono: cleanTel },
            { telefono }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El teléfono ya está registrado" }, { status: 400 });
      }
    }

    // 3. Validar duplicados de Correo
    if (correo) {
      const existing = await prisma.cliente.findFirst({
        where: {
          correo: { equals: correo, mode: "insensitive" }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 });
      }
    }

    // 4. Validar duplicados de Nombre Completo
    if (nombreCompleto) {
      const cleanNombre = nombreCompleto.trim().replace(/\s+/g, " ");
      const existing = await prisma.cliente.findFirst({
        where: {
          nombreCompleto: { equals: cleanNombre, mode: "insensitive" }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "Ya existe un cliente registrado con ese mismo nombre" }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombreCompleto,
        telefono: emptyToNull(telefono),
        correo: emptyToNull(correo),
        cedula: emptyToNull(cedula),
        ruc: emptyToNull(ruc),
        direccion: emptyToNull(direccion),
        tipoPerfil: tipoPerfil || "FARMACIA",
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : null,
        sexo: emptyToNull(sexo),
        activo: activo ?? true,
      },
    })

    return NextResponse.json(cliente, { status: 201 })
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = error.meta?.target as string[];
      if (target?.includes("cedula")) return NextResponse.json({ error: "La cédula ya existe" }, { status: 400 });
      if (target?.includes("ruc")) return NextResponse.json({ error: "El RUC ya existe" }, { status: 400 });
      if (target?.includes("correo")) return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 });
      if (target?.includes("telefono")) return NextResponse.json({ error: "El teléfono ya está registrado" }, { status: 400 });
      return NextResponse.json({ error: "El cliente ya existe (dato duplicado)" }, { status: 400 });
    }
    console.error("Error creating cliente:", error)
    return NextResponse.json({ error: "Error creating cliente" }, { status: 500 })
  }
}
