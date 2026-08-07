// GET /api/productos/by-barcode?code=XXXXXXX
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const code = request.nextUrl.searchParams.get('code')
    if (!code) {
      return NextResponse.json({ error: 'Parámetro code requerido' }, { status: 400 })
    }

    const producto = await prisma.producto.findFirst({
      where: {
        codigoBarras: code.trim(),
        activo: true,
      },
      select: {
        id: true,
        nombre: true,
        codigoBarras: true,
        precioVenta: true,
        precioBlister: true,
        precioCaja: true,
        stockActual: true,
        unidadesPorBlister: true,
        unidadesPorCaja: true,
        stockMinimo: true,
        // Check active lots for expiry info
        lotes: {
          where: { activo: true, stockActual: { gt: 0 } },
          select: {
            id: true,
            codigoLote: true,
            fechaVencimiento: true,
            stockActual: true,
          },
          orderBy: { fechaVencimiento: 'asc' },
        },
      },
    })

    if (!producto) {
      return NextResponse.json({
        encontrado: false,
        message: `No se encontró ningún producto activo con el código "${code}"`,
      })
    }

    // Verificar si el lote más antiguo está vencido (FIFO)
    const ahora = new Date()
    const lotesVigentes = producto.lotes.filter((lote) => !lote.fechaVencimiento || lote.fechaVencimiento > ahora)
    const loteVencido = producto.lotes.find((lote) => lote.fechaVencimiento && lote.fechaVencimiento <= ahora)
    const stockVigente = lotesVigentes.reduce((sum, lote) => sum + lote.stockActual, 0)

    return NextResponse.json({
      encontrado: true,
      producto: {
        id: producto.id,
        nombre: producto.nombre,
        codigoBarras: producto.codigoBarras,
        precioVenta: producto.precioVenta,
        precioBlister: producto.precioBlister,
        precioCaja: producto.precioCaja,
        stockActual: stockVigente,
        unidadesPorBlister: producto.unidadesPorBlister,
        unidadesPorCaja: producto.unidadesPorCaja,
        stockMinimo: producto.stockMinimo,
        lotes: lotesVigentes,
      },
      alertaVencimiento: stockVigente === 0 && loteVencido
        ? {
            loteId: loteVencido.id,
            codigoLote: loteVencido.codigoLote,
            fechaVencimiento: loteVencido.fechaVencimiento,
            mensaje: 'Venta Bloqueada: El lote del medicamento está vencido',
          }
        : null,
    })
  } catch (error) {
    console.error('Error en /api/productos/by-barcode:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
