import { enviarCorreoTransaccional, obtenerEstadoCorreo } from "@/lib/email"

export type CanalCliente = "WHATSAPP" | "EMAIL" | "SMS"

export function normalizarTelefonoNicaragua(value: string) {
  const digits = value.replace(/\D/g, "")
  if (digits.length === 8) return `505${digits}`
  return digits.startsWith("505") ? digits : digits
}

export function integracionesComunicacion() {
  return {
    WHATSAPP: Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID),
    EMAIL: obtenerEstadoCorreo().disponible,
    SMS: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER),
  }
}

export async function enviarMensajeCliente(input: { canal: CanalCliente; destino: string; asunto: string; mensaje: string }) {
  const available = integracionesComunicacion()
  if (!available[input.canal]) return { ok: false, estado: "SIN_INTEGRACION", resultado: `${input.canal} no está configurado` }

  if (input.canal === "EMAIL") {
    const result = await enviarCorreoTransaccional({ destinatario: input.destino, asunto: input.asunto, mensaje: input.mensaje })
    return result.ok
      ? { ok: true, estado: "ENVIADO", proveedorId: result.proveedorId, resultado: "Aceptado por SMTP" }
      : { ok: false, estado: result.codigo === "SIN_INTEGRACION" ? "SIN_INTEGRACION" : "FALLIDO", resultado: result.error }
  }

  const telefono = normalizarTelefonoNicaragua(input.destino)
  if (input.canal === "WHATSAPP") {
    const response = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to: telefono, type: "text", text: { preview_url: false, body: input.mensaje } }),
    })
    const payload = await response.json().catch(() => ({}))
    return response.ok
      ? { ok: true, estado: "ENVIADO", proveedorId: payload.messages?.[0]?.id, resultado: "Aceptado por WhatsApp Cloud API" }
      : { ok: false, estado: "FALLIDO", resultado: payload.error?.message || `WhatsApp HTTP ${response.status}` }
  }

  const sid = process.env.TWILIO_ACCOUNT_SID!
  const form = new URLSearchParams({ To: `+${telefono}`, From: process.env.TWILIO_FROM_NUMBER!, Body: input.mensaje })
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  })
  const payload = await response.json().catch(() => ({}))
  return response.ok
    ? { ok: true, estado: "ENVIADO", proveedorId: payload.sid, resultado: payload.status || "Aceptado por Twilio" }
    : { ok: false, estado: "FALLIDO", resultado: payload.message || `SMS HTTP ${response.status}` }
}
