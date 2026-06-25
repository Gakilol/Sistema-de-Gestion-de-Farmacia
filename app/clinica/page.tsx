"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import {
  Calendar, ClipboardList, Plus, Search, CheckCircle, Clock, XCircle,
  FileText, Activity, Trash, PlusCircle, AlertTriangle, Eye, Printer
} from "lucide-react"

type Tab = "citas" | "consultas" | "recetas"

interface Cliente {
  id: number
  nombreCompleto: string
  cedula: string | null
  telefono: string | null
}

interface Cita {
  id: number
  idCliente: number
  cliente: Cliente
  fecha: string
  motivo: string | null
  estado: string
  atencion?: {
    id: number
    receta?: {
      id: number
      codigoReceta: string
    }
  }
}

interface Producto {
  id: number
  nombre: string
  esServicio: boolean
  precioVenta: string
  stockTotal?: number
}

interface DetalleRecetaInput {
  idProducto: number
  nombreProducto: string
  cantidad: number
  indicaciones: string
}

export default function ClinicaPage() {
  const { user } = useCurrentUser()
  const isAdminOrDoctor = user?.rolNombre === "ADMIN" || user?.rolNombre === "DOCTOR"

  const [activeTab, setActiveTab] = useState<Tab>("citas")
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Master Data
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [diagnosticosList, setDiagnosticosList] = useState<any[]>([])
  const [tratamientosList, setTratamientosList] = useState<any[]>([])
  const [selectedDiagnosticos, setSelectedDiagnosticos] = useState<number[]>([])
  const [selectedTratamientos, setSelectedTratamientos] = useState<number[]>([])
  const [selectedInsumos, setSelectedInsumos] = useState<any[]>([])
  const [selectedInsumoId, setSelectedInsumoId] = useState("")
  const [insumoCantidad, setInsumoCantidad] = useState("1")

  // Quick Create Diagnóstico/Tratamiento
  const [quickDxNombre, setQuickDxNombre] = useState("")
  const [quickDxCodigo, setQuickDxCodigo] = useState("")
  const [quickDxDesc, setQuickDxDesc] = useState("")
  const [showQuickDx, setShowQuickDx] = useState(false)
  const [dxLoading, setDxLoading] = useState(false)

  const [quickTxNombre, setQuickTxNombre] = useState("")
  const [quickTxDesc, setQuickTxDesc] = useState("")
  const [showQuickTx, setShowQuickTx] = useState(false)
  const [txLoading, setTxLoading] = useState(false)

  const handleCreateQuickDx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickDxNombre.trim()) {
      toast.error("El nombre del diagnóstico es obligatorio")
      return
    }
    setDxLoading(true)
    try {
      const res = await fetch("/api/clinica/diagnosticos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: quickDxNombre.trim(),
          codigo: quickDxCodigo.trim() || null,
          descripcion: quickDxDesc.trim() || null
        })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al crear diagnóstico")
        return
      }
      toast.success("Diagnóstico creado e incorporado")
      setDiagnosticosList([...diagnosticosList, data])
      setSelectedDiagnosticos([...selectedDiagnosticos, data.id])
      setQuickDxNombre("")
      setQuickDxCodigo("")
      setQuickDxDesc("")
      setShowQuickDx(false)
    } catch {
      toast.error("Error de red al crear diagnóstico")
    } finally {
      setDxLoading(false)
    }
  }

  const handleCreateQuickTx = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickTxNombre.trim()) {
      toast.error("El nombre del tratamiento es obligatorio")
      return
    }
    setTxLoading(true)
    try {
      const res = await fetch("/api/clinica/tratamientos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: quickTxNombre.trim(),
          descripcion: quickTxDesc.trim() || null
        })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al crear tratamiento")
        return
      }
      toast.success("Tratamiento creado e incorporado")
      setTratamientosList([...tratamientosList, data])
      setSelectedTratamientos([...selectedTratamientos, data.id])
      setQuickTxNombre("")
      setQuickTxDesc("")
      setShowQuickTx(false)
    } catch {
      toast.error("Error de red al crear tratamiento")
    } finally {
      setTxLoading(false)
    }
  }


  // Appointments (Citas) State
  const [citas, setCitas] = useState<Cita[]>([])
  const [showCitaModal, setShowCitaModal] = useState(false)
  const [citaForm, setCitaForm] = useState({
    idCliente: "",
    fecha: "",
    hora: "",
    motivo: ""
  })
  const [citaSubmitLoading, setCitaSubmitLoading] = useState(false)

  // Consultations (Atenciones Podológicas) State
  const [atenciones, setAtenciones] = useState<any[]>([])
  const [showSOAPForm, setShowSOAPForm] = useState(false)
  const [soapClient, setSoapClient] = useState<Cliente | null>(null)
  const [soapCitaId, setSoapCitaId] = useState<number | null>(null)
  const [soapForm, setSoapForm] = useState({
    subjetivo: "",
    objetivo: "",
    analisis: "",
    plan: ""
  })
  const [emitReceta, setEmitReceta] = useState(false)
  const [recetaForm, setRecetaForm] = useState({
    fechaVencimiento: "",
    observaciones: ""
  })
  const [recetaDetalles, setRecetaDetalles] = useState<DetalleRecetaInput[]>([])
  const [selectedProdId, setSelectedProdId] = useState("")
  const [prodCantidad, setProdCantidad] = useState("1")
  const [prodIndicaciones, setProdIndicaciones] = useState("")
  const [soapSubmitLoading, setSoapSubmitLoading] = useState(false)

  // Prescriptions (Recetas) State
  const [recetas, setRecetas] = useState<any[]>([])

  // Details Modal
  const [selectedConsulta, setSelectedConsulta] = useState<any | null>(null)

  useEffect(() => {
    fetchMasterData()
  }, [])

  useEffect(() => {
    fetchData()
  }, [activeTab])

  const fetchMasterData = async () => {
    try {
      const [cRes, pRes, dxRes, txRes] = await Promise.all([
        fetch("/api/clientes?estado=activos"),
        fetch("/api/productos?estado=activos"),
        fetch("/api/clinica/diagnosticos?soloActivos=true"),
        fetch("/api/clinica/tratamientos?soloActivos=true")
      ])
      const cData = await cRes.json()
      const pData = await pRes.json()
      const dxData = await dxRes.json()
      const txData = await txRes.json()
      setClientes(cData || [])
      setProductos(pData || [])
      setDiagnosticosList(dxData || [])
      setTratamientosList(txData || [])
    } catch (e) {
      console.error("Error al cargar datos maestros:", e)
      toast.error("Error al inicializar datos del panel clínico")
    }
  }


  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === "citas") {
        const res = await fetch("/api/clinica/citas")
        const data = await res.json()
        setCitas(data || [])
      } else if (activeTab === "consultas") {
        const res = await fetch("/api/clinica/atenciones")
        const data = await res.json()
        setAtenciones(data || [])
      } else if (activeTab === "recetas") {
        const res = await fetch("/api/clinica/recetas")
        const data = await res.json()
        setRecetas(data || [])
      }
    } catch (e) {
      console.error("Error al cargar datos del tab:", e)
      toast.error("Error al cargar datos")
    } finally {
      setLoading(false)
    }
  }

  // Handle schedule citation
  const handleCreateCita = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!citaForm.idCliente || !citaForm.fecha || !citaForm.hora) {
      toast.error("Completa todos los campos obligatorios")
      return
    }

    setCitaSubmitLoading(true)
    try {
      const combinedDateTime = new Date(`${citaForm.fecha}T${citaForm.hora}`).toISOString()
      const res = await fetch("/api/clinica/citas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCliente: parseInt(citaForm.idCliente),
          fecha: combinedDateTime,
          motivo: citaForm.motivo || null,
          estado: "PENDIENTE"
        })
      })

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al programar cita")
        return
      }

      toast.success("Cita programada correctamente")
      setShowCitaModal(false)
      setCitaForm({ idCliente: "", fecha: "", hora: "", motivo: "" })
      fetchData()
    } catch (err) {
      toast.error("Error de red al registrar cita")
    } finally {
      setCitaSubmitLoading(false)
    }
  }

  // Handle start SOAP consultation
  const startConsultation = (cita: Cita) => {
    setSoapClient(cita.cliente)
    setSoapCitaId(cita.id)
    setSoapForm({ subjetivo: "", objetivo: "", analisis: "", plan: "" })
    setEmitReceta(false)
    setRecetaForm({ fechaVencimiento: "", observaciones: "" })
    setRecetaDetalles([])
    setSelectedDiagnosticos([])
    setSelectedTratamientos([])
    setSelectedInsumos([])
    setSelectedInsumoId("")
    setInsumoCantidad("1")
    setShowSOAPForm(true)
  }

  const startDirectConsultation = (cliente: Cliente) => {
    setSoapClient(cliente)
    setSoapCitaId(null)
    setSoapForm({ subjetivo: "", objetivo: "", analisis: "", plan: "" })
    setEmitReceta(false)
    setRecetaForm({ fechaVencimiento: "", observaciones: "" })
    setRecetaDetalles([])
    setSelectedDiagnosticos([])
    setSelectedTratamientos([])
    setSelectedInsumos([])
    setSelectedInsumoId("")
    setInsumoCantidad("1")
    setShowSOAPForm(true)
  }


  // Add Item to Receta list
  const addRecetaItem = () => {
    if (!selectedProdId || !prodCantidad) {
      toast.error("Selecciona un producto y cantidad válida")
      return
    }
    const qty = parseInt(prodCantidad)
    if (isNaN(qty) || qty <= 0) {
      toast.error("Cantidad debe ser mayor a 0")
      return
    }

    const prod = productos.find(p => p.id === parseInt(selectedProdId))
    if (!prod) return

    // Evitar duplicados en el listado visual
    if (recetaDetalles.some(d => d.idProducto === prod.id)) {
      toast.error("El producto o servicio ya está en la receta")
      return
    }

    setRecetaDetalles([
      ...recetaDetalles,
      {
        idProducto: prod.id,
        nombreProducto: prod.nombre,
        cantidad: qty,
        indicaciones: prodIndicaciones.trim()
      }
    ])
    setSelectedProdId("")
    setProdCantidad("1")
    setProdIndicaciones("")
  }

  // Remove Item from Receta list
  const removeRecetaItem = (idProd: number) => {
    setRecetaDetalles(recetaDetalles.filter(d => d.idProducto !== idProd))
  }

  // Submit SOAP Consultation
  const handleSaveConsultation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!soapClient) return
    if (!soapForm.subjetivo || !soapForm.objetivo || !soapForm.analisis || !soapForm.plan) {
      toast.error("Todos los campos SOAP son obligatorios")
      return
    }

    if (emitReceta && recetaDetalles.length === 0) {
      toast.error("Si marcas emitir receta, debes agregar al menos un producto o servicio")
      return
    }

    setSoapSubmitLoading(true)
    try {
      // 1. Guardar Atención Podológica
      const atRes = await fetch("/api/clinica/atenciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCita: soapCitaId,
          idCliente: soapClient.id,
          subjetivo: soapForm.subjetivo,
          objetivo: soapForm.objetivo,
          analisis: soapForm.analisis,
          plan: soapForm.plan,
          diagnosticos: selectedDiagnosticos,
          tratamientos: selectedTratamientos,
          insumos: selectedInsumos.map(i => ({ idProducto: i.idProducto, cantidad: i.cantidad }))
        })
      })


      const atData = await atRes.json()
      if (!atRes.ok) {
        toast.error(atData.error || "Error al guardar la consulta clínica")
        setSoapSubmitLoading(false)
        return
      }

      // 2. Guardar Receta si aplica
      if (emitReceta) {
        const recRes = await fetch("/api/clinica/recetas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            idAtencion: atData.id,
            idCliente: soapClient.id,
            fechaVencimiento: recetaForm.fechaVencimiento || null,
            observaciones: recetaForm.observaciones || null,
            detalles: recetaDetalles.map(d => ({
              idProducto: d.idProducto,
              cantidad: d.cantidad,
              indicaciones: d.indicaciones || null
            }))
          })
        })

        const recData = await recRes.json()
        if (!recRes.ok) {
          toast.error(recData.error || "La consulta SOAP se guardó, pero hubo un error al emitir la receta.")
          // Continuar ya que la consulta se guardó
        } else {
          toast.success("Consulta y receta registradas con éxito")
        }
      } else {
        toast.success("Consulta clínica guardada correctamente")
      }

      setShowSOAPForm(false)
      fetchData()
    } catch (err) {
      toast.error("Error al procesar la transacción clínica")
    } finally {
      setSoapSubmitLoading(false)
    }
  }

  const cancelCita = async (id: number) => {
    if (!window.confirm("¿Estás seguro de cancelar esta cita?")) return
    try {
      // Implementamos una anulación directa en base de datos vía patch/put
      const res = await fetch(`/api/clinica/citas`, {
        // En lugar de crear una API dedicada, podemos usar un truco temporal o actualizar el estado.
        // Pero espera! Para mantenerlo oficial, usemos una petición directa.
        // Vamos a verificar si podemos actualizar una cita. Crearemos un PUT en el route de citas o usaremos el Prisma directamente si queremos, pero en Next.js las peticiones HTTP van por API.
        // Espera, ¿tiene el GET/POST de citas soporte para actualizar? No, lo acabamos de crear con GET/POST.
        // Vamos a modificar `/api/clinica/citas/route.ts` para que soporte PUT de actualización de estado si es necesario, o simplemente hacemos una petición PUT a /api/clinica/citas.
        // Vamos a escribir la petición PUT a `/api/clinica/citas` donde le enviamos `{ id, estado: "CANCELADA" }`.
        // Let's implement PUT in `app/api/clinica/citas/route.ts` if needed. Yes, let's do it!
      })
    } catch (err) {
      toast.error("Error al cancelar la cita")
    }
  }

  const handleUpdateCitaEstado = async (id: number, estado: string) => {
    try {
      const res = await fetch("/api/clinica/citas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, estado })
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Error al actualizar cita")
        return
      }
      toast.success(`Cita ${estado === "CANCELADA" ? "cancelada" : "actualizada"} correctamente`)
      fetchData()
    } catch (err) {
      toast.error("Error de conexión al actualizar la cita")
    }
  }

  const handlePrintReceta = (receta: any) => {
    // Generar formato de impresión básico en ventana nueva
    const printWindow = window.open("", "_blank")
    if (!printWindow) return

    const itemsHtml = receta.detalles.map((d: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${d.producto.nombre}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd; text-align: center;">${d.cantidad}</td>
        <td style="padding: 8px; border-bottom: 1px solid #ddd;">${d.indicaciones || "Ninguna"}</td>
      </tr>
    `).join("")

    printWindow.document.write(`
      <html>
        <head>
          <title>Receta ${receta.codigoReceta}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #10b981; padding-bottom: 20px; }
            .logo { font-size: 24px; font-weight: bold; color: #10b981; }
            .meta { display: flex; justify-content: space-between; margin: 20px 0; font-size: 14px; }
            .section { margin: 25px 0; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 10px; color: #0f172a; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background: #f8fafc; padding: 8px; text-align: left; border-bottom: 2px solid #ddd; font-size: 14px; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 20px; }
            .signature { margin-top: 60px; display: flex; justify-content: space-around; }
            .sig-line { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 13px; }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <div class="logo">FarmaPos Podología Clínica</div>
            <div style="font-size: 12px; color: #666; margin-top: 5px;">Managua, Nicaragua — Tel: +505 2222-7777</div>
          </div>
          <div class="meta">
            <div>
              <strong>Paciente:</strong> ${receta.cliente.nombreCompleto}<br>
              <strong>Cédula:</strong> ${receta.cliente.cedula || "N/A"}<br>
            </div>
            <div>
              <strong>Código:</strong> ${receta.codigoReceta}<br>
              <strong>Fecha:</strong> ${new Date(receta.createdAt).toLocaleDateString("es-NI")}<br>
              <strong>Vence:</strong> ${receta.fechaVencimiento ? new Date(receta.fechaVencimiento).toLocaleDateString("es-NI") : "No vence"}<br>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Productos y Servicios Recomendados</div>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th style="text-align: center; width: 80px;">Cant.</th>
                  <th>Indicaciones / Uso</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
          </div>
          ${receta.observaciones ? `
            <div class="section">
              <div class="section-title">Observaciones Adicionales</div>
              <p style="font-size: 14px; line-height: 1.5; background: #f8fafc; padding: 10px; border-radius: 4px; border: 1px solid #e2e8f0;">${receta.observaciones}</p>
            </div>
          ` : ""}
          <div class="signature">
            <div class="sig-line">
              Firma del Paciente
            </div>
            <div class="sig-line">
              Firma y Sello del Podólogo<br>
              <span style="font-size: 11px; color:#777;">${receta.usuario.nombreCompleto}</span>
            </div>
          </div>
          <div class="footer">
            Documento de validez clínica y recetas FarmaPos. Emitido por sistema integrado.
          </div>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filteredCitas = citas.filter(c =>
    !searchQuery ||
    c.cliente.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.motivo && c.motivo.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const filteredAtenciones = atenciones.filter(a =>
    !searchQuery ||
    a.cliente.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.subjetivo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.plan.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredRecetas = recetas.filter(r =>
    !searchQuery ||
    r.cliente.nombreCompleto.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.codigoReceta.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDIENTE":
        return <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20"><Clock className="w-3 h-3" /> Pendiente</span>
      case "COMPLETADA":
        return <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Completada</span>
      case "CANCELADA":
        return <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs bg-red-500/10 text-red-500 border border-red-500/20"><XCircle className="w-3 h-3" /> Cancelada</span>
      case "EMITIDA":
        return <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs bg-cyan-500/10 text-cyan-500 border border-cyan-500/20"><FileText className="w-3 h-3" /> Emitida</span>
      case "USADA_PARCIALMENTE":
        return <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20"><Activity className="w-3 h-3" /> Parcial</span>
      case "USADA_COMPLETAMENTE":
        return <span className="flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"><CheckCircle className="w-3 h-3" /> Utilizada</span>
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground border border-border">{status}</span>
    }
  }

  if (!isAdminOrDoctor) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center p-6">
          <Card className="glass-card max-w-md p-8 text-center border-red-500/20">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4 animate-bounce" />
            <h1 className="text-xl font-bold text-foreground">Acceso Denegado</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Solo los usuarios con rol de <strong>ADMINISTRADOR</strong> o <strong>DOCTOR/PODÓLOGO</strong> tienen autorización para acceder a los expedientes y consultas clínicas.
            </p>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                Clínica de Podología
              </h1>
              <p className="text-muted-foreground mt-1">Expedientes clínicos, consultas SOAP, programación de citas y recetas médicas</p>
            </div>
            
            {activeTab === "citas" && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowCitaModal(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Programar Cita
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const clientName = window.prompt("Ingresa el nombre del paciente para búsqueda rápida:")
                    if (!clientName) return
                    const found = clientes.find(c => c.nombreCompleto.toLowerCase().includes(clientName.toLowerCase()))
                    if (found) {
                      startDirectConsultation(found)
                    } else {
                      toast.error("Paciente no encontrado. Primero regístralo en el módulo de Clientes.")
                    }
                  }}
                >
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Consulta Sin Cita
                </Button>
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-border pb-px">
            {[
              { id: "citas", label: "Citas Podológicas", icon: Calendar },
              { id: "consultas", label: "Historial Clínico (SOAP)", icon: ClipboardList },
              { id: "recetas", label: "Recetas Emitidas", icon: FileText }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id as Tab)
                  setSearchQuery("")
                }}
                className={`flex items-center gap-2 px-5 py-3 border-b-2 font-medium text-sm transition-all duration-200 -mb-px ${
                  activeTab === tab.id
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          {!showSOAPForm && (
            <div className="relative mb-6 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={
                  activeTab === "citas" ? "Buscar cita por paciente..." :
                  activeTab === "recetas" ? "Buscar por código de receta o paciente..." :
                  "Buscar consulta por paciente o contenido..."
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-muted/30 border-border shadow-inner"
              />
            </div>
          )}

          {/* LOADING STATE */}
          {loading && !showSOAPForm ? (
            <Card className="glass-card p-8">
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            </Card>
          ) : (
            <>
              {/* SOAP CONSULTATION FORM EDIT */}
              {showSOAPForm && soapClient && (
                <Card className="glass-card p-6 border-primary/20 max-w-4xl mx-auto shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="flex items-center justify-between border-b border-border pb-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">Consulta Podológica Activa</h2>
                      <p className="text-sm text-muted-foreground">Paciente: <strong className="text-foreground">{soapClient.nombreCompleto}</strong> {soapClient.cedula ? `| Cédula: ${soapClient.cedula}` : ""}</p>
                    </div>
                    <Button variant="ghost" onClick={() => setShowSOAPForm(false)} className="text-muted-foreground hover:text-foreground">
                      Cancelar
                    </Button>
                  </div>

                  <form onSubmit={handleSaveConsultation} className="space-y-6">
                    {/* SOAP Textareas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Subjetivo (S) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={soapForm.subjetivo}
                          onChange={(e) => setSoapForm({ ...soapForm, subjetivo: e.target.value })}
                          placeholder="Motivo de consulta, síntomas reportados por el paciente, dolor, historial médico podológico..."
                          className="w-full h-32 rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Objetivo (O) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={soapForm.objetivo}
                          onChange={(e) => setSoapForm({ ...soapForm, objetivo: e.target.value })}
                          placeholder="Examen físico, inspección visual, hiperqueratosis, dermatofitosis, onicomicosis, estado circulatorio..."
                          className="w-full h-32 rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Análisis / Diagnóstico (A) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={soapForm.analisis}
                          onChange={(e) => setSoapForm({ ...soapForm, analisis: e.target.value })}
                          placeholder="Diagnóstico podológico, evaluación del progreso, gravedad de las patologías detectadas..."
                          className="w-full h-32 rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                          Plan Clínico (P) <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          required
                          value={soapForm.plan}
                          onChange={(e) => setSoapForm({ ...soapForm, plan: e.target.value })}
                          placeholder="Tratamiento realizado, recomendaciones en el hogar, derivaciones, próxima cita clínica..."
                          className="w-full h-32 rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:ring-2 focus:ring-primary/50 focus:outline-none resize-none"
                        />
                      </div>
                    </div>

                    {/* Diagnósticos y Tratamientos Clínicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 border-t border-border pt-4">
                      {/* Diagnósticos */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Diagnósticos Asociados
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowQuickDx(!showQuickDx)}
                            className="text-xs text-primary hover:underline"
                          >
                            {showQuickDx ? "Cerrar" : "+ Crear Diagnóstico Rápido"}
                          </button>
                        </div>

                        {showQuickDx ? (
                          <div className="p-3 border border-border bg-muted/10 rounded-lg space-y-2.5">
                            <h4 className="text-xs font-bold text-foreground">Nuevo Diagnóstico</h4>
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                placeholder="Nombre (ej: Onicomicosis)"
                                value={quickDxNombre}
                                onChange={(e) => setQuickDxNombre(e.target.value)}
                                className="bg-background text-xs h-8"
                              />
                              <Input
                                placeholder="Código CIE-10 (ej: B35.1)"
                                value={quickDxCodigo}
                                onChange={(e) => setQuickDxCodigo(e.target.value)}
                                className="bg-background text-xs h-8"
                              />
                            </div>
                            <Input
                              placeholder="Descripción opcional..."
                              value={quickDxDesc}
                              onChange={(e) => setQuickDxDesc(e.target.value)}
                              className="bg-background text-xs h-8"
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                type="button"
                                variant="ghost"
                                onClick={() => setShowQuickDx(false)}
                                className="text-xs h-7"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                disabled={dxLoading}
                                onClick={handleCreateQuickDx}
                                className="text-xs h-7 bg-primary text-primary-foreground"
                              >
                                {dxLoading ? "Creando..." : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const id = parseInt(e.target.value)
                                if (id && !selectedDiagnosticos.includes(id)) {
                                  setSelectedDiagnosticos([...selectedDiagnosticos, id])
                                }
                              }}
                              className="w-full rounded-lg border border-border px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Seleccionar diagnóstico...</option>
                              {diagnosticosList.map(d => (
                                <option key={d.id} value={d.id}>
                                  {d.codigo ? `[${d.codigo}] ` : ""}{d.nombre}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedDiagnosticos.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Ningún diagnóstico seleccionado</span>
                          )}
                          {selectedDiagnosticos.map(id => {
                            const dx = diagnosticosList.find(d => d.id === id)
                            if (!dx) return null
                            return (
                              <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary border border-primary/20">
                                {dx.codigo ? `[${dx.codigo}] ` : ""}{dx.nombre}
                                <button
                                  type="button"
                                  onClick={() => setSelectedDiagnosticos(selectedDiagnosticos.filter(x => x !== id))}
                                  className="text-primary hover:text-red-500 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            )
                          })}
                        </div>
                      </div>

                      {/* Tratamientos */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            Tratamientos Aplicados
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowQuickTx(!showQuickTx)}
                            className="text-xs text-primary hover:underline"
                          >
                            {showQuickTx ? "Cerrar" : "+ Crear Tratamiento Rápido"}
                          </button>
                        </div>

                        {showQuickTx ? (
                          <div className="p-3 border border-border bg-muted/10 rounded-lg space-y-2.5">
                            <h4 className="text-xs font-bold text-foreground">Nuevo Tratamiento</h4>
                            <Input
                              placeholder="Nombre (ej: Quiropodia Básica)"
                              value={quickTxNombre}
                              onChange={(e) => setQuickTxNombre(e.target.value)}
                              className="bg-background text-xs h-8"
                            />
                            <Input
                              placeholder="Descripción opcional..."
                              value={quickTxDesc}
                              onChange={(e) => setQuickTxDesc(e.target.value)}
                              className="bg-background text-xs h-8"
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                type="button"
                                variant="ghost"
                                onClick={() => setShowQuickTx(false)}
                                className="text-xs h-7"
                              >
                                Cancelar
                              </Button>
                              <Button
                                size="sm"
                                type="button"
                                disabled={txLoading}
                                onClick={handleCreateQuickTx}
                                className="text-xs h-7 bg-primary text-primary-foreground"
                              >
                                {txLoading ? "Creando..." : "Guardar"}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <select
                              value=""
                              onChange={(e) => {
                                const id = parseInt(e.target.value)
                                if (id && !selectedTratamientos.includes(id)) {
                                  setSelectedTratamientos([...selectedTratamientos, id])
                                }
                              }}
                              className="w-full rounded-lg border border-border px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Seleccionar tratamiento...</option>
                              {tratamientosList.map(t => (
                                <option key={t.id} value={t.id}>{t.nombre}</option>
                              ))}
                            </select>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {selectedTratamientos.length === 0 && (
                            <span className="text-xs text-muted-foreground italic">Ningún tratamiento seleccionado</span>
                          )}
                          {selectedTratamientos.map(id => {
                            const tx = tratamientosList.find(t => t.id === id)
                            if (!tx) return null
                            return (
                              <span key={id} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                                {tx.nombre}
                                <button
                                  type="button"
                                  onClick={() => setSelectedTratamientos(selectedTratamientos.filter(x => x !== id))}
                                  className="text-blue-500 hover:text-red-500 transition-colors"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                </button>
                              </span>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Materiales / Insumos Consumidos (Inventario) */}
                    <div className="border-t border-border pt-4 space-y-3">
                      <div>
                        <span className="text-sm font-bold text-foreground">Materiales / Insumos Consumidos</span>
                        <p className="text-xs text-muted-foreground">Selecciona insumos físicos utilizados durante la sesión para descontar automáticamente de stock</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <select
                          value={selectedInsumoId}
                          onChange={(e) => setSelectedInsumoId(e.target.value)}
                          className="rounded-lg border border-border px-3 py-2 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="">Seleccionar producto físico...</option>
                          {productos.filter(p => !p.esServicio).map(p => (
                            <option key={p.id} value={p.id}>
                              {p.nombre} (Stock: {p.stockTotal ?? 0})
                            </option>
                          ))}
                        </select>

                        <div className="flex gap-2">
                          <Input
                            type="number"
                            min="1"
                            value={insumoCantidad}
                            onChange={(e) => setInsumoCantidad(e.target.value)}
                            placeholder="Cantidad"
                            className="bg-background border-border text-xs text-foreground h-9"
                          />
                          <Button
                            type="button"
                            onClick={() => {
                              if (!selectedInsumoId) {
                                toast.error("Selecciona un insumo")
                                return
                              }
                              const prod = productos.find(p => p.id === parseInt(selectedInsumoId))
                              if (!prod) return
                              const qty = parseInt(insumoCantidad)
                              if (isNaN(qty) || qty <= 0) {
                                toast.error("Cantidad inválida")
                                return
                              }
                              const stockVal = prod.stockTotal ?? 0
                              if (stockVal < qty) {
                                toast.error(`Stock insuficiente. Solo hay ${stockVal} disponibles.`)
                                return
                              }

                              const existenteIndex = selectedInsumos.findIndex(i => i.idProducto === prod.id)
                              if (existenteIndex > -1) {
                                const nuevaCant = selectedInsumos[existenteIndex].cantidad + qty
                                if (stockVal < nuevaCant) {
                                  toast.error(`No puedes agregar más. El stock total es ${stockVal}.`)
                                  return
                                }
                                const actualizados = [...selectedInsumos]
                                actualizados[existenteIndex].cantidad = nuevaCant
                                setSelectedInsumos(actualizados)
                              } else {
                                setSelectedInsumos([
                                  ...selectedInsumos,
                                  {
                                    idProducto: prod.id,
                                    nombreProducto: prod.nombre,
                                    cantidad: qty,
                                    stockActual: stockVal
                                  }
                                ])
                              }
                              setSelectedInsumoId("")
                              setInsumoCantidad("1")
                            }}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-9"
                          >
                            Agregar
                          </Button>
                        </div>
                      </div>

                      {selectedInsumos.length > 0 && (
                        <div className="border border-border rounded-lg overflow-hidden bg-background max-w-xl">
                          <table className="w-full text-xs">
                            <thead className="bg-muted/40 border-b border-border">
                              <tr>
                                <th className="px-3 py-1.5 text-left text-xs font-bold text-muted-foreground uppercase">Material</th>
                                <th className="px-3 py-1.5 text-center text-xs font-bold text-muted-foreground uppercase w-20">Cant.</th>
                                <th className="px-3 py-1.5 text-center text-xs font-bold text-muted-foreground uppercase w-16">Acción</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {selectedInsumos.map(item => (
                                <tr key={item.idProducto} className="hover:bg-muted/5">
                                  <td className="px-3 py-2 font-medium text-foreground text-xs">{item.nombreProducto}</td>
                                  <td className="px-3 py-2 text-center text-foreground font-semibold text-xs">{item.cantidad}</td>
                                  <td className="px-3 py-2 text-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedInsumos(selectedInsumos.filter(i => i.idProducto !== item.idProducto))}
                                      className="text-red-400 hover:text-red-300"
                                    >
                                      <Trash className="w-3.5 h-3.5 mx-auto" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* Prescription Section Toggle */}
                    <div className="border-t border-border pt-4">

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emitReceta}
                          onChange={(e) => setEmitReceta(e.target.checked)}
                          className="w-4.5 h-4.5 rounded border-border text-primary focus:ring-primary"
                        />
                        <div>
                          <span className="text-sm font-bold text-foreground">Emitir Receta Médica / Recomendación Clinica</span>
                          <p className="text-xs text-muted-foreground">Permite ligar medicamentos podológicos y servicios para facturación integrada en caja</p>
                        </div>
                      </label>
                    </div>

                    {/* PRESCRIPTION SUB-FORM */}
                    {emitReceta && (
                      <div className="bg-muted/15 border border-border rounded-xl p-5 space-y-4 animate-in slide-in-from-top-4 duration-300">
                        <h3 className="text-sm font-bold text-foreground border-b border-border pb-2">Detalles de la Receta</h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de Vencimiento de Receta</label>
                            <Input
                              type="date"
                              value={recetaForm.fechaVencimiento}
                              onChange={(e) => setRecetaForm({ ...recetaForm, fechaVencimiento: e.target.value })}
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Observaciones Generales</label>
                            <Input
                              type="text"
                              value={recetaForm.observaciones}
                              onChange={(e) => setRecetaForm({ ...recetaForm, observaciones: e.target.value })}
                              placeholder="Ej: Lavar los pies y secar rigurosamente antes de aplicar las cremas..."
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                        </div>

                        {/* Add items to Prescription */}
                        <div className="border-t border-border/60 pt-4 space-y-3">
                          <h4 className="text-xs font-bold text-muted-foreground">Agregar Fármacos o Servicios Clínicos</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <select
                              value={selectedProdId}
                              onChange={(e) => setSelectedProdId(e.target.value)}
                              className="rounded-lg border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="">Selecciona fármaco / servicio...</option>
                              {productos.map(p => (
                                <option key={p.id} value={p.id}>
                                  {p.nombre} {p.esServicio ? "(Servicio Clinico)" : `(Stock: ${p.stockTotal ?? 0} u)`} — C${Number(p.precioVenta).toFixed(2)}
                                </option>
                              ))}
                            </select>

                            <Input
                              type="number"
                              min="1"
                              value={prodCantidad}
                              onChange={(e) => setProdCantidad(e.target.value)}
                              placeholder="Cantidad"
                              className="bg-background border-border text-foreground"
                            />

                            <Input
                              type="text"
                              value={prodIndicaciones}
                              onChange={(e) => setProdIndicaciones(e.target.value)}
                              placeholder="Indicaciones (ej: Aplicar cada 12 horas por 10 días)"
                              className="bg-background border-border text-foreground"
                            />
                          </div>
                          <div className="flex justify-end">
                            <Button type="button" size="sm" onClick={addRecetaItem} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/25">
                              <Plus className="w-3.5 h-3.5 mr-1" /> Agregar a Receta
                            </Button>
                          </div>
                        </div>

                        {/* Prescription Items Table */}
                        {recetaDetalles.length > 0 && (
                          <div className="border border-border rounded-lg overflow-hidden bg-background">
                            <table className="w-full text-sm">
                              <thead className="bg-muted/40 border-b border-border">
                                <tr>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground uppercase">Item</th>
                                  <th className="px-4 py-2 text-center text-xs font-bold text-muted-foreground uppercase w-20">Cant.</th>
                                  <th className="px-4 py-2 text-left text-xs font-bold text-muted-foreground uppercase">Indicaciones</th>
                                  <th className="px-4 py-2 text-center text-xs font-bold text-muted-foreground uppercase w-16">Acciones</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border">
                                {recetaDetalles.map(item => (
                                  <tr key={item.idProducto} className="hover:bg-muted/5">
                                    <td className="px-4 py-2.5 font-medium text-foreground">{item.nombreProducto}</td>
                                    <td className="px-4 py-2.5 text-center text-foreground font-semibold">{item.cantidad}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{item.indicaciones || "Ninguna"}</td>
                                    <td className="px-4 py-2.5 text-center">
                                      <button type="button" onClick={() => removeRecetaItem(item.idProducto)} className="text-red-400 hover:text-red-300">
                                        <Trash className="w-4 h-4 mx-auto" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4 border-t border-border justify-end">
                      <Button type="button" variant="outline" onClick={() => setShowSOAPForm(false)}>
                        Cancelar
                      </Button>
                      <Button
                        type="submit"
                        disabled={soapSubmitLoading}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                      >
                        {soapSubmitLoading ? "Guardando..." : "Finalizar y Guardar Consulta"}
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* ═══ TAB: CITAS CLÍNICAS ═══ */}
              {activeTab === "citas" && !showSOAPForm && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Fecha y Hora", "Paciente", "Cédula", "Motivo", "Estado", "Atención", "Acciones"].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredCitas.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30 animate-bounce" />
                              No hay citas programadas
                            </td>
                          </tr>
                        ) : filteredCitas.map(cita => (
                          <tr key={cita.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3.5 text-sm font-semibold text-foreground">
                              {new Date(cita.fecha).toLocaleString("es-NI", {
                                year: "numeric", month: "short", day: "numeric",
                                hour: "2-digit", minute: "2-digit"
                              })}
                            </td>
                            <td className="px-5 py-3.5 text-sm font-medium text-foreground">{cita.cliente.nombreCompleto}</td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">{cita.cliente.cedula || "—"}</td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground max-w-[200px] truncate">{cita.motivo || "Consulta de rutina"}</td>
                            <td className="px-5 py-3.5">{getStatusBadge(cita.estado)}</td>
                            <td className="px-5 py-3.5">
                              {cita.atencion ? (
                                <span className="text-xs text-emerald-500 font-medium">SOAP Registrado</span>
                              ) : cita.estado === "CANCELADA" ? (
                                <span className="text-xs text-muted-foreground">—</span>
                              ) : (
                                <span className="text-xs text-amber-500 font-medium">Pendiente</span>
                              )}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-2">
                                {cita.estado === "PENDIENTE" && !cita.atencion && (
                                  <>
                                    <Button
                                      size="sm"
                                      onClick={() => startConsultation(cita)}
                                      className="bg-primary hover:bg-primary/95 text-primary-foreground h-8 text-xs font-semibold"
                                    >
                                      Atender
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUpdateCitaEstado(cita.id, "CANCELADA")}
                                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs"
                                    >
                                      Cancelar
                                    </Button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}

              {/* ═══ TAB: HISTORIAL CLÍNICO (SOAP) ═══ */}
              {activeTab === "consultas" && !showSOAPForm && (
                <div className="space-y-4">
                  {filteredAtenciones.length === 0 ? (
                    <Card className="glass-card p-12 text-center text-muted-foreground">
                      <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      No hay registros en el historial clínico
                    </Card>
                  ) : (
                    filteredAtenciones.map(at => (
                      <Card key={at.id} className="glass-card p-5 space-y-4 hover:border-primary/20 transition-all">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-3">
                          <div>
                            <h3 className="font-bold text-foreground text-base">{at.cliente.nombreCompleto}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Atendido por: <strong>{at.usuario.nombreCompleto}</strong> — {new Date(at.fecha).toLocaleString("es-NI")}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            {at.receta && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePrintReceta(at.receta)}
                                className="h-8 text-xs border-primary/20 text-primary hover:bg-primary/10"
                              >
                                <Printer className="w-3.5 h-3.5 mr-1" /> Imprimir Receta
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedConsulta(at)}
                              className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> Ver Completo
                            </Button>
                          </div>
                        </div>

                        {/* SOAP Preview */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
                          <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Subjetivo (S)</span>
                            <p className="text-foreground text-xs line-clamp-3">{at.subjetivo}</p>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Objetivo (O)</span>
                            <p className="text-foreground text-xs line-clamp-3">{at.objetivo}</p>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Análisis (A)</span>
                            <p className="text-foreground text-xs line-clamp-3">{at.analisis}</p>
                          </div>
                          <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                            <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Plan (P)</span>
                            <p className="text-foreground text-xs line-clamp-3">{at.plan}</p>
                          </div>
                        </div>

                        {/* Diagnósticos, Tratamientos e Insumos en la lista */}
                        {(at.diagnosticos?.length > 0 || at.tratamientos?.length > 0 || at.insumos?.length > 0) && (
                          <div className="flex flex-wrap gap-1.5 pt-3 border-t border-border/50 text-[11px] items-center">
                            {at.diagnosticos?.map((d: any) => (
                              <span key={d.idDiagnostico} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {d.diagnostico.codigo ? `[${d.diagnostico.codigo}] ` : ""}{d.diagnostico.nombre}
                              </span>
                            ))}
                            {at.tratamientos?.map((t: any) => (
                              <span key={t.idTratamiento} className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                {t.tratamiento.nombre}
                              </span>
                            ))}
                            {at.insumos?.map((i: any) => (
                              <span key={i.id} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
                                Insumo: {i.producto.nombre} (x{i.cantidad})
                              </span>
                            ))}
                          </div>
                        )}
                      </Card>

                    ))
                  )}
                </div>
              )}

              {/* ═══ TAB: RECETAS EMITIDAS ═══ */}
              {activeTab === "recetas" && !showSOAPForm && (
                <Card className="glass-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/30 border-b border-border">
                        <tr>
                          {["Código Receta", "Paciente", "Fecha Emisión", "Vencimiento", "Estado", "Artículos", "Acciones"].map(h => (
                            <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {filteredRecetas.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30" />
                              No hay recetas emitidas
                            </td>
                          </tr>
                        ) : filteredRecetas.map(rec => (
                          <tr key={rec.id} className="hover:bg-muted/20 transition-colors">
                            <td className="px-5 py-3.5 text-sm font-mono font-bold text-primary">{rec.codigoReceta}</td>
                            <td className="px-5 py-3.5 text-sm font-medium text-foreground">{rec.cliente.nombreCompleto}</td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              {new Date(rec.createdAt).toLocaleDateString("es-NI")}
                            </td>
                            <td className="px-5 py-3.5 text-xs text-muted-foreground">
                              {rec.fechaVencimiento ? new Date(rec.fechaVencimiento).toLocaleDateString("es-NI") : "No vence"}
                            </td>
                            <td className="px-5 py-3.5">{getStatusBadge(rec.estado)}</td>
                            <td className="px-5 py-3.5 text-xs text-foreground font-semibold">
                              {rec.detalles.length} items
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handlePrintReceta(rec)}
                                  className="h-8 text-xs"
                                >
                                  Imprimir
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </main>

      {/* MODAL PROGRAMAR CITA */}
      {showCitaModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-md p-6 relative shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowCitaModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="mb-5 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">Programar Cita Podológica</h2>
                <p className="text-xs text-muted-foreground">Asigna una cita al calendario clínico</p>
              </div>
            </div>

            <form onSubmit={handleCreateCita} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">
                  Paciente <span className="text-red-500">*</span>
                </label>
                <select
                  value={citaForm.idCliente}
                  onChange={e => setCitaForm({ ...citaForm, idCliente: e.target.value })}
                  required
                  className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Selecciona un paciente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombreCompleto} {c.cedula ? `(${c.cedula})` : ""}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Fecha <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    required
                    value={citaForm.fecha}
                    onChange={e => setCitaForm({ ...citaForm, fecha: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground/80 mb-1">
                    Hora <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="time"
                    required
                    value={citaForm.hora}
                    onChange={e => setCitaForm({ ...citaForm, hora: e.target.value })}
                    className="bg-background border-border text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1">Motivo o Notas</label>
                <textarea
                  value={citaForm.motivo}
                  onChange={e => setCitaForm({ ...citaForm, motivo: e.target.value })}
                  placeholder="Detalles sobre el padecimiento, ej: Uña encarnada severa en pie derecho..."
                  className="w-full rounded-md border border-border px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-h-[70px] resize-none"
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowCitaModal(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={citaSubmitLoading}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {citaSubmitLoading ? "Programando..." : "Programar Cita"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* DETAIL DIALOG MODAL (VIEW COMPLETED CONSULTATION) */}
      {selectedConsulta && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-2xl p-6 relative max-h-[90vh] flex flex-col shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto">
            <button
              onClick={() => setSelectedConsulta(null)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="border-b border-border pb-4 mb-5">
              <h2 className="text-xl font-bold text-foreground">Expediente Clínico Podológico</h2>
              <p className="text-xs text-muted-foreground">
                Paciente: <strong className="text-foreground">{selectedConsulta.cliente.nombreCompleto}</strong> — {new Date(selectedConsulta.fecha).toLocaleString("es-NI")}
              </p>
            </div>

            <div className="space-y-4 text-sm flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Subjetivo (S)</span>
                  <p className="text-foreground text-xs whitespace-pre-line">{selectedConsulta.subjetivo}</p>
                </div>
                <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Objetivo (O)</span>
                  <p className="text-foreground text-xs whitespace-pre-line">{selectedConsulta.objetivo}</p>
                </div>
                <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Análisis / Diagnóstico (A)</span>
                  <p className="text-foreground text-xs whitespace-pre-line">{selectedConsulta.analisis}</p>
                </div>
                <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Plan Clínico (P)</span>
                  <p className="text-foreground text-xs whitespace-pre-line">{selectedConsulta.plan}</p>
                </div>
              </div>

              {/* Diagnósticos y Tratamientos en Vista Detalle */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Diagnósticos de esta Consulta</span>
                  {selectedConsulta.diagnosticos?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedConsulta.diagnosticos.map((d: any) => (
                        <span key={d.idDiagnostico} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs border border-primary/20 font-medium">
                          {d.diagnostico.codigo ? `[${d.diagnostico.codigo}] ` : ""}{d.diagnostico.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Ningún diagnóstico asociado</p>
                  )}
                </div>

                <div className="p-3 bg-muted/10 border border-border/50 rounded-lg">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Tratamientos Aplicados</span>
                  {selectedConsulta.tratamientos?.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {selectedConsulta.tratamientos.map((t: any) => (
                        <span key={t.idTratamiento} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs border border-blue-500/20 font-medium">
                          {t.tratamiento.nombre}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">Ningún tratamiento asociado</p>
                  )}
                </div>
              </div>

              {/* Insumos Consumidos en Vista Detalle */}
              {selectedConsulta.insumos?.length > 0 && (
                <div className="border border-border rounded-xl p-4 bg-muted/5">
                  <div className="border-b border-border/60 pb-2 mb-3">
                    <span className="text-xs font-bold text-foreground">Insumos y Materiales Consumidos de Farmacia</span>
                  </div>
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/60">
                        <th className="pb-1.5 font-bold uppercase">Material</th>
                        <th className="pb-1.5 font-bold uppercase text-center w-20">Cant. Consumida</th>
                        <th className="pb-1.5 font-bold uppercase">Unidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedConsulta.insumos.map((i: any) => (
                        <tr key={i.id} className="border-b border-border/40 text-foreground">
                          <td className="py-2">{i.producto.nombre}</td>
                          <td className="py-2 text-center font-bold">{i.cantidad}</td>
                          <td className="py-2 text-muted-foreground">{i.producto.unidadMedida || "unidad"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {selectedConsulta.receta && (
                <div className="mt-4 border border-border rounded-xl p-4 bg-muted/5">
                  <div className="flex justify-between items-center border-b border-border/60 pb-2 mb-3">
                    <span className="text-xs font-bold text-foreground font-mono">Receta: {selectedConsulta.receta.codigoReceta}</span>
                    {getStatusBadge(selectedConsulta.receta.estado)}
                  </div>

                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="text-muted-foreground border-b border-border/60">
                        <th className="pb-1.5 font-bold uppercase">Item</th>
                        <th className="pb-1.5 font-bold uppercase text-center w-16">Cant.</th>
                        <th className="pb-1.5 font-bold uppercase">Indicaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedConsulta.receta.detalles.map((d: any) => (
                        <tr key={d.id} className="border-b border-border/40 text-foreground">
                          <td className="py-2">{d.producto.nombre}</td>
                          <td className="py-2 text-center font-bold">{d.cantidad}</td>
                          <td className="py-2 text-muted-foreground">{d.indicaciones || "Ninguna"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t border-border mt-5 justify-end">
              {selectedConsulta.receta && (
                <Button
                  onClick={() => handlePrintReceta(selectedConsulta.receta)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  <Printer className="w-4 h-4 mr-2" /> Imprimir Receta
                </Button>
              )}
              <Button variant="outline" onClick={() => setSelectedConsulta(null)}>
                Cerrar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
