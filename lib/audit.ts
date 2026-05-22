import { prisma } from "@/lib/prisma"

interface RegistrarLogParams {
  accion: string
  entidad: string
  entidadId?: number | null
  idUsuario?: number | null
  detalles?: Record<string, any>
}

/**
 * Registra una entrada en la tabla AuditoriaLog.
 * Se ejecuta de forma no bloqueante (fire-and-forget), con manejo silencioso
 * de errores para no interferir con el flujo principal de la aplicación.
 */
export function registrarLog(params: RegistrarLogParams): void {
  const { accion, entidad, entidadId, idUsuario, detalles } = params

  // Fire-and-forget: no hacemos await para no bloquear la respuesta HTTP
  prisma.auditoriaLog
    .create({
      data: {
        accion,
        entidad,
        entidadId: entidadId ?? null,
        idUsuario: idUsuario ?? null,
        detalles: detalles ? JSON.stringify(detalles) : null,
      },
    })
    .catch((err) => {
      // Log silencioso: si falla la auditoría, no interrumpimos la operación
      console.error("[Auditoría] Error al registrar log:", err)
    })
}
