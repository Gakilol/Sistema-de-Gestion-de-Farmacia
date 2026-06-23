/**
 * app/api/ia/chat/route.ts
 * 
 * Endpoint principal del asistente de IA FarmaPos.
 * Implementa Function Calling con Gemini 2.5 Flash.
 * 
 * ARQUITECTURA:
 *   Usuario → Chat API → Permisos → Tools (Prisma) → Gemini → Respuesta
 * 
 * REGLAS DE SEGURIDAD:
 *   1. Gemini nunca accede a Prisma, SQL ni datos internos directamente.
 *   2. Los permisos se validan en el backend antes de cada ejecución de herramienta.
 *   3. Máximo 3 llamadas de herramientas por mensaje (previene loops y abuso).
 *   4. Sin stack traces, URLs de BD, secretos ni datos personales en respuestas.
 *   5. Groq opera en modo libre sin acceso a datos internos si no hay Gemini.
 */

import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"
import { checkToolPermission, resolveRoleFromId } from "@/lib/ia/permissions"
import { executeTool } from "@/lib/ia/tools"
import type { IAToolName, IAAuditAction } from "@/lib/ia/types"

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const MAX_TOOL_CALLS = 3
const GEMINI_TIMEOUT_MS = 30000
const GEMINI_MODEL = "gemini-2.5-flash"
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models"

// ---------------------------------------------------------------------------
// Definición de herramientas para Gemini (OpenAPI-compatible schema)
// ---------------------------------------------------------------------------

