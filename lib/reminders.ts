export type TipoRecordatorio = "CITA_PROXIMA" | "CITA_PENDIENTE" | "RECETA_PENDIENTE" | "RECETA_LISTA" | "PEDIDO_LISTO" | "RECOMPRA" | "VENCIMIENTO" | "STOCK_BAJO"
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
  idCliente?: number
  cliente?: string
  canalSugerido?: CanalRecordatorio
  consentimiento?: boolean
  asunto?: string
  mensaje?: string
}
