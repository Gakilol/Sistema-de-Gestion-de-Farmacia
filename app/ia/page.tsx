"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles, Send, Bot, User, RefreshCw, AlertTriangle,
  ArrowRight, Lightbulb, TrendingUp, PackageSearch,
  ClipboardList, ShieldAlert, Database, Loader2,
} from "lucide-react"
import { toast } from "sonner"

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface Message {
  role: "user" | "assistant"
  content: string
  toolsUsed?: string[]
  toolStatus?: string | null
  isToolLoading?: boolean
}

// ---------------------------------------------------------------------------
// Helpers de renderizado Markdown (sin dependencias externas)
// ---------------------------------------------------------------------------

function parseInlineStyles(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`|\*.*?\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-cyan-400 border border-border/40">{part.slice(1, -1)}</code>
    if (part.startsWith("*") && part.endsWith("*"))
      return <em key={i} className="italic text-muted-foreground">{part.slice(1, -1)}</em>
    return part
  })
}

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split("\n")
  const nodes: React.ReactNode[] = []
  let tableRows: string[][] = []
  let tableHeaders: string[] | null = null
  let inTable = false

  const flushTable = (key: number) => {
    if (!tableHeaders || tableRows.length === 0) return
    nodes.push(
      <div key={`table-${key}`} className="overflow-x-auto my-3 rounded-xl border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-muted/60">
            <tr>
              {tableHeaders.map((h, ci) => (
                <th key={ci} className="px-3 py-2 text-left font-semibold text-foreground border-b border-border/40">
                  {parseInlineStyles(h)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-3 py-1.5 text-muted-foreground border-b border-border/20 last:border-0">
                    {parseInlineStyles(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    tableHeaders = null
    tableRows = []
    inTable = false
  }

  lines.forEach((line, idx) => {
    // Línea horizontal
    if (line.startsWith("---")) {
      flushTable(idx)
      nodes.push(<hr key={idx} className="border-border/40 my-3" />)
      return
    }

    // Tablas Markdown
    if (line.startsWith("|")) {
      const cells = line.split("|").map((c) => c.trim()).filter((c) => c !== "")
      if (line.includes("---")) { inTable = true; return } // separador
      if (!inTable && !tableHeaders) {
        tableHeaders = cells
      } else {
        tableRows.push(cells)
      }
      return
    } else if (inTable || tableHeaders) {
      flushTable(idx)
    }

    // Headers
    if (line.startsWith("### ")) { nodes.push(<h3 key={idx} className="text-base font-bold text-foreground mt-4 mb-1.5">{parseInlineStyles(line.slice(4))}</h3>); return }
    if (line.startsWith("#### ")) { nodes.push(<h4 key={idx} className="text-sm font-bold text-foreground mt-3 mb-1">{parseInlineStyles(line.slice(5))}</h4>); return }
    if (line.startsWith("## ")) { nodes.push(<h2 key={idx} className="text-lg font-bold text-foreground mt-5 mb-2">{parseInlineStyles(line.slice(3))}</h2>); return }
    if (line.startsWith("# ")) { nodes.push(<h1 key={idx} className="text-xl font-bold text-foreground mt-5 mb-2">{parseInlineStyles(line.slice(2))}</h1>); return }

    // Listas
    if (line.startsWith("- ") || line.startsWith("* ")) {
      nodes.push(
        <div key={idx} className="flex items-start gap-2 my-0.5">
          <span className="text-cyan-500 mt-1.5 shrink-0">•</span>
          <span className="text-sm text-foreground/90">{parseInlineStyles(line.slice(2))}</span>
        </div>
      )
      return
    }

    // Listas numeradas
    if (/^\d+\.\s/.test(line)) {
      const match = line.match(/^(\d+)\.\s(.*)/)
      if (match) {
        nodes.push(
          <div key={idx} className="flex items-start gap-2 my-0.5">
            <span className="text-cyan-500 font-mono text-xs mt-1 shrink-0 w-5 text-right">{match[1]}.</span>
            <span className="text-sm text-foreground/90">{parseInlineStyles(match[2])}</span>
          </div>
        )
        return
      }
    }

    // Blockquotes (avisos médicos)
    if (line.startsWith("> ") || line.startsWith("⚕️")) {
      nodes.push(
        <div key={idx} className="my-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs">
          {parseInlineStyles(line.replace(/^>\s/, ""))}
        </div>
      )
      return
    }

    // Línea vacía
    if (line.trim() === "") { nodes.push(<div key={idx} className="h-1.5" />); return }

    // Párrafo normal
    nodes.push(
      <p key={idx} className="text-sm text-foreground/90 leading-relaxed">
        {parseInlineStyles(line)}
      </p>
    )
  })

  flushTable(lines.length)
  return <div className="space-y-1">{nodes}</div>
}

// ---------------------------------------------------------------------------
// Etiqueta de herramienta usada
// ---------------------------------------------------------------------------

const TOOL_LABELS: Record<string, string> = {
  getDashboardSummary:            "📊 Resumen del sistema",
  getLowStockProducts:            "📦 Stock bajo",
  getExpiredProducts:             "⚠️ Vencidos",
  getProductsNearExpiration:      "📅 Por vencer",
  searchProducts:                 "🔍 Catálogo",
  getProductDetails:              "📋 Detalle producto",
  getProductLots:                 "🗂️ Lotes (FEFO)",
  getTopSellingProducts:          "🏆 Más vendidos",
  getSalesSummary:                "💰 Ventas",
  getInventoryMovements:          "📜 Kardex",
  getAuditAlerts:                 "🛡️ Auditoría",
  getSuggestedPurchaseOrder:      "🛒 Sugerencia compra",
  createPurchaseDraft:            "📝 Borrador compra",
  createInventoryAdjustmentDraft: "⚖️ Borrador ajuste",
}

// ---------------------------------------------------------------------------
// Mensaje de bienvenida
// ---------------------------------------------------------------------------

const WELCOME_MESSAGE: Message = {
  role: "assistant",
  content: `### ¡Hola! Soy **FarmaPos IA** 🤖✨

Tu asistente operativo experto en gestión de farmacia. Tengo acceso directo y en tiempo real al inventario, lotes, ventas y auditoría del sistema.

Puedo ayudarte a:
- 📦 **Inventario**: Stock bajo, lotes vencidos o por vencer, FEFO
- 🔍 **Búsqueda**: Encontrar productos por nombre, categoría o uso
- 📊 **Ventas**: Reportes, productos más vendidos, resúmenes por fecha
- 🛒 **Compras**: Sugerencias y borradores de órdenes de compra
- 🛡️ **Auditoría**: Detectar anomalías y anulaciones inusuales

¿Con qué deseas comenzar?`,
}

// ---------------------------------------------------------------------------
// Sugerencias rápidas
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { text: "¿Qué productos están por vencerse?", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { text: "¿Qué productos tienen stock bajo?", icon: Lightbulb, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { text: "¿Cuáles son los 10 productos más vendidos?", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { text: "Genera una sugerencia de orden de compra", icon: ClipboardList, color: "text-blue-500 bg-blue-500/10 border-blue-500/20" },
  { text: "¿Hay alertas de auditoría esta semana?", icon: ShieldAlert, color: "text-purple-500 bg-purple-500/10 border-purple-500/20" },
  { text: "Busca Paracetamol en el inventario", icon: PackageSearch, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
]

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function AsistenteIAPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [toolLoadingLabel, setToolLoadingLabel] = useState<string>("Consultando...")
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = useCallback(async (textToSend?: string) => {
    const messageText = textToSend ?? input
    if (!messageText.trim() || loading) return
    if (!textToSend) setInput("")

    const userMessage: Message = { role: "user", content: messageText }
    const newMessages: Message[] = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)
    setToolLoadingLabel("Analizando tu consulta...")

    try {
      const response = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        toast.error(data.error)
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `❌ **Error:** ${data.error}` },
        ])
      } else {
        const assistantMessage: Message = {
          role: "assistant",
          content: data.text,
          toolsUsed: data.toolsUsed ?? [],
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch {
      toast.error("Error al comunicarse con el asistente de IA")
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.",
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [messages, input, loading])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleReset = () => {
    setMessages([WELCOME_MESSAGE])
    setInput("")
    toast.success("Conversación reiniciada")
  }

  // Indicador de herramienta en uso
  useEffect(() => {
    if (!loading) return
    const labels = [
      "Consultando inventario...",
      "Verificando lotes...",
      "Analizando ventas...",
      "Procesando datos...",
    ]
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % labels.length
      setToolLoadingLabel(labels[i])
    }, 1800)
    return () => clearInterval(interval)
  }, [loading])

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">

        {/* ── Header ── */}
        <header className="px-4 sm:px-6 py-3 border-b border-border bg-card/70 backdrop-blur-md flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
              <Bot className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-foreground flex items-center gap-2">
                FarmaPos IA
                <span className="hidden sm:inline text-[9px] font-bold text-cyan-500 bg-cyan-500/10 px-1.5 py-0.5 rounded-full border border-cyan-500/20 animate-pulse">
                  FUNCTION CALLING
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Database className="w-3 h-3" />
                Acceso en tiempo real al sistema
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-muted-foreground hover:text-foreground border-border hover:bg-muted/50 gap-1.5 text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Limpiar</span>
          </Button>
        </header>

        {/* ── Área de Chat ── */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 bg-gradient-to-b from-background via-background to-muted/10">
          <div className="max-w-3xl mx-auto space-y-5">
            {messages.map((message, idx) => {
              const isAi = message.role === "assistant"
              return (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${isAi ? "justify-start" : "justify-end flex-row-reverse"} animate-in fade-in-0 slide-in-from-bottom-2 duration-300`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isAi
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                      : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                  }`}>
                    {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  {/* Burbuja */}
                  <div className="space-y-1.5 max-w-[88%] min-w-0">
                    <div className={`px-4 py-3 rounded-2xl border ${
                      isAi
                        ? "bg-card border-border rounded-tl-none shadow-sm"
                        : "bg-primary text-primary-foreground border-transparent rounded-tr-none shadow-md"
                    }`}>
                      {isAi
                        ? renderMarkdown(message.content)
                        : <p className="text-sm font-medium leading-relaxed">{message.content}</p>
                      }
                    </div>

                    {/* Herramientas usadas */}
                    {isAi && message.toolsUsed && message.toolsUsed.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 px-1">
                        {[...new Set(message.toolsUsed)].map((tool, ti) => (
                          <span
                            key={ti}
                            className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 font-medium"
                          >
                            {TOOL_LABELS[tool] ?? tool}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Indicador de carga con herramienta */}
            {loading && (
              <div className="flex gap-3 items-start justify-start animate-in fade-in-0 duration-200">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-tl-none shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 text-cyan-500 animate-spin shrink-0" />
                    <span className="text-xs text-muted-foreground animate-pulse">{toolLoadingLabel}</span>
                    <div className="flex gap-0.5 ml-1">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-cyan-500/60 animate-bounce"
                          style={{ animationDelay: `${i * 150}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </div>

        {/* ── Input Area ── */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/70 backdrop-blur-md z-10 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">

            {/* Sugerencias rápidas (solo al inicio) */}
            {messages.length === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SUGGESTIONS.map((sug, i) => {
                  const IconComponent = sug.icon
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(sug.text)}
                      disabled={loading}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs font-medium hover:bg-muted/30 transition-all duration-200 group active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${sug.color}`}
                    >
                      <IconComponent className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 line-clamp-2">{sug.text}</span>
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Campo de texto */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Pregunta sobre inventario, ventas, lotes, compras..."
                className="flex-1 bg-muted/40 border-border text-sm py-5 rounded-xl placeholder:text-muted-foreground/60"
                disabled={loading}
                maxLength={500}
              />
              <Button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-5 px-4 sm:px-5 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-muted-foreground/50">
              FarmaPos IA accede al sistema en tiempo real · No sustituye la consulta con un farmacéutico o médico
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
