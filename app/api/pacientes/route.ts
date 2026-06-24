import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { clienteSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const search = searchParams.get("search") || ""
    const estado = searchParams.get("estado") ?? "activos" // todos, activos, inactivos

    const where: any = {
      tipoPerfil: { in: ["CLINICA", "AMBOS"] },
      OR: [
        { nombreCompleto: { contains: search, mode: "insensitive" } },
        { cedula: { contains: search, mode: "insensitive" } },
      ],
    }

    if (estado === "activos") {
      where.activo = true
    } else if (estado === "inactivos") {
      where.activo = false
    }

    const pacientes = await prisma.cliente.findMany({
      where,
      include: {
        datosClinicos: true,
      },
      orderBy: { nombreCompleto: "asc" },
    })

    return NextResponse.json(pacientes)
  } catch (error) {
    console.error("Error fetching pacientes:", error)
    return NextResponse.json({ error: "Error fetching pacientes" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { datosClinicos, ...clientData } = body

    const validation = clienteSchema.safeParse({
      ...clientData,
      tipoPerfil: clientData.tipoPerfil || "CLINICA",
    })

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message, details: validation.error.issues },
        { status: 400 }
      )
    }

    const data = validation.data

    // Duplication Checks
    if (data.cedula) {
      const cleanCed = data.cedula.replace(/[\s-]/g, "").toUpperCase();
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

    if (data.telefono) {
      const cleanTel = data.telefono.replace(/[\s-]/g, "");
      const existing = await prisma.cliente.findFirst({
        where: {
          OR: [
            { telefono: cleanTel },
            { telefono: data.telefono }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El teléfono ya está registrado" }, { status: 400 });
      }
    }

    if (data.correo) {
      const existing = await prisma.cliente.findFirst({
        where: { correo: { equals: data.correo, mode: "insensitive" } }
      });
      if (existing) {
        return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 });
      }
    }

    if (data.nombreCompleto) {
      const cleanNombre = data.nombreCompleto.trim().replace(/\s+/g, " ");
      const existing = await prisma.cliente.findFirst({
        where: { nombreCompleto: { equals: cleanNombre, mode: "insensitive" } }
      });
      if (existing) {
        return NextResponse.json({ error: "Ya existe un paciente/cliente registrado con ese mismo nombre" }, { status: 400 });
      }
    }

    const paciente = await prisma.$transaction(async (tx) => {
      return tx.cliente.create({
        data: {
          nombreCompleto: data.nombreCompleto,
          telefono: emptyToNull(data.telefono),
          correo: emptyToNull(data.correo),
          cedula: emptyToNull(data.cedula),
          ruc: emptyToNull(data.ruc),
          direccion: emptyToNull(data.direccion),
          tipoPerfil: data.tipoPerfil,
          fechaNacimiento: data.fechaNacimiento ? new Date(data.fechaNacimiento) : null,
          sexo: emptyToNull(data.sexo),
          activo: data.activo ?? true,
          datosClinicos: {
            create: {
              antecedentes: emptyToNull(datosClinicos?.antecedentes),
              alergias: emptyToNull(datosClinicos?.alergias),
              observacionesClinicas: emptyToNull(datosClinicos?.observacionesClinicas),
              diagnosticoGeneral: emptyToNull(datosClinicos?.diagnosticoGeneral),
            },
          },
        },
        include: { datosClinicos: true },
      })
    })

    registrarLog({
      accion: "CREAR_PACIENTE",
      entidad: "Cliente",
      entidadId: paciente.id,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: paciente.nombreCompleto }
    })

    return NextResponse.json(paciente, { status: 201 })
  } catch (error: any) {
    console.error("Error creating paciente:", error)
    return NextResponse.json({ error: error.message || "Error al registrar el paciente" }, { status: 500 })
  }
}
