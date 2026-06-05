// GET /api/clientes/by-cedula?cedula=XXX-DDMMYY-CCCCL
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { validarCedula } from '@/lib/cedulaValidator'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const cedula = request.nextUrl.searchParams.get('cedula')
    if (!cedula) {
      return NextResponse.json({ error: 'Parámetro cedula requerido' }, { status: 400 })
    }

    // 1. Validación algorítmica de la cédula
    const resultado = validarCedula(cedula)
    if (!resultado.valida) {
      return NextResponse.json({
        encontrado: false,
        error: resultado.error,
        validacion: 'fallida',
      }, { status: 422 })
    }

    const cedulaFormateada = resultado.formateada!
    const cedulaLimpia = cedulaFormateada.replace(/[\s\-]/g, '').toUpperCase()

    // 2. Buscar en BD (por formato con guiones y sin guiones)
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { cedula: cedulaFormateada },
          { cedula: cedulaLimpia },
        ],
      },
    })

    if (!cliente) {
      return NextResponse.json({
        encontrado: false,
        cedulaFormateada,
        message: 'Cliente no registrado. Puedes crear uno nuevo.',
      })
    }

    return NextResponse.json({
      encontrado: true,
      cedulaFormateada,
      cliente: {
        id: cliente.id,
        nombreCompleto: cliente.nombreCompleto,
        cedula: cliente.cedula,
        telefono: cliente.telefono,
        correo: cliente.correo,
        direccion: cliente.direccion,
        activo: cliente.activo,
      },
    })
  } catch (error) {
    console.error('Error en /api/clientes/by-cedula:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