const GEMINI_TOOLS = [
  {
    function_declarations: [
      {
        name: "getDashboardSummary",
        description: "Obtiene el resumen general del sistema: total de productos, unidades en stock, productos con stock bajo, lotes por vencer y vencidos. ADMIN también ve ventas del día e ingresos del mes.",
        parameters: { type: "object", properties: {} },
      },
      {
        name: "getLowStockProducts",
        description: "Lista los productos activos cuyo stock actual es menor o igual al stock mínimo configurado. Útil para identificar qué reabastecer.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Máximo de resultados (1-50). Por defecto 20." },
            offset: { type: "number", description: "Posición de inicio para paginación." },
          },
        },
      },
      {
        name: "getExpiredProducts",
        description: "Lista los lotes con stock disponible cuya fecha de vencimiento ya pasó. Estos productos no deben venderse.",
        parameters: {
          type: "object",
          properties: {
            limit: { type: "number", description: "Máximo de resultados (1-50)." },
            offset: { type: "number", description: "Posición de inicio para paginación." },
          },
        },
      },
      {
        name: "getProductsNearExpiration",
        description: "Lista lotes próximos a vencer dentro de los próximos N días (máx 180). Ordenados por fecha de vencimiento ascendente (FEFO).",
        parameters: {
          type: "object",
          properties: {
            dias: { type: "number", description: "Días hacia adelante para buscar vencimientos (1-180). Por defecto 90." },
            limit: { type: "number", description: "Máximo de resultados (1-50)." },
            offset: { type: "number", description: "Posición de inicio para paginación." },
          },
        },
      },
      {
        name: "searchProducts",
        description: "Busca productos por nombre, descripción, categoría o laboratorio en el catálogo activo. Para búsquedas como 'algo para dolor de cabeza', busca en nombre y categoría. NO emite diagnósticos médicos.",
        parameters: {
          type: "object",
          properties: {
            query: { type: "string", description: "Término de búsqueda (mín. 2 caracteres, máx. 100)." },
            limit: { type: "number", description: "Máximo de resultados (1-30). Por defecto 20." },
            offset: { type: "number", description: "Posición de inicio para paginación." },
          },
          required: ["query"],
        },
      },
      {
        name: "getProductDetails",
        description: "Obtiene detalles completos de un producto específico incluyendo todos sus lotes activos ordenados por FEFO (Primero en Vencer, Primero en Salir).",
        parameters: {
          type: "object",
          properties: {
            productoId: { type: "number", description: "ID numérico del producto." },
          },
          required: ["productoId"],
        },
      },
      {
        name: "getProductLots",
        description: "Lista los lotes de un producto ordenados por fecha de vencimiento ascendente (FEFO). Indica cuál lote debe venderse primero.",
        parameters: {
          type: "object",
          properties: {
            productoId: { type: "number", description: "ID numérico del producto." },
            soloActivos: { type: "boolean", description: "Si es true, solo retorna lotes con stock > 0. Por defecto true." },
          },
          required: ["productoId"],
        },
      },
      {
        name: "getTopSellingProducts",
        description: "Retorna los productos más vendidos en los últimos N días por cantidad de unidades vendidas.",
        parameters: {
          type: "object",
          properties: {
            dias: { type: "number", description: "Período en días a analizar (1-365). Por defecto 30." },
            limit: { type: "number", description: "Máximo de resultados (1-20). Por defecto 10." },
          },
        },
      },
      {
        name: "getSalesSummary",
        description: "Resumen de ventas por día, agrupando total de facturas, montos y métodos de pago. SOLO disponible para administradores.",
        parameters: {
          type: "object",
          properties: {
            fechaInicio: { type: "string", description: "Fecha de inicio en formato YYYY-MM-DD." },
            fechaFin: { type: "string", description: "Fecha de fin en formato YYYY-MM-DD." },
            agruparPor: { type: "string", enum: ["dia", "semana", "mes"], description: "Agrupación de resultados. Por defecto 'dia'." },
          },
        },
      },
      {
        name: "getInventoryMovements",
        description: "Historial de movimientos de inventario (Kardex) de un producto específico: entradas por compra, salidas por venta, ajustes. SOLO disponible para administradores.",
        parameters: {
          type: "object",
          properties: {
            productoId: { type: "number", description: "ID numérico del producto." },
            limit: { type: "number", description: "Máximo de resultados (1-50)." },
            offset: { type: "number", description: "Posición de inicio para paginación." },
          },
          required: ["productoId"],
        },
      },
      {
        name: "getAuditAlerts",
        description: "Detecta anomalías operativas: anulaciones inusuales por usuario, ajustes manuales de stock en horarios no laborales, inconsistencias entre stock del producto y suma de lotes. SOLO para administradores.",
        parameters: {
          type: "object",
          properties: {
            dias: { type: "number", description: "Días hacia atrás a analizar (1-90). Por defecto 7." },
            limit: { type: "number", description: "Máximo de alertas a retornar (1-30)." },
          },
        },
      },
      {
        name: "getSuggestedPurchaseOrder",
        description: "Genera una propuesta de orden de compra basada en stock bajo, tasas de venta históricas y stock mínimo. Retorna un borrador que REQUIERE CONFIRMACIÓN HUMANA. SOLO para administradores.",
        parameters: {
          type: "object",
          properties: {
            diasAnalisis: { type: "number", description: "Días de historial de ventas a analizar (7-365). Por defecto 30." },
          },
        },
      },
      {
        name: "createPurchaseDraft",
        description: "Crea un borrador de orden de compra con ítems y cantidades específicas para revisión del administrador. El borrador NUNCA se guarda automáticamente, requiere confirmación explícita del usuario. SOLO para administradores.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productoId: { type: "number" },
                  cantidadSugerida: { type: "number" },
                  motivo: { type: "string" },
                },
                required: ["productoId", "cantidadSugerida", "motivo"],
              },
              description: "Lista de productos con cantidades sugeridas.",
            },
            notasIA: { type: "string", description: "Notas adicionales de la IA sobre el borrador." },
          },
          required: ["items"],
        },
      },
      {
        name: "createInventoryAdjustmentDraft",
        description: "Crea un borrador de ajuste de inventario para revisar diferencias entre el stock registrado en el sistema y el conteo físico. REQUIERE CONFIRMACIÓN del administrador. SOLO para administradores.",
        parameters: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  productoId: { type: "number" },
                  stockFisicoReportado: { type: "number" },
                  motivo: { type: "string" },
                },
                required: ["productoId", "stockFisicoReportado", "motivo"],
              },
            },
            notasIA: { type: "string" },
          },
          required: ["items"],
        },
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// System Prompt del Asistente
// ---------------------------------------------------------------------------

