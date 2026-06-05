// POST /api/auth/reset-password/request
import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enviarCorreoRecuperacion } from '@/lib/email'
import crypto from 'crypto'

const TOKEN_EXPIRY_MINUTES = 30
const RATE_LIMIT_SECONDS = 60   // Un solo envío por correo cada 60 segundos

export async function POST(request: NextRequest) {
  try {
    const { correo } = await request.json()

    if (!correo || typeof correo !== 'string') {
      return NextResponse.json({ error: 'Correo electrónico requerido' }, { status: 400 })
    }

    const correoLimpio = correo.trim().toLowerCase()

    // 1. Verificar si el usuario existe (respuesta genérica para no revelar info)
    const usuario = await prisma.usuario.findUnique({
      where: { correo: correoLimpio },
      select: { id: true, nombreCompleto: true, correo: true, activo: true },
    })

    // Siempre responder OK para no filtrar si el correo existe o no
    const genericResponse = NextResponse.json({
      success: true,
      message: 'Si ese correo está registrado, recibirás un enlace de recuperación.',
    })

    if (!usuario || !usuario.activo) {
      return genericResponse
    }

    // 2. Rate limiting: solo 1 token por correo cada 60 segundos
    const ahora = new Date()
    const limiteRateLimit = new Date(ahora.getTime() - RATE_LIMIT_SECONDS * 1000)

    const tokenReciente = await prisma.passwordResetToken.findFirst({
      where: {
        correo: correoLimpio,
        createdAt: { gte: limiteRateLimit },
        usado: false,
      },
    })

    if (tokenReciente) {
      // En desarrollo, retornamos el token existente para facilitar pruebas
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          message: 'Rate limit activo. Espera 60 segundos entre solicitudes.',
          _dev_info: `Rate limit activo hasta: ${new Date(tokenReciente.createdAt.getTime() + RATE_LIMIT_SECONDS * 1000).toISOString()}`,
        })
      }
      return genericResponse
    }

    // 3. Invalidar tokens anteriores no usados del mismo correo
    await prisma.passwordResetToken.updateMany({
      where: { correo: correoLimpio, usado: false },
      data: { usado: true },
    })

    // 4. Generar token criptográfico seguro y su hash
    const tokenPlano = crypto.randomBytes(32).toString('hex')   // 64 chars hex
    const tokenHash = crypto.createHash('sha256').update(tokenPlano).digest('hex')
    const expiracion = new Date(ahora.getTime() + TOKEN_EXPIRY_MINUTES * 60 * 1000)

    // 5. Guardar hash en base de datos (NUNCA el token plano)
    await prisma.passwordResetToken.create({
      data: {
        correo: correoLimpio,
        tokenHash,
        expiracion,
        usado: false,
      },
    })

    // 6. Enviar correo (o mostrar en consola en modo dev)
    const resultado = await enviarCorreoRecuperacion(
      correoLimpio,
      tokenPlano,
      usuario.nombreCompleto
    )

    if (!resultado.ok) {
      console.error('Error enviando correo de recuperación:', resultado.error)
    }

    // En desarrollo, retornar el token en la respuesta para testing
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        message: 'Si ese correo está registrado, recibirás un enlace de recuperación.',
        _dev_token: tokenPlano,
        _dev_url: `${process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'}/login?reset=${tokenPlano}`,
      })
    }

    return genericResponse
  } catch (error) {
    console.error('Error en reset-password/request:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}
