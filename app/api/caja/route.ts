import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { calcularCierreCaja } from "@/lib/domain/cash"

const dinero = (valor: unknown) => Number(valor)

export async function GET(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page") || 1))
  const take = 20
  const where = user.rolNombre === "ADMIN" ? {} : { idUsuario: user.id }
  const [sesiones, total] = await Promise.all([
    prisma.cajaSesion.findMany({
      where,
      include: {
        usuario: { select: { nombreCompleto: true } },
        movimientos: {
          orderBy: { createdAt: "desc" },
          include: { usuario: { select: { nombreCompleto: true } } },
        },
        ventas: {
          where: { estado: "COMPLETADA" },
          orderBy: { fecha: "desc" },
          select: {
            id: true,
            fecha: true,
            metodoPago: true,
            total: true,
            tipoComprobante: true,
            usuario: { select: { nombreCompleto: true } },
            cliente: { select: { nombreCompleto: true } },
          },
        },
      },
      orderBy: { abiertaEn: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.cajaSesion.count({ where }),
  ])

  const sesionesConResumen = sesiones.map((sesion) => {
    const pagos = sesion.ventas.reduce(
      (acc, venta) => {
        const metodo = venta.metodoPago as keyof typeof acc
        if (metodo in acc) acc[metodo] += Number(venta.total)
        return acc
      },
      { EFECTIVO: 0, TARJETA: 0, TRANSFERENCIA: 0 },
    )
    const cierreActual = calcularCierreCaja(
      Number(sesion.montoInicial),
      pagos.EFECTIVO,
      sesion.movimientos.map((movimiento) => ({ tipo: movimiento.tipo as "INGRESO" | "RETIRO" | "GASTO", monto: Number(movimiento.monto) })),
      Number(sesion.montoFinalContado || 0),
    )

    return {
      ...sesion,
      resumen: {
        pagos,
        totalVendido: pagos.EFECTIVO + pagos.TARJETA + pagos.TRANSFERENCIA,
        ventasCount: sesion.ventas.length,
        montoEsperadoActual: sesion.montoEsperado == null ? cierreActual.montoEsperado : Number(sesion.montoEsperado),
      },
    }
  })

  return NextResponse.json(
    { sesiones: sesionesConResumen, total, page, pages: Math.ceil(total / take), ultimaActualizacion: new Date().toISOString() },
    { headers: { "Cache-Control": "no-store" } },
  )
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user || !["ADMIN", "EMPLEADO"].includes(user.rolNombre)) return NextResponse.json({ error: "Sin permiso" }, { status: user ? 403 : 401 })
  const body = await request.json()
  const montoInicial = dinero(body.montoInicial)
  if (!Number.isFinite(montoInicial) || montoInicial < 0) return NextResponse.json({ error: "Monto inicial inválido" }, { status: 400 })
  try {
    const caja = await prisma.$transaction(async (tx) => {
      const abierta = await tx.cajaSesion.findFirst({ where: { idUsuario: user.id, estado: "ABIERTA" } })
      if (abierta) throw new Error("Ya existe una caja abierta para este usuario")
      const nueva = await tx.cajaSesion.create({ data: { idUsuario: user.id, montoInicial } })
      await tx.auditoriaLog.create({ data: { accion: "APERTURA_CAJA", entidad: "CajaSesion", entidadId: nueva.id, idUsuario: user.id, modulo: "CAJA", detalles: JSON.stringify({ montoInicial }) } })
      return nueva
    })
    return NextResponse.json(caja, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "No fue posible abrir la caja" }, { status: 409 })
  }
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const body = await request.json()
  const id = Number(body.id)
  const accion = String(body.accion || "")
  const caja = await prisma.cajaSesion.findUnique({ where: { id }, include: { movimientos: true } })
  if (!caja) return NextResponse.json({ error: "Caja no encontrada" }, { status: 404 })
  if (caja.idUsuario !== user.id && user.rolNombre !== "ADMIN") return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  if (accion === "MOVIMIENTO") {
    if (caja.estado !== "ABIERTA") return NextResponse.json({ error: "La caja está cerrada" }, { status: 409 })
    const tipo = String(body.tipo)
    const monto = dinero(body.monto)
    const concepto = String(body.concepto || "").trim()
    if (!["INGRESO", "RETIRO", "GASTO"].includes(tipo) || !Number.isFinite(monto) || monto <= 0 || !concepto) return NextResponse.json({ error: "Movimiento inválido" }, { status: 400 })
    const movimiento = await prisma.$transaction(async (tx) => {
      const nuevo = await tx.cajaMovimiento.create({ data: { idCaja: id, tipo, monto, concepto, idUsuario: user.id } })
      await tx.auditoriaLog.create({ data: { accion: "MOVIMIENTO_CAJA", entidad: "CajaMovimiento", entidadId: nuevo.id, idUsuario: user.id, modulo: "CAJA", detalles: JSON.stringify({ idCaja: id, tipo, monto, concepto }) } })
      return nuevo
    })
    return NextResponse.json(movimiento)
  }

  if (accion === "CERRAR") {
    if (caja.estado !== "ABIERTA" || caja.idUsuario !== user.id) return NextResponse.json({ error: "Solo el usuario responsable puede cerrar su caja abierta" }, { status: 409 })
    const contado = dinero(body.montoFinalContado)
    if (!Number.isFinite(contado) || contado < 0) return NextResponse.json({ error: "Monto final inválido" }, { status: 400 })
    const ventas = await prisma.venta.aggregate({ where: { idCaja: id, estado: "COMPLETADA", metodoPago: "EFECTIVO" }, _sum: { total: true } })
    const cierre = calcularCierreCaja(Number(caja.montoInicial), Number(ventas._sum.total || 0), caja.movimientos.map((m) => ({ tipo: m.tipo as any, monto: Number(m.monto) })), contado)
    const actualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.cajaSesion.update({ where: { id }, data: { estado: "CERRADA", cerradaEn: new Date(), montoFinalContado: contado, montoEsperado: cierre.montoEsperado, diferencia: cierre.diferencia, observacionCierre: body.observacion || null } })
      await tx.auditoriaLog.create({ data: { accion: "CIERRE_CAJA", entidad: "CajaSesion", entidadId: id, idUsuario: user.id, modulo: "CAJA", detalles: JSON.stringify({ contado, ...cierre }) } })
      return updated
    })
    return NextResponse.json(actualizada)
  }

  if (accion === "RESOLVER") {
    if (user.rolNombre !== "ADMIN") return NextResponse.json({ error: "Solo administración puede resolver diferencias" }, { status: 403 })
    const resolucion = String(body.resolucion || "").trim()
    if (!resolucion) return NextResponse.json({ error: "La resolución es obligatoria" }, { status: 400 })
    const actualizada = await prisma.$transaction(async (tx) => {
      const updated = await tx.cajaSesion.update({ where: { id }, data: { estado: "DIFERENCIA_RESUELTA", resueltaPor: user.id, resueltaEn: new Date(), resolucion } })
      await tx.auditoriaLog.create({ data: { accion: "RESOLVER_DIFERENCIA_CAJA", entidad: "CajaSesion", entidadId: id, idUsuario: user.id, modulo: "CAJA", motivo: resolucion } })
      return updated
    })
    return NextResponse.json(actualizada)
  }
  return NextResponse.json({ error: "Acción no válida" }, { status: 400 })
}
