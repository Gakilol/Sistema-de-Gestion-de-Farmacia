"use client"

import { useState, useRef, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sparkles, Send, Bot, User, RefreshCw,
  AlertTriangle, ArrowRight, Lightbulb, TrendingUp, Info
} from "lucide-react"
import { toast } from "sonner"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function AsistenteIAPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `### ¡Hola! Soy **PodoCare IA** 🤖✨

Tu asistente virtual experto en la gestión de esta farmacia. Estoy listo para ayudarte a analizar la telemetría en tiempo real de tu negocio. 

Puedo ayudarte a:
- 📅 Revisar **lotes próximos a vencer** o vencidos.
- 📦 Identificar **productos con stock crítico** (bajo stock mínimo).
- 📊 Analizar las **ventas del último mes** e ingresos.
- 💡 Proponer **sugerencias de compras y reabastecimiento** inteligentes.

¿Con qué te gustaría iniciar hoy? Puedes elegir una de las sugerencias rápidas de abajo o escribirme directamente.`
    }
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom when messages change
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleSend = async (textToSend?: string) => {
    const messageText = textToSend || input
    if (!messageText.trim() || loading) return

    if (!textToSend) {
      setInput("")
    }

    const newMessages = [...messages, { role: "user", content: messageText }]
    setMessages(newMessages as any)
    setLoading(true)

    try {
      const response = await fetch("/api/ia/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
      })

      if (!response.ok) {
        throw new Error("Error en la respuesta del servidor")
      }

      const data = await response.json()
      if (data.error) {
        toast.error(data.error)
        setMessages(prev => [...prev, { role: "assistant", content: `❌ **Error:** ${data.error}` }])
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: data.text }])
      }
    } catch (error: any) {
      console.error(error)
      toast.error("Error al comunicarse con el asistente de IA")
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ Lo siento, ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo en unos momentos." }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = [
    { text: "¿Qué productos están por vencerse?", icon: AlertTriangle, color: "text-amber-500 bg-amber-500/10 border-amber-500/20" },
    { text: "¿Qué productos tienen stock bajo?", icon: Lightbulb, color: "text-red-500 bg-red-500/10 border-red-500/20" },
    { text: "¿Cuáles son las ventas del mes?", icon: TrendingUp, color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" },
    { text: "Dame recomendaciones de reabastecimiento", icon: Sparkles, color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20" }
  ]

  // Render markdown summary/tables simply since next-md isn't installed
  const renderMessageContent = (content: string) => {
    // Basic Markdown converter logic for display
    const lines = content.split("\n")
    return (
      <div className="space-y-2.5 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          // Headers
          if (line.startsWith("### ")) {
            return <h3 key={idx} className="text-lg font-bold text-foreground mt-4 mb-2">{line.replace("### ", "")}</h3>
          }
          if (line.startsWith("#### ")) {
            return <h4 key={idx} className="text-base font-bold text-foreground mt-3 mb-1">{line.replace("#### ", "")}</h4>
          }
          if (line.startsWith("## ")) {
            return <h2 key={idx} className="text-xl font-bold text-foreground mt-5 mb-3">{line.replace("## ", "")}</h2>
          }

          // Bullets
          if (line.startsWith("- ")) {
            return (
              <ul key={idx} className="list-disc list-inside ml-2 text-muted-foreground">
                <li className="mt-1">{parseInlineStyles(line.substring(2))}</li>
              </ul>
            )
          }

          // Numbered lists
          if (/^\d+\.\s/.test(line)) {
            const cleanLine = line.replace(/^\d+\.\s/, "")
            return (
              <ol key={idx} className="list-decimal list-inside ml-2 text-muted-foreground">
                <li className="mt-1">{parseInlineStyles(cleanLine)}</li>
              </ol>
            )
          }

          // Tables (very basic parser)
          if (line.startsWith("|")) {
            // Ignore separators
            if (line.includes("---") || line.includes("---:")) {
              return null
            }
            const cells = line.split("|").map(c => c.trim()).filter(c => c !== "")
            return (
              <div key={idx} className="overflow-x-auto my-2">
                <div className="flex bg-muted/40 p-2 rounded-lg border border-border justify-between text-xs font-semibold text-foreground">
                  {cells.map((cell, cIdx) => (
                    <span key={cIdx} className="flex-1 text-center truncate">{cell.replace(/\*\*/g, "")}</span>
                  ))}
                </div>
              </div>
            )
          }

          // Normal paragraphs
          if (line.trim() === "") return <div key={idx} className="h-1.5" />

          return <p key={idx} className="text-foreground/90">{parseInlineStyles(line)}</p>
        })}
      </div>
    )
  }

  const parseInlineStyles = (text: string) => {
    // basic bold / code highlighting
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index} className="font-bold text-foreground">{part.slice(2, -2)}</strong>
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return <code key={index} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-cyan-500 border border-border/40">{part.slice(1, -1)}</code>
      }
      return part
    })
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Chat Header */}
        <header className="px-6 py-4 border-b border-border bg-card/65 backdrop-blur-md flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-foreground flex items-center gap-1.5">
                PodoCare IA
                <span className="text-[10px] font-bold text-cyan-500 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 animate-pulse">
                  PREDICTIVO
                </span>
              </h1>
              <p className="text-xs text-muted-foreground">Gestión de Inventario, Ventas y Compras</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMessages([
                  {
                    role: "assistant",
                    content: `### Historial reiniciado 🤖\n\n¿En qué puedo ayudarte hoy? Elige una sugerencia o haz una pregunta sobre el inventario actual.`
                  }
                ])
                toast.success("Conversación reiniciada")
              }}
              className="text-muted-foreground hover:text-foreground border-border hover:bg-muted/50 gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Limpiar chat
            </Button>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-gradient-to-b from-background via-background to-muted/20">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((message, idx) => {
              const isAi = message.role === "assistant"
              return (
                <div
                  key={idx}
                  className={`flex gap-4 items-start ${
                    isAi ? "justify-start" : "justify-end flex-row-reverse"
                  } animate-in fade-in-50 duration-300`}
                >
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                      isAi
                        ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                        : "bg-gradient-to-br from-emerald-500 to-teal-600 text-white"
                    }`}
                  >
                    {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1.5 max-w-[85%]">
                    <div
                      className={`px-4 py-3 rounded-2xl border ${
                        isAi
                          ? "bg-card border-border text-foreground rounded-tl-none shadow-sm"
                          : "bg-primary text-primary-foreground border-primary/20 rounded-tr-none shadow-md shadow-primary/10"
                      }`}
                    >
                      {isAi ? renderMessageContent(message.content) : <p className="text-sm font-medium leading-relaxed">{message.content}</p>}
                    </div>
                  </div>
                </div>
              )
            })}
            {loading && (
              <div className="flex gap-4 items-start justify-start animate-pulse">
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-muted-foreground animate-spin" />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-card border border-border rounded-tl-none shadow-sm">
                  <div className="flex gap-1 items-center py-1.5 px-1">
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "0ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: "300ms" }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>

        {/* Input area */}
        <div className="p-4 border-t border-border bg-card/65 backdrop-blur-md z-10">
          <div className="max-w-3xl mx-auto space-y-4">
            {/* Quick Suggestions */}
            {messages.length === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {suggestions.map((sug, i) => {
                  const IconComponent = sug.icon
                  return (
                    <button
                      key={i}
                      onClick={() => handleSend(sug.text)}
                      className={`flex items-center gap-3 p-3 rounded-xl border text-left text-xs font-semibold hover:bg-muted/40 transition-all duration-200 group active:scale-[0.98] ${sug.color}`}
                    >
                      <IconComponent className="w-4 h-4 shrink-0" />
                      <span className="flex-1 truncate">{sug.text}</span>
                      <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )
                })}
              </div>
            )}

            {/* Form */}
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu consulta sobre stock, vencimientos o ventas..."
                className="flex-1 bg-muted/40 border-border text-sm py-5 rounded-xl placeholder:text-muted-foreground/75"
                disabled={loading}
              />
              <Button
                onClick={() => handleSend()}
                disabled={loading || !input.trim()}
                className="bg-primary hover:bg-primary/95 text-primary-foreground py-5 px-5 rounded-xl shadow-lg transition-transform active:scale-95 shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
