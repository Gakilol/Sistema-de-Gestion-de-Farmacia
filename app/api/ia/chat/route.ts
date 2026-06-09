import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Mensajes inválidos" }, { status: 400 })
    }

    // 1. Obtener telemetría de la base de datos
    const ahora = new Date()
    const hace30dias = new Date()
    hace30dias.setDate(ahora.getDate() - 30)

    const tresMesesMas = new Date()
    tresMesesMas.setMonth(ahora.getMonth() + 3)

    // A. Productos con stock bajo
    const stockBajo = await prisma.producto.findMany({
      where: {
        activo: true,
        stockMinimo: { not: null },
        OR: [
          { stockActual: { lte: prisma.producto.fields.stockMinimo } }
        ]
      },
      select: {
        id: true,
        nombre: true,
        stockActual: true,
        stockMinimo: true,
      }
    })

    // B. Lotes próximos a vencer (3 meses o ya vencidos)
    const lotesVencer = await prisma.lote.findMany({
      where: {
        activo: true,
        stockActual: { gt: 0 },
        fechaVencimiento: { lte: tresMesesMas }
      },
      include: {
        producto: true
      },
      orderBy: {
        fechaVencimiento: "asc"
      }
    })

    // C. Historial de ventas de los últimos 30 días
    const ventas30Dias = await prisma.venta.findMany({
      where: {
        fecha: { gte: hace30dias },
        estado: { not: "ANULADA" }
      },
      include: {
        detalles: {
          select: {
            cantidad: true,
            precioUnitario: true,
            idProducto: true,
            producto: { select: { nombre: true } }
          }
        }
      }
    })

    // D. Calcular productos más vendidos
    const ventasPorProducto = new Map<string, { cantidad: number, total: number }>()
    let ingresosTotales = 0
    ventas30Dias.forEach(v => {
      ingresosTotales += Number(v.total)
      v.detalles.forEach(d => {
        const key = d.producto.nombre
        const prev = ventasPorProducto.get(key) || { cantidad: 0, total: 0 }
        ventasPorProducto.set(key, {
          cantidad: prev.cantidad + d.cantidad,
          total: prev.total + (d.cantidad * Number(d.precioUnitario))
        })
      })
    })

    const masVendidos = Array.from(ventasPorProducto.entries())
      .map(([nombre, stats]) => ({ nombre, ...stats }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5)

    // E. Total de productos activos y en stock
    const resumenProductos = await prisma.producto.aggregate({
      where: { activo: true },
      _count: { id: true },
      _sum: { stockActual: true }
    })

    // 2. Formatear la telemetría como contexto para la IA
    const telemetriaContexto = `
INFORMACIÓN DEL SISTEMA DE FARMACIA (TELEMETRÍA EN TIEMPO REAL):
- Fecha actual del sistema: ${ahora.toLocaleDateString("es-NI")}
- Total de productos en catálogo: ${resumenProductos._count.id} productos activos.
- Stock total acumulado: ${resumenProductos._sum.stockActual || 0} unidades.
- Ventas en los últimos 30 días: ${ventas30Dias.length} transacciones. Facturación total: C$ ${ingresosTotales.toFixed(2)} córdobas.

PRODUCTOS CON STOCK BAJO O IGUAL AL MÍNIMO:
${stockBajo.length === 0 ? "- Ninguno" : stockBajo.map(p => `- ${p.nombre} (Stock actual: ${p.stockActual}, Mínimo: ${p.stockMinimo})`).join("\n")}

LOTES PRÓXIMOS A VENCER O VENCIDOS (Próximos 3 meses):
${lotesVencer.length === 0 ? "- Ninguno" : lotesVencer.map(l => {
  const diasRestantes = Math.ceil((new Date(l.fechaVencimiento!).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
  const estadoVence = diasRestantes < 0 ? "¡YA VENCIDO!" : `vence en ${diasRestantes} días`
  return `- ${l.producto.nombre} | Lote: ${l.codigoLote} | Stock Lote: ${l.stockActual} | Vence: ${new Date(l.fechaVencimiento!).toLocaleDateString("es-NI")} (${estadoVence})`
}).join("\n")}

PRODUCTOS MÁS VENDIDOS (Últimos 30 días):
${masVendidos.length === 0 ? "- No hay ventas registradas todavía." : masVendidos.map((p, idx) => `${idx + 1}. ${p.nombre} (Vendido: ${p.cantidad} unidades, Total: C$ ${p.total.toFixed(2)})`).join("\n")}
`

    // 3. Revisar variables de entorno de IA
    const geminiApiKey = process.env.GEMINI_API_KEY
    const groqApiKey = process.env.GROQ_API_KEY

    // Preparar el prompt del sistema
    const systemPrompt = `Eres "PodoCare IA", un asistente virtual altamente calificado, inteligente y experto en gestión de farmacias y clínicas podológicas en Nicaragua. Tu objetivo es ayudar al administrador a gestionar su inventario, compras, alertas de stock, y análisis de ventas utilizando la telemetría que te proporciona el sistema.

Reglas importantes:
1. Responde SIEMPRE en español de forma profesional, clara y amigable.
2. Utiliza córdobas (C$) como moneda oficial.
3. Sé proactivo. Si te preguntan sobre inventario, sugiere reabastecer los productos que tienen stock bajo o advierte sobre lotes próximos a vencer.
4. Si el usuario te saluda o hace preguntas generales, preséntate brevemente y ofrécele información del estado actual de la farmacia.
5. Estructura tus respuestas con un excelente diseño visual usando Markdown (negritas, listas, tablas y alertas).

Aquí está la telemetría en tiempo real de la base de datos de la farmacia para que respondas de forma precisa:
=========================================
${telemetriaContexto}
=========================================
`

    // Si no hay API key configurada, dar una respuesta amigable basada en la telemetría directamente
    if (!geminiApiKey && !groqApiKey) {
      // Intentamos simular una respuesta del asistente basándonos en la telemetría
      const ultimoMensaje = messages[messages.length - 1]?.content?.toLowerCase() || ""
      let respuestaSimulada = `### 🤖 Hola, soy PodoCare IA

**Nota del Sistema:** *No se ha configurado la API Key de Gemini o Groq en el archivo \`.env\`. Para habilitar la conversación libre inteligente de la IA, añade \`GEMINI_API_KEY\` a tu archivo \`.env\`. Sin embargo, he generado esta respuesta analizando directamente la telemetría del sistema:*

`

      if (ultimoMensaje.includes("vence") || ultimoMensaje.includes("caduc") || ultimoMensaje.includes("fecha")) {
        respuestaSimulada += `#### ⚠️ Alertas de Vencimiento de Lotes (Próximos 3 meses):
`
        if (lotesVencer.length === 0) {
          respuestaSimulada += `¡Excelente noticia! No tienes lotes vencidos ni próximos a vencer en los siguientes 3 meses.`
        } else {
          respuestaSimulada += `Se han detectado **${lotesVencer.length} lote(s)** en estado de alerta:\n\n`
          lotesVencer.forEach(l => {
            const diasRestantes = Math.ceil((new Date(l.fechaVencimiento!).getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
            const estadoVence = diasRestantes < 0 ? `**¡YA VENCIDO!**` : `vence en **${diasRestantes} días**`
            respuestaSimulada += `- **${l.producto.nombre}** (Lote: \`${l.codigoLote}\`, Stock: ${l.stockActual} u.) - Expiración: \`${new Date(l.fechaVencimiento!).toLocaleDateString("es-NI")}\` (${estadoVence})\n`
          })
          respuestaSimulada += `\n*Recomendación: Retirar de inmediato los lotes vencidos de los estantes y realizar promociones de salida para los que están prontos a vencer.*`
        }
      } else if (ultimoMensaje.includes("stock") || ultimoMensaje.includes("inventario") || ultimoMensaje.includes("bajo") || ultimoMensaje.includes("mínimo")) {
        respuestaSimulada += `#### 📦 Alertas de Stock Bajo o Crítico:
`
        if (stockBajo.length === 0) {
          respuestaSimulada += `¡El inventario está saludable! Ningún producto activo se encuentra por debajo de su stock mínimo.`
        } else {
          respuestaSimulada += `Tienes **${stockBajo.length} producto(s)** que requieren reabastecimiento urgente:\n\n`
          respuestaSimulada += `| Producto | Stock Actual | Stock Mínimo | Estado |\n`
          respuestaSimulada += `| :--- | :---: | :---: | :---: |\n`
          stockBajo.forEach(p => {
            const estado = p.stockActual === 0 ? "❌ Sin Stock" : "⚠️ Reabastecer"
            respuestaSimulada += `| ${p.nombre} | **${p.stockActual}** | ${p.stockMinimo} | ${estado} |\n`
          })
          respuestaSimulada += `\n*Recomendación: Contactar a los proveedores para programar una orden de compra para estos productos.*`
        }
      } else if (ultimoMensaje.includes("venta") || ultimoMensaje.includes("ingreso") || ultimoMensaje.includes("gananc") || ultimoMensaje.includes("más vendido")) {
        respuestaSimulada += `#### 📊 Reporte Rápido de Ventas (Últimos 30 días):
- **Transacciones Realizadas:** ${ventas30Dias.length} ventas completadas.
- **Ingresos Totales:** C$ ${ingresosTotales.toFixed(2)}
- **Top 5 Productos más Vendidos:**
`
        if (masVendidos.length === 0) {
          respuestaSimulada += `No se registran ventas en los últimos 30 días.`
        } else {
          masVendidos.forEach((p, idx) => {
            respuestaSimulada += `${idx + 1}. **${p.nombre}** - ${p.cantidad} unidades (C$ ${p.total.toFixed(2)})\n`
          })
        }
      } else {
        respuestaSimulada += `Como tu asistente inteligente de farmacia, puedo ayudarte con los siguientes temas:
        
1. ⚠️ **Alertas de lotes vencidos o por vencer**: Escribe *"¿Qué productos están por vencerse?"*
2. 📦 **Alertas de stock y reabastecimiento**: Escribe *"¿Qué productos tienen stock bajo?"*
3. 📊 **Análisis rápido de ventas y rotación**: Escribe *"¿Cuáles son las ventas del mes?"*

*Configura tu \`GEMINI_API_KEY\` para conversar libremente conmigo sobre cualquier duda de administración.*`
      }

      return NextResponse.json({ text: respuestaSimulada })
    }

    // 4. Si hay API key, realizar la llamada al LLM
    if (geminiApiKey) {
      // Formatear mensajes para la API de Gemini
      const contents = [
        {
          role: "user",
          parts: [{ text: systemPrompt }]
        }
      ]

      // Añadir la conversación histórica (max 10 mensajes para evitar overflow)
      const ultimosMensajes = messages.slice(-10)
      ultimosMensajes.forEach((m: any) => {
        contents.push({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }]
        })
      })

      const responseGemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 1000,
          }
        })
      })

      if (!responseGemini.ok) {
        const errText = await responseGemini.text()
        console.error("Gemini API Error:", errText)
        throw new Error(`Gemini API returned status ${responseGemini.status}`)
      }

      const resJson = await responseGemini.json()
      const answer = resJson.candidates?.[0]?.content?.parts?.[0]?.text || "No pude obtener una respuesta de la IA. Por favor intenta de nuevo."
      return NextResponse.json({ text: answer })
    }

    if (groqApiKey) {
      // Fallback a Groq si se encuentra la clave
      const groqMessages = [
        { role: "system", content: systemPrompt },
        ...messages.slice(-10).map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content
        }))
      ]

      const responseGroq = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${groqApiKey}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: groqMessages,
          temperature: 0.2,
          max_tokens: 1000
        })
      })

      if (!responseGroq.ok) {
        const errText = await responseGroq.text()
        console.error("Groq API Error:", errText)
        throw new Error(`Groq API returned status ${responseGroq.status}`)
      }

      const resJson = await responseGroq.json()
      const answer = resJson.choices?.[0]?.message?.content || "No pude obtener una respuesta de Groq."
      return NextResponse.json({ text: answer })
    }

    return NextResponse.json({ error: "No API Key configured" }, { status: 500 })
  } catch (error: any) {
    console.error("Error in IA Assistant chat endpoint:", error)
    return NextResponse.json({ error: "Error en el chat de IA: " + error.message }, { status: 500 })
  }
}
