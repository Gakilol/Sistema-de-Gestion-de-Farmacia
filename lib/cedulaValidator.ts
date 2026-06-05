/**
 * Validador algorítmico de Cédula de Identidad Nicaragüense
 *
 * Formato oficial: XXX-DDMMYY-CCCCL
 * - XXX   : Código del municipio (3 dígitos)
 * - DDMMYY: Fecha de nacimiento (6 dígitos)
 * - CCCC  : Correlativo de la persona (4 dígitos)
 * - L     : Letra verificadora (1 letra A-Z)
 *
 * El dígito verificador (letra) se calcula usando pesos asignados
 * a cada posición de los 13 dígitos numéricos. La suma ponderada
 * mod 23 determina la letra del alfabeto (A=0, B=1, ..., W=22).
 */

// Tabla de pesos para los 13 dígitos numéricos de la cédula
const PESOS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]

// Mapa de residuo → letra verificadora (módulo 23, letras de A a W)
const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVW'

/**
 * Limpia una cédula de guiones, espacios y lleva todo a mayúsculas.
 * Retorna los 14 caracteres raw o null si la longitud no es válida.
 */
export function sanitizeCedula(raw: string): string | null {
  const cleaned = raw.replace(/[\s\-]/g, '').toUpperCase().trim()
  if (cleaned.length !== 14) return null
  return cleaned
}

/**
 * Aplica el formato oficial 001-010203-1004A a partir del string limpio de 14 chars.
 */
export function formatCedula(clean: string): string {
  return `${clean.substring(0, 3)}-${clean.substring(3, 9)}-${clean.substring(9, 13)}${clean.charAt(13)}`
}

/**
 * Calcula la letra verificadora esperada para los 13 dígitos numéricos.
 * Retorna null si los primeros 13 caracteres no son todos dígitos.
 */
export function calcularLetraVerificadora(digitos13: string): string | null {
  if (!/^\d{13}$/.test(digitos13)) return null

  let suma = 0
  for (let i = 0; i < 13; i++) {
    suma += parseInt(digitos13[i], 10) * PESOS[i]
  }

  const residuo = suma % 23
  return LETRAS[residuo]
}

/**
 * Valida una cédula nicaragüense usando:
 * 1. Verificación de formato regex (14 chars: 13 dígitos + 1 letra).
 * 2. Verificación algorítmica del dígito verificador.
 *
 * Acepta formatos:
 * - Sin guiones: "0012805991004A"
 * - Con guiones: "001-280599-1004A"
 *
 * @returns { valida: boolean, formateada: string | null, error: string | null }
 */
export function validarCedula(input: string): {
  valida: boolean
  formateada: string | null
  error: string | null
} {
  // 1. Limpiar y verificar longitud
  const clean = sanitizeCedula(input)
  if (!clean) {
    return {
      valida: false,
      formateada: null,
      error: `Longitud incorrecta. La cédula debe tener 14 caracteres (recibido: ${input.replace(/[\s\-]/g, '').length})`,
    }
  }

  // 2. Verificar que los primeros 13 sean dígitos
  const digitos = clean.substring(0, 13)
  const letra = clean.charAt(13)

  if (!/^\d{13}$/.test(digitos)) {
    return {
      valida: false,
      formateada: null,
      error: 'Los primeros 13 caracteres deben ser dígitos numéricos',
    }
  }

  // 3. Verificar que la letra final sea una letra (A-Z)
  if (!/^[A-Z]$/.test(letra)) {
    return {
      valida: false,
      formateada: null,
      error: 'El último carácter debe ser una letra (A-Z)',
    }
  }

  // 4. Validación algorítmica del dígito verificador
  const letraEsperada = calcularLetraVerificadora(digitos)
  if (!letraEsperada) {
    return {
      valida: false,
      formateada: null,
      error: 'Error al calcular el dígito verificador',
    }
  }

  if (letra !== letraEsperada) {
    return {
      valida: false,
      formateada: null,
      error: `Dígito verificador incorrecto. Se esperaba "${letraEsperada}", se recibió "${letra}"`,
    }
  }

  // 5. Todo válido
  return {
    valida: true,
    formateada: formatCedula(clean),
    error: null,
  }
}

/**
 * Detecta si un string podría ser una cédula nicaragüense (para el scanner).
 * Usa solo regex de formato sin validación algorítmica (para detección rápida).
 */
export function esPosibleCedula(input: string): boolean {
  const clean = input.replace(/[\s\-]/g, '').toUpperCase().trim()
  return /^\d{13}[A-Z]$/.test(clean)
}
