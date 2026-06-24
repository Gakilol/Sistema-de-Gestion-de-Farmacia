import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { clienteSchema, emptyToNull } from "@/lib/validations"
import { registrarLog } from "@/lib/audit"
import { tienePermiso } from "@/lib/permissions"

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "CLINICA", "VER")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idCliente = Number.parseInt(id)

    const paciente = await prisma.cliente.findUnique({
      where: { id: idCliente },
      include: {
        datosClinicos: true,
        atenciones: {
          include: {
            usuario: { select: { id: true, nombreCompleto: true } },
            servicio: true,
            receta: {
              include: {
                detalles: {
                  include: {
                    producto: true
                  }
                }
              }
            }
          },
          orderBy: { fecha: "desc" }
        },
        citas: {
          orderBy: { fecha: "desc" }
        },
        recetas: {
          include: {
            detalles: {
              include: {
                producto: true
              }
            }
          },
          orderBy: { createdAt: "desc" }
        },
        ventas: {
          orderBy: { fecha: "desc" }
        },
        examenes: {
          where: { activo: true },
          include: {
            registrador: {
              select: {
                id: true,
                nombreCompleto: true
              }
            }
          },
          orderBy: { fechaExamen: "desc" }
        }
      }
    })

    if (!paciente || !["CLINICA", "AMBOS"].includes(paciente.tipoPerfil)) {
      return NextResponse.json({ error: "Paciente no encontrado o tipo de perfil incorrecto" }, { status: 404 })
    }

    return NextResponse.json(paciente)
  } catch (error) {
    console.error("Error fetching paciente detail:", error)
    return NextResponse.json({ error: "Error fetching paciente details" }, { status: 500 })
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

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "CLINICA", "EDITAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idCliente = Number.parseInt(id)
    const body = await request.json()
    const { datosClinicos, ...clientData } = body

    const validation = clienteSchema.safeParse({
      ...clientData,
      tipoPerfil: clientData.tipoPerfil || "CLINICA"
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
          id: { not: idCliente },
          OR: [
            { cedula: formattedCed },
            { cedula: cleanCed }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "La cédula ya está registrada en otro paciente" }, { status: 400 });
      }
    }

    if (data.telefono) {
      const cleanTel = data.telefono.replace(/[\s-]/g, "");
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: idCliente },
          OR: [
            { telefono: cleanTel },
            { telefono: data.telefono }
          ]
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El teléfono ya está registrado en otro paciente" }, { status: 400 });
      }
    }

    if (data.correo) {
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: idCliente },
          correo: { equals: data.correo, mode: "insensitive" }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "El correo electrónico ya está registrado en otro paciente" }, { status: 400 });
      }
    }

    if (data.nombreCompleto) {
      const cleanNombre = data.nombreCompleto.trim().replace(/\s+/g, " ");
      const existing = await prisma.cliente.findFirst({
        where: {
          id: { not: idCliente },
          nombreCompleto: { equals: cleanNombre, mode: "insensitive" }
        }
      });
      if (existing) {
        return NextResponse.json({ error: "Ya existe otro paciente registrado con ese mismo nombre" }, { status: 400 });
      }
    }

    const pacienteActualizado = await prisma.$transaction(async (tx) => {
      // Update client
      const updated = await tx.cliente.update({
        where: { id: idCliente },
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
        }
      })

      // Update or create clinical details
      await tx.datosClinicosPaciente.upsert({
        where: { idCliente },
        update: {
          antecedentes: emptyToNull(datosClinicos?.antecedentes),
          alergias: emptyToNull(datosClinicos?.alergias),
          observacionesClinicas: emptyToNull(datosClinicos?.observacionesClinicas),
          diagnosticoGeneral: emptyToNull(datosClinicos?.diagnosticoGeneral),
        },
        create: {
          idCliente,
          antecedentes: emptyToNull(datosClinicos?.antecedentes),
          alergias: emptyToNull(datosClinicos?.alergias),
          observacionesClinicas: emptyToNull(datosClinicos?.observacionesClinicas),
          diagnosticoGeneral: emptyToNull(datosClinicos?.diagnosticoGeneral),
        }
      })

      return tx.cliente.findUnique({
        where: { id: idCliente },
        include: { datosClinicos: true }
      })
    })

    registrarLog({
      accion: "ACTUALIZAR_PACIENTE",
      entidad: "Cliente",
      entidadId: idCliente,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: pacienteActualizado?.nombreCompleto }
    })

    return NextResponse.json(pacienteActualizado)
  } catch (error: any) {
    console.error("Error updating paciente:", error)
    return NextResponse.json({ error: error.message || "Error al actualizar el paciente" }, { status: 500 })
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

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "CLINICA", "EDITAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idCliente = Number.parseInt(id)
    const { activo } = await request.json()

    const paciente = await prisma.cliente.update({
      where: { id: idCliente },
      data: { activo }
    })

    registrarLog({
      accion: activo ? "ACTIVAR_PACIENTE" : "DESACTIVAR_PACIENTE",
      entidad: "Cliente",
      entidadId: idCliente,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: paciente.nombreCompleto, activo }
    })

    return NextResponse.json(paciente)
  } catch (error) {
    console.error("Error patching paciente:", error)
    return NextResponse.json({ error: "Error al cambiar estado del paciente" }, { status: 500 })
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

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "CLINICA", "ELIMINAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idCliente = Number.parseInt(id)

    const paciente = await prisma.cliente.findUnique({
      where: { id: idCliente }
    })

    if (!paciente) {
      return NextResponse.json({ error: "Paciente no encontrado" }, { status: 404 })
    }

    // Logical delete
    const pacienteDesactivado = await prisma.cliente.update({
      where: { id: idCliente },
      data: { activo: false }
    })

    registrarLog({
      accion: "ELIMINAR_PACIENTE",
      entidad: "Cliente",
      entidadId: idCliente,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { nombre: paciente.nombreCompleto }
    })

    return NextResponse.json({ success: true, message: "Paciente desactivado lógicamente" })
  } catch (error) {
    console.error("Error deleting paciente:", error)
    return NextResponse.json({ error: "Error al eliminar el paciente lógicamente" }, { status: 500 })
  }
}
