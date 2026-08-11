import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"

import { registrarLog } from "@/lib/audit"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

const lineaSchema = z.object({
  idProducto: z.number().int().positive(),
  nombre: z.string().min(1).max(250),
  cantidad: z.number().int().positive(),
  precioUnitario: z.number().nonnegative(),
  subtotal: z.number().nonnegative(),
  tipoUnidad: z.enum(["UNIDAD", "BLISTER", "CAJA"]),
  idLotePreferido: z.number().int().positive().nullable().optional(),
  motivoCambioLote: z.string().max(300).nullable().optional(),
  loteCodigo: z.string().max(100).nullable().optional(),
})

const pausaSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  idCliente: z.number().int().positive().nullable().optional(),
  payload: z.object({
    lineas: z.array(lineaSchema).min(1).max(100),
    selectedCliente: z.string().max(20).optional(),
    metodoPago: z.string().max(30).optional(),
    nombrePodologo: z.string().max(150).optional(),
    numeroReceta: z.string().max(100).optional(),
    tipoComprobante: z.string().max(30).optional(),
    rucCliente: z.string().max(30).optional(),
    montoRecibido: z.string().max(30).optional(),
    selectedDescuento: z.string().max(20).optional(),
    alergiasPendientes: z.string().max(2000).nullable().optional(),
    confirmarAlergias: z.boolean().optional(),
    estadoEntrega: z.enum(["ENTREGADA", "LISTO_PARA_RETIRAR"]).optional(),
  }),
})

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO'].includes(user.rolNombre)) return NextResponse.json({ error: "Sin acceso al punto de venta" }, { status: 403 })
  const pausadas = await prisma.ventaPausada.findMany({
    where: { estado: "PAUSADA" },
    include: { cliente: { select: { id: true, nombreCompleto: true } }, usuario: { select: { id: true, nombreCompleto: true } } },
    orderBy: { updatedAt: "desc" }, take: 30,
  })
  return NextResponse.json({ pausadas })
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!['ADMIN', 'EMPLEADO'].includes(user.rolNombre)) return NextResponse.json({ error: "Sin acceso al punto de venta" }, { status: 403 })
  const validation = pausaSchema.safeParse(await request.json().catch(() => null))
  if (!validation.success) return NextResponse.json({ error: validation.error.issues[0]?.message || "Datos inválidos" }, { status: 400 })

  const pausa = await prisma.ventaPausada.create({
    data: { titulo: validation.data.titulo, idCliente: validation.data.idCliente || null, idUsuario: user.id, payload: validation.data.payload },
    include: { cliente: true, usuario: { select: { id: true, nombreCompleto: true } } },
  })
  registrarLog({ accion: "PAUSAR_VENTA", entidad: "VentaPausada", entidadId: pausa.id, idUsuario: user.id, detalles: { titulo: pausa.titulo, items: validation.data.payload.lineas.length } })
  return NextResponse.json(pausa, { status: 201 })
}
