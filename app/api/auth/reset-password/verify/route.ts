// POST /api/auth/reset-password/verify
// Verifica que un token sea válido antes de mostrar el formulario de nueva contraseña
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ valido: false, error: 'Token requerido' }, { status: 400 })
    }

    const tokenHash = crypto.createHash('sha256').update(token.trim()).digest('hex')
    const ahora = new Date()

    const registro = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!registro) {
      return NextResponse.json({ valido: false, error: 'Token inválido o no existe' }, { status: 400 })
    }

    if (registro.usado) {
      return NextResponse.json({ valido: false, error: 'Este enlace ya fue utilizado. Solicita uno nuevo.' }, { status: 400 })
    }

    if (registro.expiracion < ahora) {
      return NextResponse.json({
        valido: false,
        error: 'El enlace ha expirado. Solicita un nuevo enlace de recuperación.',
      }, { status: 400 })
    }

    // Token válido - retornar el correo parcialmente ocultado
    const correo = registro.correo
    const [localPart, domain] = correo.split('@')
    const correoOculto = `${localPart.substring(0, 2)}***@${domain}`

    return NextResponse.json({
      valido: true,
      correoOculto,
    })
  } catch (error) {
    console.error('Error en reset-password/verify:', error)
    return NextResponse.json({ valido: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
