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

    // 1. Limpieza inicial para búsqueda en base de datos
    const cleanCed = cedula.replace(/[\s\-]/g, '').toUpperCase().trim();
    let formattedCed = cleanCed;
    if (cleanCed.length === 14) {
      formattedCed = `${cleanCed.substring(0, 3)}-${cleanCed.substring(3, 9)}-${cleanCed.substring(9, 13)}${cleanCed.charAt(13)}`;
    }

    // 2. Buscar primero en la base de datos (por si ya existe, sin importar validación estricta)
    const cliente = await prisma.cliente.findFirst({
      where: {
        OR: [
          { cedula: cleanCed },
          { cedula: formattedCed },
          { cedula: cedula },
        ],
      },
    })

    if (cliente) {
      return NextResponse.json({
        encontrado: true,
        cedulaFormateada: cliente.cedula || formattedCed,
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
    }

    // 3. Si no existe en BD, validar algorítmicamente para registro nuevo
    const resultado = validarCedula(cedula)
    if (!resultado.valida) {
      return NextResponse.json({
        encontrado: false,
        error: resultado.error,
        validacion: 'fallida',
      }, { status: 422 })
    }

    return NextResponse.json({
      encontrado: false,
      cedulaFormateada: resultado.formateada,
      message: 'Cliente no registrado. Puedes crear uno nuevo.',
    })
  } catch (error) {
    console.error('Error en /api/clientes/by-cedula:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
