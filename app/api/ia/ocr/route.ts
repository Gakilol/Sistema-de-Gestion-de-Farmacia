/**
 * app/api/ia/ocr/route.ts
 * 
 * Endpoint OCR Multimodal para extracción de datos de facturas de proveedores.
 * Usa Gemini 2.5 Flash con Structured Outputs (responseSchema) para extraer datos
 * en JSON validado. Solo ADMIN. La inserción final requiere confirmación humana.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { resolveRoleFromId, canViewFinancialData } from "@/lib/ia/permissions"
import { InvoiceOcrSchema } from "@/lib/ia/schemas"
import type { FacturaOCRResult } from "@/lib/ia/types"

const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"
const GEMINI_TIMEOUT_MS = 45000 // OCR puede tardar más

// Tamaño máximo de archivo: 10MB
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 })
    }

    const rol = resolveRoleFromId(user.idRol)
    if (!canViewFinancialData(rol)) {
      registrarLog({
        accion: "IA_ACCESS_DENIED",
        entidad: "OCR_Factura",
        idUsuario: user.id,
        detalles: { rol, motivo: "Rol sin permiso para OCR de facturas" },
      })
      return NextResponse.json(
        { error: "Solo los administradores pueden procesar facturas de proveedores." },
        { status: 403 }
      )
    }

    const geminiApiKey = process.env.GEMINI_API_KEY
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY no está configurada. El OCR requiere Gemini 2.5 Flash." },
        { status: 503 }
      )
    }

    // Procesar el archivo del formulario
    const formData = await request.formData()
    const file = formData.get("factura") as File | null

    if (!file) {
      return NextResponse.json({ error: "No se recibió ningún archivo. Envía el campo 'factura'." }, { status: 400 })
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de archivo no soportado. Solo se aceptan JPG, PNG, WEBP o PDF." },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "El archivo supera el tamaño máximo permitido de 10MB." },
        { status: 400 }
      )
    }

    // Convertir el archivo a base64
    const arrayBuffer = await file.arrayBuffer()
    const base64Data = Buffer.from(arrayBuffer).toString("base64")
    const mimeType = file.type

    // Prompt del sistema para OCR estructurado
    const ocrPrompt = `Eres un especialista en procesamiento de facturas para farmacias en Nicaragua.
    
Tu tarea es analizar esta imagen/PDF de una factura de proveedor y extraer TODOS los datos estructurados en JSON exacto.

REGLAS:
1. Extrae todos los ítems de la factura, incluyendo productos, cantidades, precios unitarios, lotes y fechas de vencimiento.
2. Las fechas DEBEN estar en formato YYYY-MM-DD. Si no puedes leer la fecha con certeza, usa null.
3. Si un campo no está visible o no aplica, usa null.
4. Las cantidades y precios DEBEN ser números, no texto.
5. No inventes datos que no estén en la factura.
6. Los nombres de productos deben ser exactamente como aparecen en la factura.
7. Si detectas inconsistencias (ej. total no cuadra con la suma de ítems), inclúyelo en el campo "advertencias".

Responde ÚNICAMENTE con el JSON estructurado, sin texto adicional.`

    // Llamar a Gemini con Structured Output
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

    const geminiBody = {
      contents: [
        {
          parts: [
            { text: ocrPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1, // Muy bajo para máxima precisión en extracción
        maxOutputTokens: 4096,
        response_mime_type: "application/json",
        response_schema: {
          type: "object",
          properties: {
            supplierName: { type: "string" },
            invoiceNumber: { type: "string", nullable: true },
            invoiceDate: { type: "string", nullable: true },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productName: { type: "string" },
                  quantity: { type: "number" },
                  unitCost: { type: "number" },
                  batch: { type: "string", nullable: true },
                  expirationDate: { type: "string", nullable: true },
                },
                required: ["productName", "quantity", "unitCost"],
              },
            },
            total: { type: "number" },
            advertencias: {
              type: "array",
              items: { type: "string" },
              nullable: true,
            },
          },
          required: ["supplierName", "items", "total"],
        },
      },
    }

    let geminiResponse: Response
    try {
      geminiResponse = await fetch(
        `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(geminiBody),
          signal: controller.signal,
        }
      )
      clearTimeout(timeoutId)
    } catch (err: any) {
      clearTimeout(timeoutId)
      if (err.name === "AbortError") {
        return NextResponse.json({ error: "El procesamiento del archivo tardó demasiado. Intenta con una imagen más clara." }, { status: 504 })
      }
      throw err
    }

    if (!geminiResponse.ok) {
      const errText = await geminiResponse.text()
      console.error("Gemini OCR Error:", errText)
      registrarLog({ accion: "IA_GEMINI_ERROR", entidad: "OCR_Factura", idUsuario: user.id, detalles: { status: geminiResponse.status } })
      return NextResponse.json({ error: "Error al procesar el archivo con el servicio de IA." }, { status: 502 })
    }

    const resJson = await geminiResponse.json()
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text

    if (!rawText) {
      return NextResponse.json({ error: "No se pudo extraer información de la factura. Intenta con una imagen más clara." }, { status: 422 })
    }

    // Parsear y validar el JSON con Zod
    let parsedData: unknown
    try {
      parsedData = JSON.parse(rawText)
    } catch {
      return NextResponse.json({ error: "La IA no retornó un formato válido. Intenta nuevamente." }, { status: 422 })
    }

    const validation = InvoiceOcrSchema.safeParse(parsedData)
    if (!validation.success) {
      const errores = validation.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
      return NextResponse.json(
        {
          error: "Los datos extraídos contienen campos inválidos. Revisa la imagen.",
          detalles: errores,
          datosRaw: parsedData, // Devolver igualmente para revisión manual
        },
        { status: 422 }
      )
    }

    const resultado: FacturaOCRResult = {
      ...validation.data,
      advertencias: (parsedData as any).advertencias ?? [],
    }

    registrarLog({
      accion: "IA_OCR_FACTURA",
      entidad: "Factura",
      idUsuario: user.id,
      detalles: {
        proveedor: resultado.supplierName,
        numeroFactura: resultado.invoiceNumber,
        cantidadItems: resultado.items.length,
        tipoArchivo: mimeType,
      },
    })

    return NextResponse.json({
      resultado,
      advertencia: "⚠️ Estos datos fueron extraídos automáticamente por la IA. Verifica cada campo antes de confirmar la creación de la compra.",
      requiereConfirmacionHumana: true,
    })
  } catch (error: any) {
    console.error("Error en OCR IA:", error.message)
    return NextResponse.json({ error: "Error interno al procesar la factura." }, { status: 500 })
  }
}
