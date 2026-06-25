import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// GET /api/clinica/dashboard — Dashboard estadístico para podología
// Solo accesible por ADMIN o DOCTOR
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (!usuarioDb || !["ADMIN", "DOCTOR"].includes(usuarioDb.rol.nombre)) {
      return NextResponse.json({ error: "Forbidden: Solo ADMIN o DOCTOR pueden acceder al dashboard clínico" }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const periodo = searchParams.get("periodo") ?? "mes" // "semana" | "mes" | "año"

    const ahora = new Date()
    const hoy = new Date(ahora); hoy.setHours(0, 0, 0, 0)
    const mañana = new Date(hoy); mañana.setDate(hoy.getDate() + 1)

    // Calcular inicio del período
    let inicioPeriodo: Date
    if (periodo === "semana") {
      inicioPeriodo = new Date(ahora); inicioPeriodo.setDate(ahora.getDate() - 7)
    } else if (periodo === "año") {
      inicioPeriodo = new Date(ahora); inicioPeriodo.setFullYear(ahora.getFullYear() - 1)
    } else {
      inicioPeriodo = new Date(ahora); inicioPeriodo.setDate(ahora.getDate() - 30)
    }

    // Inicio de los últimos 30 días para el gráfico de tendencias
    const hace30dias = new Date(ahora); hace30dias.setDate(ahora.getDate() - 30)

    // ── Métricas de Citas de Hoy ──────────────────────────────────────────────
    const [citasHoyPendientes, citasHoyCompletadas, citasHoyCanceladas] = await Promise.all([
      prisma.cita.count({ where: { fecha: { gte: hoy, lt: mañana }, estado: "PENDIENTE" } }),
      prisma.cita.count({ where: { fecha: { gte: hoy, lt: mañana }, estado: "COMPLETADA" } }),
      prisma.cita.count({ where: { fecha: { gte: hoy, lt: mañana }, estado: "CANCELADA" } }),
    ])

    // ── Métricas del Período ──────────────────────────────────────────────────
    const [totalConsultasPeriodo, totalRecetasPeriodo, totalPacientesPeriodo] = await Promise.all([
      prisma.atencionPodologica.count({ where: { fecha: { gte: inicioPeriodo } } }),
      prisma.receta.count({ where: { createdAt: { gte: inicioPeriodo } } }),
      prisma.atencionPodologica.groupBy({
        by: ["idCliente"],
        where: { fecha: { gte: inicioPeriodo } },
      }).then((r) => r.length),
    ])

    // ── Diagnósticos Más Frecuentes (Top 10) ─────────────────────────────────
    const topDiagnosticos = await prisma.diagnosticoAtencion.groupBy({
      by: ["idDiagnostico"],
      where: { atencion: { fecha: { gte: inicioPeriodo } } },
      _count: { idDiagnostico: true },
      orderBy: { _count: { idDiagnostico: "desc" } },
      take: 10,
    })

    const diagnosticosIds = topDiagnosticos.map((d) => d.idDiagnostico)
    const diagnosticosInfo = await prisma.diagnostico.findMany({
      where: { id: { in: diagnosticosIds } },
      select: { id: true, nombre: true, codigo: true },
    })
    const diagnosticosMap = new Map(diagnosticosInfo.map((d) => [d.id, d]))

    const topDiagnosticosResult = topDiagnosticos.map((d) => ({
      nombre: diagnosticosMap.get(d.idDiagnostico)?.nombre ?? `ID ${d.idDiagnostico}`,
      codigo: diagnosticosMap.get(d.idDiagnostico)?.codigo ?? null,
      cantidad: d._count.idDiagnostico,
    }))

    // ── Tratamientos Más Aplicados (Top 10) ───────────────────────────────────
    const topTratamientos = await prisma.tratamientoAtencion.groupBy({
      by: ["idTratamiento"],
      where: { atencion: { fecha: { gte: inicioPeriodo } } },
      _count: { idTratamiento: true },
      orderBy: { _count: { idTratamiento: "desc" } },
      take: 10,
    })

    const tratamientosIds = topTratamientos.map((t) => t.idTratamiento)
    const tratamientosInfo = await prisma.tratamiento.findMany({
      where: { id: { in: tratamientosIds } },
      select: { id: true, nombre: true },
    })
    const tratamientosMap = new Map(tratamientosInfo.map((t) => [t.id, t]))

    const topTratamientosResult = topTratamientos.map((t) => ({
      nombre: tratamientosMap.get(t.idTratamiento)?.nombre ?? `ID ${t.idTratamiento}`,
      cantidad: t._count.idTratamiento,
    }))

    // ── Distribución de Citas por Estado (del período) ───────────────────────
    const [estadoPendiente, estadoCompletada, estadoCancelada] = await Promise.all([
      prisma.cita.count({ where: { fecha: { gte: inicioPeriodo }, estado: "PENDIENTE" } }),
      prisma.cita.count({ where: { fecha: { gte: inicioPeriodo }, estado: "COMPLETADA" } }),
      prisma.cita.count({ where: { fecha: { gte: inicioPeriodo }, estado: "CANCELADA" } }),
    ])

    // ── Tendencia de Consultas (últimos 30 días, agrupado por día) ───────────
    const atencionesTendencia = await prisma.atencionPodologica.findMany({
      where: { fecha: { gte: hace30dias } },
      select: { fecha: true },
      orderBy: { fecha: "asc" },
    })

    const tendenciaPorDia = new Map<string, number>()
    atencionesTendencia.forEach((a) => {
      const dia = a.fecha.toISOString().split("T")[0]
      tendenciaPorDia.set(dia, (tendenciaPorDia.get(dia) ?? 0) + 1)
    })

    // Rellenar días sin consultas para continuidad del gráfico
    const tendenciaCompleta: { fecha: string; consultas: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date(ahora)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split("T")[0]
      tendenciaCompleta.push({ fecha: key, consultas: tendenciaPorDia.get(key) ?? 0 })
    }

    // ── Insumos Clínicos Utilizados (costo total del período) ────────────────
    const insumosUtilizados = await prisma.insumoAtencion.findMany({
      where: { atencion: { fecha: { gte: inicioPeriodo } } },
      include: {
        producto: { select: { precioCompra: true, nombre: true } },
      },
    })

    const costoTotalInsumos = insumosUtilizados.reduce((acc, i) => {
      return acc + Number(i.producto.precioCompra) * i.cantidad
    }, 0)

    const totalUnidadesInsumos = insumosUtilizados.reduce((acc, i) => acc + i.cantidad, 0)

    return NextResponse.json({
      periodo,
      hoy: {
        citasPendientes: citasHoyPendientes,
        citasCompletadas: citasHoyCompletadas,
        citasCanceladas: citasHoyCanceladas,
        totalCitas: citasHoyPendientes + citasHoyCompletadas + citasHoyCanceladas,
      },
      resumenPeriodo: {
        totalConsultas: totalConsultasPeriodo,
        totalRecetas: totalRecetasPeriodo,
        totalPacientesAtendidos: totalPacientesPeriodo,
        costoInsumos: costoTotalInsumos,
        unidadesInsumosUsadas: totalUnidadesInsumos,
      },
      distribucionCitas: {
        PENDIENTE: estadoPendiente,
        COMPLETADA: estadoCompletada,
        CANCELADA: estadoCancelada,
      },
      topDiagnosticos: topDiagnosticosResult,
      topTratamientos: topTratamientosResult,
      tendenciaConsultas: tendenciaCompleta,
      generadoEn: ahora.toISOString(),
    })
  } catch (error) {
    console.error("Error fetching clinical dashboard:", error)
    return NextResponse.json({ error: "Error al generar el dashboard clínico" }, { status: 500 })
  }
}