function buildSystemPrompt(rolNombre: string, nombreUsuario: string): string {
  const esAdmin = rolNombre === "ADMIN"
  return `Eres "FarmaPos IA", el asistente virtual inteligente y experto en gestión de farmacias integrado al sistema FarmaPos en Nicaragua. Tu objetivo es ayudar al personal a tomar decisiones operativas informadas.

USUARIO ACTIVO: ${nombreUsuario} — Rol: ${rolNombre}

ACCESO A DATOS:
${esAdmin
    ? "✅ Tienes acceso completo: inventario, ventas, costos, reportes financieros, auditoría y generación de borradores de compra."
    : "📦 Tienes acceso a: productos, stock, lotes y vencimientos. NO tienes acceso a datos financieros, costos, reportes de ventas globales ni auditoría."}

REGLAS OBLIGATORIAS:
1. Responde SIEMPRE en español profesional. Usa córdobas (C$) como moneda.
2. USA las herramientas disponibles para consultar datos reales. NO inventes datos ni digas que "no puedes acceder al sistema".
3. Si el usuario pregunta por "algo para dolor de cabeza" u otras búsquedas de salud, usa searchProducts para buscar en el inventario disponible. Siempre incluye: "⚕️ Esta es una búsqueda de inventario. FarmaPos IA no sustituye la consulta con un farmacéutico o médico calificado."
4. Cuando muestres resultados de inventario, indica siempre la fuente (ej. "Datos consultados: Inventario actual al [fecha]").
5. Para borradores de compra o ajuste, explica claramente que es una PROPUESTA y que el administrador debe confirmarla en pantalla antes de que se aplique.
6. Si una herramienta retorna acceso denegado, explica amablemente que ese dato requiere permisos de administrador.
7. Estructura tus respuestas en Markdown con negritas, tablas y listas para mejor legibilidad.
8. Límite de contexto: no repitas más de los últimos 10 mensajes del historial.`
}

// ---------------------------------------------------------------------------
// Helper: llamar a Gemini con timeout
// ---------------------------------------------------------------------------

