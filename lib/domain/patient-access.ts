import { formatCedula, sanitizeCedula } from "../cedulaValidator"

export type CedulaSearch = {
  compacta: string
  formateada: string
  candidatas: string[]
}

export function prepararCedulaBusqueda(input: string): CedulaSearch | null {
  const limpia = input.replace(/[\s-]/g, "").toUpperCase().trim()
  const esFormatoOficial = /^\d{13}[A-Z]$/.test(limpia)
  const esFormatoHistorico = /^\d{12}[A-Z]$/.test(limpia)
  if (!esFormatoOficial && !esFormatoHistorico) return null

  const compacta = sanitizeCedula(input) ?? limpia
  const formateada = esFormatoOficial
    ? formatCedula(compacta)
    : `${compacta.slice(0, 3)}-${compacta.slice(3, 8)}-${compacta.slice(8)}`
  const original = input.trim().toUpperCase()

  return {
    compacta,
    formateada,
    candidatas: [...new Set([formateada, compacta, original])],
  }
}

export function formatearCedulaMientrasEscribe(input: string): string {
  const compacta = input.toUpperCase().replace(/[^0-9A-Z]/g, "").slice(0, 14)
  if (/^\d{12}[A-Z]$/.test(compacta)) {
    return `${compacta.slice(0, 3)}-${compacta.slice(3, 8)}-${compacta.slice(8)}`
  }
  const municipio = compacta.slice(0, 3)
  const nacimiento = compacta.slice(3, 9)
  const correlativo = compacta.slice(9)

  return [municipio, nacimiento, correlativo].filter(Boolean).join("-")
}

export function ocultarCedula(input: string): string {
  const preparada = prepararCedulaBusqueda(input)
  if (!preparada) return "Cédula protegida"
  return `***-******-${preparada.compacta.slice(-5)}`
}
