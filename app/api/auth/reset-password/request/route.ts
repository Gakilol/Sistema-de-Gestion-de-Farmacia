// POST /api/auth/reset-password/request
// Genera un código de 6 dígitos y lo envía por email.
// Incluye rate limiting por correo (3/hora) y por IP (5/hora).
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarCorreoRecuperacion } from '@/lib/email'
import crypto from 'crypto'

const TOKEN_EXPIRY_MINUTES = 10
const RATE_LIMIT_PER_EMAIL = 3   // Máx solicitudes por correo por hora
const RATE_LIMIT_PER_IP = 5      // Máx solicitudes por IP por hora
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000 // 1 hora

/**
 * Genera un código numérico seguro de 6 dígitos usando crypto.
 */
function generarCodigo6Digitos(): string {
  // Generar un número aleatorio criptográficamente seguro entre 100000 y 999999
  const bytes = crypto.randomBytes(4)
  const num = bytes.readUInt32BE(0)
  const codigo = 100000 + (num % 900000)
  return String(codigo)
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown'
}

export async function POST(request: NextRequest) {
  try {
    const { correo } = await request.json()

    if (!correo || typeof correo !== 'string') {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 })
    }

    const correoLimpio = correo.trim().toLowerCase()
    const ip = getClientIP(request)

    // Siempre responder OK para no filtrar si el correo existe o no
    const genericResponse = NextResponse.json({
      success: true,
      message: 'Si ese correo está registrado, recibirás un código de verificación.',
    })

    // 1. Rate limiting por correo
    const ahora = new Date()
    const ventanaRateLimit = new Date(ahora.getTime() - RATE_LIMIT_WINDOW_MS)

    const solicitudesPorCorreo = await prisma.passwordResetRequest.count({
      where: {
        correo: correoLimpio,
        createdAt: { gte: ventanaRateLimit },
      },
    })

    if (solicitudesPorCorreo >= RATE_LIMIT_PER_EMAIL) {
      // Registrar intento bloqueado
      await prisma.passwordResetRequest.create({
        data: { correo: correoLimpio, ip, exitoso: false },
      })

      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: false,
          error: `Demasiadas solicitudes. Has hecho ${solicitudesPorCorreo} solicitudes en la última hora. Máximo permitido: ${RATE_LIMIT_PER_EMAIL}.`,
        }, { status: 429 })
      }
      return genericResponse
    }

    // 2. Rate limiting por IP
    const solicitudesPorIP = await prisma.passwordResetRequest.count({
      where: {
        ip,
        createdAt: { gte: ventanaRateLimit },
      },
    })

    if (solicitudesPorIP >= RATE_LIMIT_PER_IP) {
      await prisma.passwordResetRequest.create({
        data: { correo: correoLimpio, ip, exitoso: false },
      })

      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: false,
          error: `Demasiadas solicitudes desde esta IP. Máximo: ${RATE_LIMIT_PER_IP}/hora.`,
        }, { status: 429 })
      }
      return genericResponse
    }

    // 3. Verificar si el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correoLimpio },
      select: { id: true, nombreCompleto: true, correo: true, activo: true },
    })

    if (!usuario || !usuario.activo) {
      // Registrar solicitud fallida (no revelar que el correo no existe)
      await prisma.passwordResetRequest.create({
        data: { correo: correoLimpio, ip, exitoso: false },
      })
      return genericResponse
    }

    // 4. Invalidar tokens anteriores no usados del mismo correo
    await prisma.passwordResetToken.updateMany({
      where: { correo: correoLimpio, usado: false },
      data: { usado: true },
    })

    // 5. Generar código de 6 dígitos y su hash
    const codigoPlano = generarCodigo6Digitos()
    const tokenHash = crypto.createHash('sha256').update(codigoPlano).digest('hex')
    const expiracion = new Date(ahora.getTime() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

    // 6. Guardar hash en base de datos (NUNCA el código plano)
    await prisma.passwordResetToken.create({
      data: {
        correo: correoLimpio,
        tokenHash,
        expiracion,
        usado: false,
        intentosFallidos: 0,
        ipOrigen: ip,
      },
    })

    // 7. Registrar solicitud exitosa
    await prisma.passwordResetRequest.create({
      data: { correo: correoLimpio, ip, exitoso: true },
    })

    // 8. Enviar correo (o mostrar en consola en modo dev)
    const resultado = await enviarCorreoRecuperacion(
      correoLimpio,
      codigoPlano,
      usuario.nombreCompleto
    )

    if (!resultado.ok) {
      console.error('Error enviando correo de recuperación:', resultado.error)
    }

    // En desarrollo, retornar el código en la respuesta para testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Si ese correo está registrado, recibirás un código de verificación.',
        _dev_codigo: codigoPlano,
        _dev_expira: expiracion.toISOString(),
      })
    }

    return genericResponse
  } catch (error) {
    console.error('Error en reset-password/request:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