async function callGemini(
  apiKey: string,
  contents: object[],
  includeTools: boolean
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
    },
  }

  if (includeTools) {
    body.tools = GEMINI_TOOLS
  }

  try {
    const response = await fetch(
      `${GEMINI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: controller.signal,
      }
    )
    clearTimeout(timeoutId)
    return response
  } catch (err: any) {
    clearTimeout(timeoutId)
    if (err.name === "AbortError") {
      throw new Error("GEMINI_TIMEOUT")
    }
    throw err
  }
}

// ---------------------------------------------------------------------------
// Mapeo de nombre de herramienta a acción de auditoría
// ---------------------------------------------------------------------------

const TOOL_AUDIT_MAP: Partial<Record<string, IAAuditAction>> = {
  getDashboardSummary:             "IA_TOOL_GET_DASHBOARD_SUMMARY",
  getLowStockProducts:             "IA_TOOL_GET_LOW_STOCK",
  getExpiredProducts:              "IA_TOOL_GET_EXPIRED_PRODUCTS",
  getProductsNearExpiration:       "IA_TOOL_GET_NEAR_EXPIRATION",
  searchProducts:                  "IA_TOOL_SEARCH_PRODUCTS",
  getProductDetails:               "IA_TOOL_GET_PRODUCT_DETAILS",
  getProductLots:                  "IA_TOOL_GET_PRODUCT_LOTS",
  getTopSellingProducts:           "IA_TOOL_GET_TOP_SELLING",
  getSalesSummary:                 "IA_TOOL_GET_SALES_SUMMARY",
  getInventoryMovements:           "IA_TOOL_GET_INVENTORY_MOVEMENTS",
  getAuditAlerts:                  "IA_TOOL_GET_AUDIT_ALERTS",
  getSuggestedPurchaseOrder:       "IA_TOOL_CREATE_PURCHASE_DRAFT",
  createPurchaseDraft:             "IA_TOOL_CREATE_PURCHASE_DRAFT",
  createInventoryAdjustmentDraft:  "IA_TOOL_CREATE_ADJUSTMENT_DRAFT",
}

// ---------------------------------------------------------------------------
// POST /api/ia/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  try {
    // 1. Verificar sesión
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado. Inicia sesión para usar el asistente." }, { status: 401 })
    }

    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Mensajes inválidos." }, { status: 400 })
    }

    // 2. Resolver rol del usuario
    const rol = resolveRoleFromId(user.idRol)
    const geminiApiKey = process.env.GEMINI_API_KEY
    const groqApiKey = process.env.GROQ_API_KEY

    // 3. Registrar consulta en auditoría
    registrarLog({
      accion: "IA_CHAT_CONSULTA",
      entidad: "AsistenteIA",
      idUsuario: user.id,
      detalles: { rol, mensajes: messages.length },
    })

    // 4. Modo fallback: sin API keys configuradas
    if (!geminiApiKey && !groqApiKey) {
      return NextResponse.json({
        text: `### ⚙️ Asistente no configurado\n\nPara habilitar el asistente de IA, configura \`GEMINI_API_KEY\` en el archivo \`.env\`.\n\nCon una API key activa, podrás consultar inventario, ventas, lotes y más en tiempo real.`,
        toolsUsed: [],
      })
    }

    // -----------------------------------------------------------------------
    // 5. Modo Gemini con Function Calling
    // -----------------------------------------------------------------------
    if (geminiApiKey) {
      const systemPrompt = buildSystemPrompt(rol, user.nombreCompleto)

      // Construir el historial de mensajes para Gemini
      // El system prompt se inyecta como primer turno de usuario + respuesta vacía del model
      const contents: object[] = [
        { role: "user", parts: [{ text: systemPrompt }] },
        { role: "model", parts: [{ text: "Entendido. Estoy listo para asistirte con datos reales del sistema FarmaPos." }] },
      ]

      // Agregar historial reciente (máx 10 mensajes para controlar tokens)
      const historial = messages.slice(-10)
      historial.forEach((m: { role: string; content: string }) => {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        })
      })

      let toolCallsCount = 0
      const toolsUsed: string[] = []
      let toolStatusMessage: string | null = null

      // Loop de Function Calling (máx 3 iteraciones)
      while (toolCallsCount < MAX_TOOL_CALLS) {
        let geminiResponse: Response
        try {
          geminiResponse = await callGemini(geminiApiKey, contents, true)
        } catch (err: any) {
          registrarLog({ accion: "IA_GEMINI_ERROR", entidad: "AsistenteIA", idUsuario: user.id, detalles: { error: err.message } })
          if (err.message === "GEMINI_TIMEOUT") {
            return NextResponse.json({
              text: "⏱️ El asistente de IA tardó demasiado en responder. Por favor intenta de nuevo en unos momentos.",
              toolsUsed,
            })
          }
          throw err
        }

        if (!geminiResponse.ok) {
          const errText = await geminiResponse.text()
          console.error("Gemini API Error:", errText)
          registrarLog({ accion: "IA_GEMINI_ERROR", entidad: "AsistenteIA", idUsuario: user.id, detalles: { status: geminiResponse.status } })
          return NextResponse.json({
            text: "❌ El servicio de IA no está disponible en este momento. Por favor intenta nuevamente.",
            toolsUsed,
          })
        }

        const resJson = await geminiResponse.json()
        const candidate = resJson.candidates?.[0]
        const parts = candidate?.content?.parts ?? []

        // Verificar si hay texto final (no más tool calls)
        const textPart = parts.find((p: any) => p.text)
        if (textPart) {
          // Respuesta final del modelo
          let respuestaFinal = textPart.text as string

          // Agregar referencia de fuentes si se usaron herramientas
          if (toolsUsed.length > 0 && toolStatusMessage) {
            respuestaFinal = `${respuestaFinal}\n\n---\n_${toolStatusMessage}_`
          }

          return NextResponse.json({ text: respuestaFinal, toolsUsed })
        }

        // Verificar si hay function calls
        const functionCallParts = parts.filter((p: any) => p.functionCall)
        if (functionCallParts.length === 0) break // Sin text ni function calls, salir del loop

        // Agregar la respuesta del modelo al historial
        contents.push({ role: "model", parts })

        // Ejecutar las herramientas solicitadas
        const functionResponses: object[] = []

        for (const part of functionCallParts) {
          const { name: toolName, args: toolArgs, id: callId } = part.functionCall
          toolCallsCount++

          // Validar permisos en backend ANTES de ejecutar
          if (!checkToolPermission(toolName as IAToolName, rol)) {
            registrarLog({
              accion: "IA_ACCESS_DENIED",
              entidad: "AsistenteIA",
              idUsuario: user.id,
              detalles: { herramienta: toolName, rol },
            })
            functionResponses.push({
              functionResponse: {
                name: toolName,
                ...(callId ? { id: callId } : {}),
                response: { error: `Acceso denegado: El rol "${rol}" no tiene permiso para usar "${toolName}".` },
              },
            })
            continue
          }

          // Ejecutar la herramienta
          const toolResult = await executeTool(toolName, toolArgs, rol)
          toolsUsed.push(toolName)

          // Registrar en auditoría
          const auditAction = TOOL_AUDIT_MAP[toolName] ?? "IA_CHAT_CONSULTA"
          registrarLog({
            accion: auditAction,
            entidad: "AsistenteIA",
            idUsuario: user.id,
            detalles: {
              herramienta: toolName,
              rol,
              resultado: toolResult.ok ? "OK" : "ERROR",
              ...(toolResult.ok && toolResult.meta ? { fuente: toolResult.meta.fuenteDatos } : {}),
            },
          })

          // Actualizar mensaje de fuentes
          if (toolResult.ok && toolResult.meta?.fuenteDatos) {
            toolStatusMessage = `📊 Datos consultados: ${toolResult.meta.fuenteDatos}`
          }

          functionResponses.push({
            functionResponse: {
              name: toolName,
              ...(callId ? { id: callId } : {}),
              response: toolResult.ok
                ? { result: toolResult.data, meta: toolResult.meta }
                : { error: toolResult.error },
            },
          })

          // Si ya alcanzamos el límite de tool calls, detener
          if (toolCallsCount >= MAX_TOOL_CALLS) break
        }

        // Agregar las respuestas de herramientas al historial
        contents.push({ role: "function", parts: functionResponses })
      }

      // Si se agotaron los tool calls sin respuesta final, pedir una última respuesta de texto
      if (toolCallsCount >= MAX_TOOL_CALLS) {
        contents.push({
          role: "user",
          parts: [{ text: "Por favor resume los resultados obtenidos en una respuesta clara y concisa." }],
        })
        try {
          const finalResponse = await callGemini(geminiApiKey, contents, false)
          if (finalResponse.ok) {
            const finalJson = await finalResponse.json()
            const finalText = finalJson.candidates?.[0]?.content?.parts?.[0]?.text ?? "No pude generar una respuesta. Por favor intenta de nuevo."
            return NextResponse.json({
              text: finalText + (toolStatusMessage ? `\n\n---\n_${toolStatusMessage}_` : ""),
              toolsUsed,
            })
          }
        } catch {
          // Fallback si la llamada final también falla
        }
      }

      return NextResponse.json({
        text: "No pude procesar tu solicitud. Por favor reformula tu pregunta e intenta de nuevo.",
        toolsUsed,
      })
    }

    // -----------------------------------------------------------------------
    // 6. Modo Groq — Conversación libre sin acceso a datos internos
    // -----------------------------------------------------------------------
    if (groqApiKey) {
      const groqMessages = [
        {
          role: "system",
          content: `Eres "FarmaPos IA", un asistente virtual de farmacia en modo limitado. 
          
Actualmente operas sin acceso a los datos internos del sistema (no hay clave Gemini configurada para Function Calling).
Puedes responder preguntas generales sobre gestión de farmacias, medicamentos genéricos y procedimientos, pero NO tienes acceso al inventario, ventas, stock ni lotes reales de esta farmacia.

Siempre indica al usuario: "Nota: estoy en modo de conversación general. Para consultas en tiempo real del inventario, contacta al administrador para configurar GEMINI_API_KEY."

Usuario: ${user.nombreCompleto} — Rol: ${rol === "ADMIN" ? "Administrador" : "Empleado"}
Responde en español profesional.`,
        },
        ...messages.slice(-10).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content,
        })),
      ]

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)

      try {
        const responseGroq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqApiKey}`,
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: groqMessages,
            temperature: 0.2,
            max_tokens: 1024,
          }),
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        if (!responseGroq.ok) throw new Error(`Groq error: ${responseGroq.status}`)
        const resJson = await responseGroq.json()
        const answer = resJson.choices?.[0]?.message?.content ?? "No pude obtener una respuesta."
        return NextResponse.json({ text: answer, toolsUsed: [], mode: "groq_limited" })
      } catch (err: any) {
        clearTimeout(timeoutId)
        return NextResponse.json({
          text: "⚠️ El servicio de IA no está disponible temporalmente. Por favor intenta de nuevo.",
          toolsUsed: [],
        })
      }
    }

    return NextResponse.json({ error: "No hay API Key de IA configurada." }, { status: 500 })
  } catch (error: any) {
    console.error("Error en el endpoint IA Chat:", error.message)
    return NextResponse.json(
      { error: "Error interno del asistente. Por favor intenta nuevamente." },
      { status: 500 }
    )
  }
}
