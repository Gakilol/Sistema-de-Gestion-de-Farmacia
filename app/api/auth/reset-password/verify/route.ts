// POST /api/auth/reset-password/verify
// Verifica que un código de 6 dígitos sea válido.
// Protección anti brute-force: máximo 5 intentos fallidos.
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

const MAX_FAILED_ATTEMPTS = 5

export async function POST(request: NextRequest) {
  try {
    const { correo, codigo } = await request.json()

    if (!correo || typeof correo !== 'string') {
      return NextResponse.json({ valido: false, error: 'Correo electrónico requerido' }, { status: 400 })
    }

    if (!codigo || typeof codigo !== 'string') {
      return NextResponse.json({ valido: false, error: 'Código de verificación requerido' }, { status: 400 })
    }

    // Validar formato del código (6 dígitos)
    const codigoLimpio = codigo.trim()
    if (!/^\d{6}$/.test(codigoLimpio)) {
      return NextResponse.json({ valido: false, error: 'El código debe ser de 6 dígitos' }, { status: 400 })
    }

    const correoLimpio = correo.trim().toLowerCase()
    const tokenHash = crypto.createHash('sha256').update(codigoLimpio).digest('hex')
    const ahora = new Date()

    // Buscar el token más reciente no usado para este correo
    const registro = await prisma.passwordResetToken.findFirst({
      where: {
        correo: correoLimpio,
        usado: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    if (!registro) {
      return NextResponse.json({
        valido: false,
        error: 'No hay solicitudes de recuperación pendientes para este correo.',
      }, { status: 400 })
    }

    // Verificar si está bloqueado por intentos fallidos
    if (registro.intentosFallidos >= MAX_FAILED_ATTEMPTS) {
      // Marcar como usado (invalidado por brute force)
      await prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: { usado: true },
      })
      return NextResponse.json({
        valido: false,
        error: 'Código bloqueado por demasiados intentos fallidos. Solicita un nuevo código.',
        bloqueado: true,
      }, { status: 400 })
    }

    // Verificar expiración
    if (registro.expiracion < ahora) {
      return NextResponse.json({
        valido: false,
        error: 'El código ha expirado. Solicita un nuevo código de verificación.',
        expirado: true,
      }, { status: 400 })
    }

    // Verificar el hash del código
    if (registro.tokenHash !== tokenHash) {
      const nuevoIntentos = registro.intentosFallidos + 1
      const isBloqueado = nuevoIntentos >= MAX_FAILED_ATTEMPTS

      // Incrementar intentos fallidos y marcar como usado si llegó al límite
      await prisma.passwordResetToken.update({
        where: { id: registro.id },
        data: {
          intentosFallidos: nuevoIntentos,
          usado: isBloqueado ? true : registro.usado
        },
      })

      const intentosRestantes = MAX_FAILED_ATTEMPTS - nuevoIntentos

      return NextResponse.json({
        valido: false,
        error: isBloqueado
          ? 'Se agotaron los intentos. Código bloqueado. Solicita uno nuevo.'
          : `Código incorrecto. Te quedan ${intentosRestantes} intento${intentosRestantes > 1 ? 's' : ''}.`,
        intentosRestantes,
        bloqueado: isBloqueado
      }, { status: 400 })
    }

    // ✅ Código válido - retornar confirmación
    const [localPart, domain] = correoLimpio.split('@')
    const correoOculto = `${localPart.substring(0, 2)}***@${domain}`

    return NextResponse.json({
      valido: true,
      correoOculto,
      message: 'Código verificado correctamente. Puedes establecer tu nueva contraseña.',
    })
  } catch (error) {
    console.error('Error en reset-password/verify:', error)
    return NextResponse.json({ valido: false, error: 'Error interno del servidor' }, { status: 500 })
  }
}
