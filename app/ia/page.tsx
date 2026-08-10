"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import * as XLSX from "xlsx"
import { Sidebar } from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Send, Bot, User, AlertTriangle,
  ArrowRight, Lightbulb, TrendingUp, PackageSearch,
  ClipboardList, ShieldAlert, Database, Loader2, Upload,
  Plus, MessageSquare, Trash2, History, FileSpreadsheet, X,
} from "lucide-react"
import { toast } from "sonner"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

// ---------------------------------------------------------------------------
// Tipos locales
// ---------------------------------------------------------------------------

interface Message {
  id?: string
  role: "user" | "assistant"
  content: string
  toolsUsed?: string[]
  toolStatus?: string | null
  isToolLoading?: boolean
  mode?: "vertex_ai" | "gemini" | "local_operational" | "groq_limited" | string
}

interface Conversation {
  id: string
  titulo: string
  vistaPrevia?: string
  updatedAt: string
  importacionActiva?: { id: string; archivo: string } | null
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

Tu asistente operativo para FarmaPOS. Las consultas operativas se resuelven con datos autorizados del sistema y un motor local seguro; cuando el proveedor avanzado está disponible, amplío la explicación sin darle acceso directo a la base de datos.

Puedo ayudarte a:
- 📦 **Inventario**: Stock bajo, lotes vencidos o por vencer, FEFO
- 🔍 **Búsqueda**: Encontrar productos por nombre, categoría o uso
- 📊 **Ventas**: Reportes, productos más vendidos, resúmenes por fecha
- 🛒 **Compras**: Sugerencias y borradores de órdenes de compra
- 🛡️ **Auditoría**: Detectar anomalías y anulaciones inusuales
- 📄 **Excel**: Revisar archivos y crear productos solo cuando estén completos

¿Con qué deseas comenzar?`,
}

// ---------------------------------------------------------------------------
// Sugerencias rápidas
// ---------------------------------------------------------------------------

const SUGGESTIONS = [
  { text: "¿Qué productos están por vencerse?", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
  { text: "¿Qué productos tienen stock bajo?", icon: Lightbulb, color: "text-red-500 bg-red-500/10 border-red-500/20" },
  { text: "¿Cuáles son los 10 productos más vendidos?", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
  { text: "Genera una sugerencia de orden de compra", icon: ClipboardList, color: "text-blue-500 bg-blue-500/10 border-blue-500/20", adminOnly: true },
  { text: "¿Hay alertas de auditoría esta semana?", icon: ShieldAlert, color: "text-purple-500 bg-purple-500/10 border-purple-500/20", adminOnly: true },
  { text: "Busca Paracetamol en el inventario", icon: PackageSearch, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" },
]

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function AsistenteIAPage() {
  const { user } = useCurrentUser()
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [activeImportId, setActiveImportId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [toolLoadingLabel, setToolLoadingLabel] = useState<string>("Consultando...")
  const chatEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadConversations = useCallback(async () => {
    if (!user) return
    setHistoryLoading(true)
    try {
      const response = await fetch("/api/ia/conversaciones", { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el historial")
      setConversations(data.conversaciones ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el historial")
    } finally {
      setHistoryLoading(false)
    }
  }, [user])

  useEffect(() => { loadConversations() }, [loadConversations])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const createConversation = useCallback(async (firstText: string) => {
    const title = firstText.replace(/\s+/g, " ").trim().slice(0, 70) || "Nueva conversación"
    const response = await fetch("/api/ia/conversaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: title }),
    })
    const data = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(data.error || "No se pudo crear la conversación")
    setCurrentConversationId(data.conversacion.id)
    return data.conversacion.id as string
  }, [])

  const saveMessage = useCallback(async (conversationId: string, message: Message) => {
    const response = await fetch(`/api/ia/conversaciones/${conversationId}/mensajes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: message.role,
        content: message.content,
        metadata: { toolsUsed: message.toolsUsed ?? [], mode: message.mode ?? null },
      }),
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || "No se pudo guardar el mensaje")
    }
  }, [])

  const openConversation = useCallback(async (conversation: Conversation) => {
    if (loading || uploading) return
    setHistoryOpen(false)
    setHistoryLoading(true)
    try {
      const response = await fetch(`/api/ia/conversaciones/${conversation.id}`, { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "No se pudo abrir la conversación")
      const storedMessages: Message[] = (data.conversacion.mensajes ?? []).map((message: any) => ({
        id: message.id,
        role: message.rol,
        content: message.contenido,
        toolsUsed: Array.isArray(message.metadata?.toolsUsed) ? message.metadata.toolsUsed : [],
        mode: message.metadata?.mode,
      }))
      setMessages(storedMessages.length > 0 ? storedMessages : [WELCOME_MESSAGE])
      setCurrentConversationId(conversation.id)
      setActiveImportId(data.conversacion.importacionActiva?.id ?? null)
      setInput("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo abrir la conversación")
    } finally {
      setHistoryLoading(false)
    }
  }, [loading, uploading])

  const handleNewChat = useCallback(() => {
    if (loading || uploading) return
    setMessages([WELCOME_MESSAGE])
    setCurrentConversationId(null)
    setActiveImportId(null)
    setInput("")
    setHistoryOpen(false)
  }, [loading, uploading])

  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!window.confirm("¿Eliminar esta conversación y todos sus mensajes?")) return
    const response = await fetch(`/api/ia/conversaciones/${conversationId}`, { method: "DELETE" })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      return toast.error(data.error || "No se pudo eliminar la conversación")
    }
    if (currentConversationId === conversationId) handleNewChat()
    await loadConversations()
    toast.success("Conversación eliminada")
  }, [currentConversationId, handleNewChat, loadConversations])

  const handleSend = useCallback(async (textToSend?: string) => {
    const messageText = textToSend ?? input
    if (!messageText.trim() || loading) return
    if (messageText.length > 2500) {
      toast.error("La consulta no puede superar 2500 caracteres")
      return
    }
    if (!textToSend) setInput("")

    const userMessage: Message = { role: "user", content: messageText }
    const newMessages: Message[] = [...messages, userMessage]
    setMessages(newMessages)
    setLoading(true)
    setToolLoadingLabel("Analizando tu consulta...")

    try {
      const conversationId = currentConversationId ?? await createConversation(messageText)
      await saveMessage(conversationId, userMessage)

      const endpoint = activeImportId ? `/api/ia/importaciones/${activeImportId}` : "/api/ia/chat"
      const requestBody = activeImportId
        ? { respuesta: messageText }
        : { messages: newMessages.map((m) => ({ role: m.role, content: m.content })) }
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`)

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
          mode: activeImportId ? "importacion_excel" : data.mode,
        }
        setMessages((prev) => [...prev, assistantMessage])
        await saveMessage(conversationId, assistantMessage)
        if (data.finalizada) setActiveImportId(null)
        await loadConversations()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al comunicarse con el asistente de IA")
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
  }, [messages, input, loading, currentConversationId, createConversation, saveMessage, activeImportId, loadConversations])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileUpload = useCallback(async (file: File) => {
    if (user?.rolNombre !== "ADMIN") return toast.error("Solo administración puede importar productos")
    if (!/\.(xlsx|xls)$/i.test(file.name)) return toast.error("Selecciona un archivo Excel .xlsx o .xls")
    if (file.size > 5 * 1024 * 1024) return toast.error("El archivo no puede superar 5 MB")
    setUploading(true)
    setLoading(true)
    setToolLoadingLabel("Revisando columnas y productos...")
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      if (!firstSheet) throw new Error("El Excel no contiene hojas")
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(firstSheet, { defval: null, raw: true })
      if (rows.length === 0) throw new Error("La primera hoja no contiene productos")
      if (rows.length > 250) throw new Error("Por seguridad, importa un máximo de 250 productos por archivo")

      const conversationId = currentConversationId ?? await createConversation(`Importar productos: ${file.name}`)
      const userMessage: Message = { role: "user", content: `Adjunté el archivo **${file.name}** para importar productos.` }
      setMessages((prev) => [...prev, userMessage])
      await saveMessage(conversationId, userMessage)

      const response = await fetch("/api/ia/importaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archivo: file.name, filas: rows, conversacionId: conversationId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "No se pudo analizar el Excel")
      const assistantMessage: Message = { role: "assistant", content: data.text, mode: "importacion_excel" }
      setMessages((prev) => [...prev, assistantMessage])
      setActiveImportId(data.importacionId)
      await saveMessage(conversationId, assistantMessage)
      await loadConversations()
      toast.success("Excel revisado; la IA te indicará qué falta")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo leer el Excel")
    } finally {
      setUploading(false)
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }, [user, currentConversationId, createConversation, saveMessage, loadConversations])

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
      {historyOpen && (
        <button
          aria-label="Cerrar historial"
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}
      <aside className={`${historyOpen ? "fixed inset-y-0 right-0 z-40 flex" : "hidden"} w-[min(88vw,19rem)] flex-col border-l border-border bg-card shadow-2xl lg:relative lg:z-auto lg:flex lg:w-72 lg:border-l-0 lg:border-r lg:shadow-none`}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <History className="size-4 text-cyan-500" />
            <span className="text-sm font-semibold">Chats guardados</span>
          </div>
          <Button variant="ghost" size="icon" className="size-8 lg:hidden" onClick={() => setHistoryOpen(false)}>
            <X className="size-4" />
          </Button>
        </div>
        <div className="p-3">
          <Button onClick={handleNewChat} className="w-full justify-start gap-2" disabled={loading || uploading}>
            <Plus className="size-4" />
            Nuevo chat
          </Button>
        </div>
        <div className="flex-1 space-y-1 overflow-y-auto px-2 pb-3">
          {historyLoading && conversations.length === 0 ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" /> Cargando historial…
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Tus conversaciones aparecerán aquí.
            </div>
          ) : conversations.map((conversation) => (
            <div
              key={conversation.id}
              className={`group flex items-start gap-2 rounded-xl border px-3 py-2.5 transition-colors ${currentConversationId === conversation.id ? "border-cyan-500/30 bg-cyan-500/10" : "border-transparent hover:bg-muted/60"}`}
            >
              <button className="min-w-0 flex-1 text-left" onClick={() => openConversation(conversation)}>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  {conversation.importacionActiva ? <FileSpreadsheet className="size-3.5 shrink-0 text-emerald-500" /> : <MessageSquare className="size-3.5 shrink-0 text-cyan-500" />}
                  <span className="truncate">{conversation.titulo}</span>
                </span>
                <span className="mt-1 block truncate text-[10px] text-muted-foreground">{conversation.vistaPrevia}</span>
                <span className="mt-1 block text-[9px] text-muted-foreground/70">
                  {new Intl.DateTimeFormat("es-NI", { dateStyle: "medium" }).format(new Date(conversation.updatedAt))}
                </span>
              </button>
              <button
                aria-label={`Eliminar ${conversation.titulo}`}
                className="mt-0.5 rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                onClick={() => deleteConversation(conversation.id)}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="border-t border-border px-4 py-3 text-[10px] leading-relaxed text-muted-foreground">
          El historial es privado para cada usuario y se guarda en FarmaPOS.
        </div>
      </aside>
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
                  IA OPERATIVA
                </span>
              </h1>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Database className="w-3 h-3" />
                Datos por rol · historial guardado automáticamente
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setHistoryOpen(true)}
              className="gap-1.5 text-xs lg:hidden"
            >
              <History className="size-3.5" /> Historial
            </Button>
            <Button variant="outline" size="sm" onClick={handleNewChat} className="hidden gap-1.5 text-xs sm:flex lg:hidden">
              <Plus className="size-3.5" /> Nuevo chat
            </Button>
          </div>
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
                    {isAi && message.mode && idx > 0 && (
                      <div className="px-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border/60 font-medium">
                          {message.mode === "vertex_ai" ? "Vertex AI" : message.mode === "gemini" ? "Gemini" : message.mode === "local_operational" ? "Motor local seguro" : message.mode === "importacion_excel" ? "Importación Excel" : "Modo limitado"}
                        </span>
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

            {activeImportId && (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                <FileSpreadsheet className="size-4 shrink-0" />
                <span className="flex-1">Importación en revisión: responde los datos faltantes o escribe <strong>IMPORTAR</strong>.</span>
              </div>
            )}

            {/* Sugerencias rápidas (solo al inicio) */}
            {messages.length === 1 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {SUGGESTIONS.filter((sug) => !sug.adminOnly || user?.rolNombre === "ADMIN").map((sug, i) => {
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
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) handleFileUpload(file)
                }}
              />
              {user?.rolNombre === "ADMIN" && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Adjuntar Excel de productos"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading || uploading || Boolean(activeImportId)}
                  className="h-10 w-10 shrink-0 rounded-xl"
                >
                  {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                </Button>
              )}
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={activeImportId ? "Completa datos: Fila 3: categoría=…" : "Pregunta sobre inventario, ventas o adjunta un Excel..."}
                className="flex-1 bg-muted/40 border-border text-sm py-5 rounded-xl placeholder:text-muted-foreground/60"
                disabled={loading || uploading}
                maxLength={2500}
              />
              <Button
                onClick={() => handleSend()}
                disabled={loading || uploading || !input.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground py-5 px-4 sm:px-5 rounded-xl shadow-lg shadow-primary/20 transition-transform active:scale-95 shrink-0"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>

            {/* Disclaimer */}
            <p className="text-center text-[10px] text-muted-foreground/50">
              Consultas auditadas y limitadas por rol · No sustituye la consulta con un farmacéutico o médico
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
