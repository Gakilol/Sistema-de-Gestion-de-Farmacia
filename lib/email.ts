/**
 * Utilidad de envío de correo electrónico con nodemailer.
 * Si no hay configuración SMTP en .env, imprime el enlace en consola
 * para facilitar las pruebas en entorno de desarrollo.
 */
import nodemailer from 'nodemailer'

const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'Farmacia Sistema <no-reply@farmacia.local>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'

const smtpConfigured = !!(SMTP_HOST && SMTP_USER && SMTP_PASS)

/**
 * Envía un correo de recuperación de contraseña.
 * Si SMTP no está configurado, imprime el link en consola y retorna true
 * para no bloquear el flujo de desarrollo.
 */
export async function enviarCorreoRecuperacion(
  destinatario: string,
  token: string,
  nombreUsuario: string
): Promise<{ ok: boolean; error?: string }> {
  const resetUrl = `${APP_URL}/login?reset=${encodeURIComponent(token)}`

  if (!smtpConfigured) {
    console.log('\n==================================================')
    console.log('📧 [MODO DESARROLLO - SIN SMTP]')
    console.log(`   Destinatario : ${destinatario}`)
    console.log(`   Enlace       : ${resetUrl}`)
    console.log('==================================================\n')
    return { ok: true }
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    })

    await transporter.sendMail({
      from: SMTP_FROM,
      to: destinatario,
      subject: 'Recuperación de contraseña - Farmacia',
      html: `
        <!DOCTYPE html>
        <html lang="es">
        <head><meta charset="UTF-8"/></head>
        <body style="font-family: Inter, Arial, sans-serif; background:#0a0f1a; color:#e2e8f0; margin:0; padding:0;">
          <div style="max-width:520px; margin:40px auto; background:rgba(15,23,42,0.95); border:1px solid rgba(51,65,85,0.5); border-radius:16px; overflow:hidden;">
            <div style="background:linear-gradient(135deg,#10b981,#06b6d4); padding:28px 32px; text-align:center;">
              <h1 style="margin:0; color:#fff; font-size:22px; font-weight:700;">🔐 Recuperación de Contraseña</h1>
            </div>
            <div style="padding:32px;">
              <p style="margin:0 0 16px;">Hola <strong>${nombreUsuario}</strong>,</p>
              <p style="margin:0 0 24px; color:#94a3b8;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en el sistema de gestión de Farmacia.
                Haz clic en el botón a continuación para crear una nueva contraseña. Este enlace <strong>expirará en 30 minutos</strong>.
              </p>
              <div style="text-align:center; margin:32px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block; background:linear-gradient(135deg,#10b981,#059669); color:#fff; text-decoration:none;
                          padding:14px 36px; border-radius:10px; font-weight:600; font-size:15px; letter-spacing:0.3px;">
                  Restablecer Contraseña
                </a>
              </div>
              <p style="margin:24px 0 0; font-size:12px; color:#64748b;">
                Si no solicitaste este cambio, ignora este correo. Tu contraseña seguirá siendo la misma.<br/><br/>
                Por seguridad, este enlace solo puede usarse <strong>una vez</strong> y expira en 30 minutos.
              </p>
            </div>
            <div style="background:rgba(30,41,59,0.4); padding:16px 32px; text-align:center;">
              <p style="margin:0; font-size:11px; color:#475569;">Farmacia Podología Clínica · Sistema de Gestión</p>
            </div>
          </div>
        </body>
        </html>
      `,
    })

    return { ok: true }
  } catch (err: any) {
    console.error('Error enviando correo de recuperación:', err)
    return { ok: false, error: err.message }
  }
}
