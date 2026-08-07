export type TipoRecordatorio = "CITA_PROXIMA" | "CITA_PENDIENTE" | "RECETA_SIN_USAR" | "VENCIMIENTO" | "STOCK_BAJO"
export type CanalRecordatorio = "INTERNO" | "EMAIL" | "SMS" | "WHATSAPP"

export interface RecordatorioInterno {
  id: string
  tipo: TipoRecordatorio
  prioridad: "ALTA" | "MEDIA" | "BAJA"
  titulo: string
  detalle: string
  fechaObjetivo?: string | null
  href: string
  canalesDisponibles: CanalRecordatorio[]
  canalActivo: "INTERNO"
}
