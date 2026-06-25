import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// GET /api/clinica/reportes — Reportes exportables de podología
// Parámetros: fechaInicio, fechaFin, idDiagnostico, idPaciente, idDoctor, formato (json|excel)
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (!usuarioDb || !["ADMIN", "DOCTOR"].includes(usuarioDb.rol.nombre)) {
      return NextResponse.json({ error: "Forbidden: Solo ADMIN o DOCTOR pueden acceder a los reportes clínicos" }, { status: 403 })
    }

    const params = request.nextUrl.searchParams
    const fechaInicio = params.get("fechaInicio")
    const fechaFin = params.get("fechaFin")
    const idDiagnostico = params.get("idDiagnostico")
    const idPaciente = params.get("idPaciente")
    const idDoctor = params.get("idDoctor")

    // Construir filtros
    const where: any = {}
    if (fechaInicio || fechaFin) {
      where.fecha = {}
      if (fechaInicio) where.fecha.gte = new Date(fechaInicio + "T00:00:00")
      if (fechaFin) where.fecha.lte = new Date(fechaFin + "T23:59:59")
    }
    if (idPaciente) where.idCliente = parseInt(idPaciente)
    if (idDoctor) where.idUsuario = parseInt(idDoctor)
    if (idDiagnostico) {
      where.diagnosticos = {
        some: { idDiagnostico: parseInt(idDiagnostico) }
      }
    }

    const atenciones = await prisma.atencionPodologica.findMany({
      where,
      include: {
        cliente: { select: { id: true, nombreCompleto: true, cedula: true, telefono: true } },
        usuario: { select: { id: true, nombreCompleto: true } },
        diagnosticos: { include: { diagnostico: { select: { nombre: true, codigo: true } } } },
        tratamientos: { include: { tratamiento: { select: { nombre: true } } } },
        insumos: {
          include: {
            producto: { select: { nombre: true, precioCompra: true, unidadMedida: true } }
          }
        },
        receta: {
          include: {
            detalles: {
              include: { producto: { select: { nombre: true } } }
            }
          }
        },
      },
      orderBy: { fecha: "desc" },
      take: 500, // Límite de seguridad para exportaciones
    })

    // Transformar datos para el reporte
    const consultasReporte = atenciones.map((a) => ({
      id: a.id,
      fecha: a.fecha.toLocaleDateString("es-NI"),
      hora: a.fecha.toLocaleTimeString("es-NI", { hour: "2-digit", minute: "2-digit" }),
      paciente: a.cliente.nombreCompleto,
      cedulaPaciente: a.cliente.cedula ?? "",
      telefonoPaciente: a.cliente.telefono ?? "",
      doctor: a.usuario.nombreCompleto,
      subjetivo: a.subjetivo,
      objetivo: a.objetivo,
      analisis: a.analisis,
      plan: a.plan,
      diagnosticos: a.diagnosticos.map((d) =>
        d.diagnostico.codigo
          ? `${d.diagnostico.codigo} - ${d.diagnostico.nombre}`
          : d.diagnostico.nombre
      ).join("; "),
      tratamientos: a.tratamientos.map((t) => t.tratamiento.nombre).join("; "),
      insumos: a.insumos.map((i) =>
        `${i.producto.nombre} x${i.cantidad} ${i.producto.unidadMedida ?? ""}`
      ).join("; "),
      costoInsumos: a.insumos.reduce((sum, i) => sum + Number(i.producto.precioCompra) * i.cantidad, 0).toFixed(2),
      tieneReceta: a.receta ? "Sí" : "No",
      medicamentosRecetados: a.receta
        ? a.receta.detalles.map((d) => `${d.producto.nombre} x${d.cantidad}`).join("; ")
        : "",
    }))

    // Resumen estadístico
    const resumen = {
      totalConsultas: consultasReporte.length,
      totalPacientesUnicos: new Set(atenciones.map((a) => a.idCliente)).size,
      totalRecetas: atenciones.filter((a) => a.receta).length,
      totalInsumosCosto: atenciones.reduce((sum, a) =>
        sum + a.insumos.reduce((s, i) => s + Number(i.producto.precioCompra) * i.cantidad, 0), 0
      ).toFixed(2),
      fechaGeneracion: new Date().toLocaleDateString("es-NI"),
      filtrosAplicados: {
        desde: fechaInicio ?? "Sin límite",
        hasta: fechaFin ?? "Sin límite",
        paciente: idPaciente ?? "Todos",
        doctor: idDoctor ?? "Todos",
        diagnostico: idDiagnostico ?? "Todos",
      },
    }

    return NextResponse.json({ resumen, consultas: consultasReporte })
  } catch (error) {
    console.error("Error generating clinical report:", error)
    return NextResponse.json({ error: "Error al generar el reporte clínico" }, { status: 500 })
  }
}
