/**
 * Utilidad de envío de correo electrónico con nodemailer.
 * Soporta múltiples proveedores SMTP: Gmail, Outlook, SendGrid, Resend, Amazon SES.
 * Si no hay configuración SMTP en .env, imprime el código en consola.
 */
import nodemailer from 'nodemailer'

// ── Configuración SMTP ──
const SMTP_PROVIDER = process.env.SMTP_PROVIDER || 'custom' // gmail, outlook, sendgrid, resend, ses, custom
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const SMTP_FROM = process.env.SMTP_FROM || 'FarmaPos <no-reply@farmapos.local>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.trim() || 'http://localhost:3000'

// Pre-configuraciones para proveedores populares
const SMTP_CONFIGS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: { host: 'smtp.gmail.com', port: 587, secure: false },
  outlook: { host: 'smtp.office365.com', port: 587, secure: false },
  sendgrid: { host: 'smtp.sendgrid.net', port: 587, secure: false },
  resend: { host: 'smtp.resend.com', port: 465, secure: true },
  ses: { host: process.env.AWS_SES_REGION ? `email-smtp.${process.env.AWS_SES_REGION}.amazonaws.com` : 'email-smtp.us-east-1.amazonaws.com', port: 587, secure: false },
}

const smtpConfigured = !!(SMTP_HOST || SMTP_CONFIGS[SMTP_PROVIDER]) && !!SMTP_USER && !!SMTP_PASS

function getTransporter() {
  const config = SMTP_CONFIGS[SMTP_PROVIDER]
  const host = SMTP_HOST || config?.host
  const port = SMTP_HOST ? SMTP_PORT : (config?.port || SMTP_PORT)
  const secure = SMTP_HOST ? SMTP_PORT === 465 : (config?.secure || false)

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
}

/**
 * Genera la plantilla HTML profesional para el correo de recuperación de contraseña.
 */
function generarPlantillaRecuperacion(
  codigo: string,
  nombreUsuario: string,
  fechaSolicitud: Date,
  minutosExpiracion: number
): string {
  const fechaFormateada = fechaSolicitud.toLocaleString('es-NI', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua',
  })
  const horaExpiracion = new Date(fechaSolicitud.getTime() + minutosExpiracion * 60 * 1000)
    .toLocaleString('es-NI', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Managua' })

  // Separar los dígitos para mostrarlos en cajas individuales
  const digitosHTML = codigo.split('').map(d =>
    `<td style="width:48px;height:56px;background:linear-gradient(135deg,#10b981,#059669);border-radius:12px;text-align:center;vertical-align:middle;margin:0 4px;">
       <span style="color:#fff;font-size:28px;font-weight:800;font-family:'Segoe UI',Arial,sans-serif;letter-spacing:2px;">${d}</span>
     </td>`
  ).join('<td style="width:8px;"></td>')

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="font-family:'Segoe UI',Inter,Arial,sans-serif;background:#0a0f1a;color:#e2e8f0;margin:0;padding:0;">
  <div style="max-width:560px;margin:40px auto;background:rgba(15,23,42,0.97);border:1px solid rgba(51,65,85,0.5);border-radius:20px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);">
    
    <!-- Header con Logo -->
    <div style="background:linear-gradient(135deg,#10b981 0%,#06b6d4 50%,#0ea5e9 100%);padding:32px;text-align:center;">
      <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:16px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
        <span style="font-size:28px;">💊</span>
      </div>
      <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">FarmaPos</h1>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px;font-weight:500;">Sistema de Gestión de Farmacia</p>
    </div>
    
    <!-- Cuerpo -->
    <div style="padding:36px 32px;">
      <h2 style="margin:0 0 8px;color:#f1f5f9;font-size:20px;font-weight:700;">🔐 Recuperación de Contraseña</h2>
      <p style="margin:0 0 24px;color:#94a3b8;font-size:14px;line-height:1.6;">
        Hola <strong style="color:#e2e8f0;">${nombreUsuario}</strong>,<br/>
        Recibimos una solicitud para restablecer tu contraseña. Usa el siguiente código de verificación:
      </p>
      
      <!-- Código de 6 dígitos -->
      <div style="text-align:center;margin:28px 0;">
        <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
          <tr>${digitosHTML}</tr>
        </table>
      </div>
      
      <!-- Info de expiración -->
      <div style="background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);border-radius:12px;padding:16px;margin:24px 0;">
        <p style="margin:0;font-size:13px;color:#94a3b8;">
          ⏱️ <strong style="color:#10b981;">Este código expira en ${minutosExpiracion} minutos</strong> (a las ${horaExpiracion})<br/>
          📅 Solicitud realizada: ${fechaFormateada}
        </p>
      </div>
      
      <!-- Advertencia de seguridad -->
      <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:12px;padding:16px;margin:24px 0 0;">
        <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
          🛡️ <strong style="color:#f87171;">Seguridad:</strong><br/>
          • Este código solo puede usarse <strong>una vez</strong>.<br/>
          • Si no solicitaste este cambio, ignora este correo.<br/>
          • Nunca compartas este código con nadie.<br/>
          • El equipo de FarmaPos nunca te pedirá tu código o contraseña.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div style="background:rgba(30,41,59,0.4);padding:20px 32px;text-align:center;border-top:1px solid rgba(51,65,85,0.3);">
      <p style="margin:0;font-size:11px;color:#475569;">
        FarmaPos · Podología Clínica · Sistema de Gestión<br/>
        Este es un correo automático, no respondas a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>`
}

/**
 * Envía un correo con el código de recuperación de contraseña de 6 dígitos.
 */
export async function enviarCorreoRecuperacion(
  destinatario: string,
  codigo: string,
  nombreUsuario: string
): Promise<{ ok: boolean; error?: string }> {
  const ahora = new Date()
  const EXPIRACION_MINUTOS = 10

  if (!smtpConfigured) {
    console.log('\n══════════════════════════════════════════════════')
    console.log('📧 [MODO DESARROLLO - SIN SMTP]')
    console.log(`   Destinatario : ${destinatario}`)
    console.log(`   Código       : ${codigo}`)
    console.log(`   Expira en    : ${EXPIRACION_MINUTOS} minutos`)
    console.log(`   Hora         : ${ahora.toISOString()}`)
    console.log('══════════════════════════════════════════════════\n')
    return { ok: true }
  }

  try {
    const transporter = getTransporter()
    const html = generarPlantillaRecuperacion(codigo, nombreUsuario, ahora, EXPIRACION_MINUTOS)

    await transporter.sendMail({
      from: SMTP_FROM,
      to: destinatario,
      subject: '🔐 Código de recuperación - FarmaPos',
      html,
    })

    return { ok: true }
  } catch (err: any) {
    console.error('Error enviando correo de recuperación:', err)
    return { ok: false, error: err.message }
  }
}
