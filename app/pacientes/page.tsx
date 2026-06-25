"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Plus,
  Edit2,
  Trash2,
  Heart,
  Search,
  Calendar,
  User,
  ShieldAlert,
  BookOpen,
  FileText,
  Download,
  Eye,
  Activity,
  Upload,
  UserCheck,
  XCircle,
  Clock,
  CheckCircle,
  Printer,
  ClipboardList
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { clienteSchema } from "@/lib/validations"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"
import { useRouter } from "next/navigation"

interface DatosClinicos {
  antecedentes: string | null
  alergias: string | null
  observacionesClinicas: string | null
  diagnosticoGeneral: string | null
}

interface Examen {
  id: number
  idPaciente: number
  nombre: string
  tipo: "LABORATORIO" | "IMAGEN" | "FUNCIONAL" | "BIOPSIA" | "OTRO"
  fechaExamen: string
  resultado: string | null
  interpretacion: string | null
  observaciones: string | null
  archivoUrl: string | null
  archivoNombre: string | null
  archivoTipo: string | null
  registradoPor: number
  registrador?: {
    id: number
    nombreCompleto: string
  }
  createdAt: string
}

interface Paciente {
  id: number
  nombreCompleto: string
  cedula: string | null
  telefono: string | null
  correo: string | null
  direccion: string | null
  sexo: string | null
  fechaNacimiento: string | null
  activo: boolean
  tipoPerfil: "FARMACIA" | "CLINICA" | "AMBOS"
  datosClinicos?: DatosClinicos | null
  atenciones?: any[]
  recetas?: any[]
  examenes?: Examen[]
}

interface InitialExamenInput {
  tempId: number
  nombre: string
  tipo: "LABORATORIO" | "IMAGEN" | "FUNCIONAL" | "BIOPSIA" | "OTRO"
  fechaExamen: string
  resultado: string
  interpretacion: string
  observaciones: string
  file: File | null
}

export default function PacientesPage() {
  const router = useRouter()
  const { user: currentUser, loading: authLoading } = useCurrentUser()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  useEffect(() => {
    if (!authLoading && currentUser) {
      if (currentUser.rolNombre !== "ADMIN" && currentUser.rolNombre !== "DOCTOR") {
        router.push("/acceso-denegado")
      }
    }
  }, [currentUser, authLoading, router])

  // Tabs inside the form
  const [formTab, setFormTab] = useState<"personales" | "clinicos" | "examenes_iniciales">("personales")

  // State for initial exams in creation form
  const [initialExams, setInitialExams] = useState<InitialExamenInput[]>([])

  const [formData, setFormData] = useState({
    nombreCompleto: "",
    cedula: "",
    telefono: "",
    correo: "",
    direccion: "",
    sexo: "",
    fechaNacimiento: "",
    tipoPerfil: "CLINICA" as "CLINICA" | "AMBOS",
    datosClinicos: {
      tipoSangre: "",
      antecedentes: "",
      alergias: "",
      observacionesClinicas: "",
      diagnosticoGeneral: "",
    }
  })

  // Patient Detail/Clinical Record Modal State
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [detailTab, setDetailTab] = useState<" soap" | "recetas" | "examenes">("examenes")
  const [detailModalLoading, setDetailModalLoading] = useState(false)

  // Exam Filtering inside Detail Modal
  const [examSearch, setExamSearch] = useState("")
  const [examTypeFilter, setExamTypeFilter] = useState("")
  const [examDateDesde, setExamDateDesde] = useState("")
  const [examDateHasta, setExamDateHasta] = useState("")

  // Exam Creation/Editing Sub-Modal State (inside Patient Detail view)
  const [showExamSubModal, setShowExamSubModal] = useState(false)
  const [editingExamId, setEditingExamId] = useState<number | null>(null)
  const [examForm, setExamForm] = useState({
    nombre: "",
    tipo: "LABORATORIO" as "LABORATORIO" | "IMAGEN" | "FUNCIONAL" | "BIOPSIA" | "OTRO",
    fechaExamen: "",
    resultado: "",
    interpretacion: "",
    observaciones: "",
  })
  const [examFile, setExamFile] = useState<File | null>(null)
  const [examSubmitLoading, setExamSubmitLoading] = useState(false)

  const isUserAdmin = currentUser?.rolNombre === "ADMIN"

  useEffect(() => {
    fetchPacientes()
  }, [])

  const fetchPacientes = async () => {
    try {
      const res = await fetch("/api/pacientes?estado=todos")
      const data = await res.json()
      setPacientes(data || [])
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error al cargar pacientes")
    } finally {
      setLoading(false)
    }
  }

  const fetchPacienteDetail = async (id: number) => {
    setDetailModalLoading(true)
    try {
      const res = await fetch(`/api/pacientes/${id}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedPaciente(data)
      } else {
        toast.error("No se pudo cargar el expediente detallado")
      }
    } catch (error) {
      console.error("Error fetching patient details:", error)
      toast.error("Error de conexión al cargar expediente")
    } finally {
      setDetailModalLoading(false)
    }
  }

  // Handle patient creation/update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validar usando Zod
    const personalData = {
      nombreCompleto: formData.nombreCompleto,
      cedula: formData.cedula,
      telefono: formData.telefono,
      correo: formData.correo,
      direccion: formData.direccion,
      sexo: formData.sexo || null,
      fechaNacimiento: formData.fechaNacimiento || null,
      tipoPerfil: formData.tipoPerfil,
    }

    const validation = clienteSchema.safeParse(personalData)

    if (!validation.success) {
      setFormTab("personales")
      validation.error.issues.forEach((err: any) => {
        toast.error(err.message)
      })
      return
    }

    try {
      const url = editingId ? `/api/pacientes/${editingId}` : "/api/pacientes"
      const method = editingId ? "PUT" : "POST"

      const payload = {
        ...personalData,
        datosClinicos: formData.datosClinicos,
        // Enviar datos de exámenes iniciales (excluyendo el archivo para JSON)
        examenes: editingId ? undefined : initialExams.map(ex => ({
          nombre: ex.nombre,
          tipo: ex.tipo,
          fechaExamen: ex.fechaExamen,
          resultado: ex.resultado,
          interpretacion: ex.interpretacion,
          observaciones: ex.observaciones,
        }))
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (res.ok) {
        // Si es creación y hay archivos adjuntos en los exámenes iniciales, subirlos secuencialmente
        if (!editingId && data.id && initialExams.some(ex => ex.file !== null)) {
          // Consultar exámenes creados del paciente para emparejar
          const examenesRes = await fetch(`/api/clinica/examenes?idPaciente=${data.id}`)
          if (examenesRes.ok) {
            const creados: Examen[] = await examenesRes.json()
            // Emparejar por nombre y tipo
            for (const exInput of initialExams) {
              if (exInput.file) {
                const creado = creados.find(
                  c => c.nombre === exInput.nombre && c.tipo === exInput.tipo
                )
                if (creado) {
                  const fd = new FormData()
                  fd.append("file", exInput.file)
                  await fetch(`/api/clinica/examenes/${creado.id}/archivo`, {
                    method: "POST",
                    body: fd,
                  })
                }
              }
            }
          }
        }

        toast.success(editingId ? "Paciente clínico actualizado" : "Paciente clínico registrado exitosamente")
        resetForm()
        setShowForm(false)
        fetchPacientes()
      } else {
        toast.error(data.error || "Error al guardar el paciente")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión al guardar")
    }
  }

  const resetForm = () => {
    setEditingId(null)
    setFormTab("personales")
    setInitialExams([])
    setFormData({
      nombreCompleto: "",
      cedula: "",
      telefono: "",
      correo: "",
      direccion: "",
      sexo: "",
      fechaNacimiento: "",
      tipoPerfil: "CLINICA",
      datosClinicos: {
        tipoSangre: "",
        antecedentes: "",
        alergias: "",
        observacionesClinicas: "",
        diagnosticoGeneral: "",
      }
    })
  }

  const handleOpenCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const handleEdit = (paciente: Paciente) => {
    setEditingId(paciente.id)
    setFormTab("personales")

    let formattedDate = ""
    if (paciente.fechaNacimiento) {
      formattedDate = new Date(paciente.fechaNacimiento).toISOString().split("T")[0]
    }

    setFormData({
      nombreCompleto: paciente.nombreCompleto,
      cedula: paciente.cedula || "",
      telefono: paciente.telefono || "",
      correo: paciente.correo || "",
      direccion: paciente.direccion || "",
      sexo: paciente.sexo || "",
      fechaNacimiento: formattedDate,
      tipoPerfil: paciente.tipoPerfil === "AMBOS" ? "AMBOS" : "CLINICA",
      datosClinicos: {
        tipoSangre: paciente.datosClinicos?.tipoSangre || "",
        antecedentes: paciente.datosClinicos?.antecedentes || "",
        alergias: paciente.datosClinicos?.alergias || "",
        observacionesClinicas: paciente.datosClinicos?.observacionesClinicas || "",
        diagnosticoGeneral: paciente.datosClinicos?.diagnosticoGeneral || "",
      }
    })
    setShowForm(true)
  }

  const handleToggleActivo = async (paciente: Paciente) => {
    const accion = paciente.activo ? "desactivar" : "reactivar"
    const ok = window.confirm(`¿Seguro que deseas ${accion} al paciente "${paciente.nombreCompleto}"?`)
    if (!ok) return
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !paciente.activo })
      })
      if (res.ok) {
        toast.success(`Paciente ${paciente.activo ? "desactivado" : "reactivado"}`)
        fetchPacientes()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo cambiar el estado")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    }
  }

  const handleHardDelete = async (paciente: Paciente) => {
    const ok = window.confirm(`¿Seguro que deseas ELIMINAR permanentemente al paciente "${paciente.nombreCompleto}"?\nEsta acción no se puede deshacer.`)
    if (!ok) return
    try {
      const res = await fetch(`/api/pacientes/${paciente.id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Paciente eliminado permanentemente")
        fetchPacientes()
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo eliminar el paciente")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    }
  }

  // --- Initial Exams Helper Methods ---
  const addInitialExamRow = () => {
    setInitialExams([
      ...initialExams,
      {
        tempId: Date.now(),
        nombre: "",
        tipo: "LABORATORIO",
        fechaExamen: new Date().toISOString().split("T")[0],
        resultado: "",
        interpretacion: "",
        observaciones: "",
        file: null,
      }
    ])
  }

  const removeInitialExamRow = (tempId: number) => {
    setInitialExams(initialExams.filter(ex => ex.tempId !== tempId))
  }

  const updateInitialExamRow = (tempId: number, field: string, value: any) => {
    setInitialExams(initialExams.map(ex => {
      if (ex.tempId === tempId) {
        return { ...ex, [field]: value }
      }
      return ex
    }))
  }

  // --- Patient Detail Modal: Exams Actions ---
  const handleOpenNewExam = () => {
    setEditingExamId(null)
    setExamForm({
      nombre: "",
      tipo: "LABORATORIO",
      fechaExamen: new Date().toISOString().split("T")[0],
      resultado: "",
      interpretacion: "",
      observaciones: "",
    })
    setExamFile(null)
    setShowExamSubModal(true)
  }

  const handleOpenEditExam = (exam: Examen) => {
    setEditingExamId(exam.id)
    setExamForm({
      nombre: exam.nombre,
      tipo: exam.tipo,
      fechaExamen: new Date(exam.fechaExamen).toISOString().split("T")[0],
      resultado: exam.resultado || "",
      interpretacion: exam.interpretacion || "",
      observaciones: exam.observaciones || "",
    })
    setExamFile(null)
    setShowExamSubModal(true)
  }

  const handleSubmitExam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPaciente) return

    if (!examForm.nombre || !examForm.tipo || !examForm.fechaExamen) {
      toast.error("Completa todos los campos obligatorios")
      return
    }

    setExamSubmitLoading(true)
    try {
      const url = editingExamId ? `/api/clinica/examenes/${editingExamId}` : "/api/clinica/examenes"
      const method = editingExamId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idPaciente: selectedPaciente.id,
          ...examForm,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Error al guardar el examen")
        setExamSubmitLoading(false)
        return
      }

      const examId = editingExamId || data.id

      // Si se seleccionó un archivo, subirlo
      if (examFile) {
        const formDataFile = new FormData()
        formDataFile.append("file", examFile)

        const uploadRes = await fetch(`/api/clinica/examenes/${examId}/archivo`, {
          method: "POST",
          body: formDataFile,
        })

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json()
          toast.error(uploadData.error || "Examen guardado, pero falló la subida del archivo adjunto")
        }
      }

      toast.success(editingExamId ? "Examen actualizado correctamente" : "Examen registrado correctamente")
      setShowExamSubModal(false)
      fetchPacienteDetail(selectedPaciente.id)
    } catch (error) {
      console.error("Error saving exam:", error)
      toast.error("Error de conexión al guardar el examen")
    } finally {
      setExamSubmitLoading(false)
    }
  }

  const handleDeleteExam = async (examId: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar este examen clínico lógicamente?")) return

    try {
      const res = await fetch(`/api/clinica/examenes/${examId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Examen eliminado del expediente")
        if (selectedPaciente) fetchPacienteDetail(selectedPaciente.id)
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo eliminar el examen")
      }
    } catch (error) {
      console.error("Error deleting exam:", error)
      toast.error("Error de conexión")
    }
  }

  const handleDownloadAttachment = async (examId: number, fileName: string) => {
    try {
      const res = await fetch(`/api/clinica/examenes/${examId}/archivo`)
      if (!res.ok) {
        toast.error("No se pudo descargar el archivo")
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = fileName || "archivo_clinico"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success("Archivo descargado")
    } catch (error) {
      toast.error("Error al descargar archivo")
    }
  }

  const handleViewAttachment = async (examId: number) => {
    try {
      const res = await fetch(`/api/clinica/examenes/${examId}/archivo`)
      if (!res.ok) {
        toast.error("No se pudo visualizar el archivo")
        return
      }
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, "_blank")
    } catch (error) {
      toast.error("Error al abrir archivo")
    }
  }

  const handleDeleteAttachment = async (examId: number) => {
    if (!window.confirm("¿Seguro que deseas eliminar permanentemente el archivo adjunto de este examen?\nEsta acción es irreversible.")) return

    try {
      const res = await fetch(`/api/clinica/examenes/${examId}/archivo`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Archivo adjunto eliminado físicamente")
        if (selectedPaciente) fetchPacienteDetail(selectedPaciente.id)
      } else {
        const data = await res.json()
        toast.error(data.error || "No se pudo eliminar el archivo")
      }
    } catch (error) {
      console.error("Error deleting attachment:", error)
      toast.error("Error de conexión")
    }
  }

  // --- Print Receta ---
  const handlePrintReceta = (receta: any) => {
    if (!selectedPaciente) return
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
              <strong>Paciente:</strong> ${selectedPaciente.nombreCompleto}<br>
              <strong>Cédula:</strong> ${selectedPaciente.cedula || "N/A"}<br>
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

  // --- Filtering calculations ---
  const filteredPacientes = pacientes.filter((p) =>
    p.nombreCompleto.toLowerCase().includes(search.toLowerCase()) ||
    (p.cedula && p.cedula.toLowerCase().includes(search.toLowerCase()))
  )

  // Filter exams in the detail modal
  const filteredExamenes = (selectedPaciente?.examenes || []).filter(ex => {
    const matchesSearch = !examSearch || ex.nombre.toLowerCase().includes(examSearch.toLowerCase()) || (ex.resultado && ex.resultado.toLowerCase().includes(examSearch.toLowerCase()))
    const matchesType = !examTypeFilter || ex.tipo === examTypeFilter
    
    let matchesDesde = true
    if (examDateDesde) {
      matchesDesde = new Date(ex.fechaExamen) >= new Date(examDateDesde)
    }

    let matchesHasta = true
    if (examDateHasta) {
      const limit = new Date(examDateHasta)
      limit.setHours(23, 59, 59, 999)
      matchesHasta = new Date(ex.fechaExamen) <= limit
    }

    return matchesSearch && matchesType && matchesDesde && matchesHasta
  })

  // Age helper
  const calcularEdad = (fechaNacStr: string | null) => {
    if (!fechaNacStr) return "N/A"
    const birth = new Date(fechaNacStr)
    const today = new Date()
    let age = today.getFullYear() - birth.getFullYear()
    const m = today.getMonth() - birth.getMonth()
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--
    }
    return `${age} años`
  }

  // Badge Colors for Exam types
  const getExamTypeBadge = (tipo: string) => {
    switch (tipo) {
      case "LABORATORIO":
        return "bg-blue-500/10 text-blue-500 border border-blue-500/20"
      case "IMAGEN":
        return "bg-purple-500/10 text-purple-500 border border-purple-500/20"
      case "FUNCIONAL":
        return "bg-amber-500/10 text-amber-500 border border-amber-500/20"
      case "BIOPSIA":
        return "bg-rose-500/10 text-rose-500 border border-rose-500/20"
      default:
        return "bg-slate-500/10 text-slate-500 border border-slate-500/20"
    }
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <div className="p-4 pt-16 md:p-8 md:pt-8 page-transition">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Heart className="w-8 h-8 text-primary animate-pulse" />
                Pacientes Clínicos
              </h1>
              <p className="text-muted-foreground mt-1">Gestiona el historial, datos de podología y exámenes clínicos de pacientes</p>
            </div>
            <Button onClick={showForm ? () => setShowForm(false) : handleOpenCreate} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? "Cancelar" : "Nuevo Paciente"}
            </Button>
          </div>

          {/* Búsqueda */}
          <Card className="glass-card p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input type="text" placeholder="Buscar por nombre o cédula..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-muted/30 border-border" />
            </div>
          </Card>

          {/* Formulario de registro/edición */}
          {showForm && (
            <Card className="glass-card p-6 mb-6 animate-in fade-in slide-in-from-top-4 duration-250">
              <h2 className="text-lg font-semibold text-foreground mb-4">{editingId ? "Editar Paciente Clínico" : "Nuevo Paciente Clínico"}</h2>
              
              {/* Form Tabs */}
              <div className="flex border-b border-border mb-6">
                <button
                  type="button"
                  onClick={() => setFormTab("personales")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all ${
                    formTab === "personales"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <User className="w-4 h-4" />
                  Datos Personales
                </button>
                <button
                  type="button"
                  onClick={() => setFormTab("clinicos")}
                  className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all ${
                    formTab === "clinicos"
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Heart className="w-4 h-4" />
                  Historial Clínico
                </button>
                {!editingId && (
                  <button
                    type="button"
                    onClick={() => setFormTab("examenes_iniciales")}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 font-medium text-sm transition-all ${
                      formTab === "examenes_iniciales"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    Exámenes Iniciales
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formTab === "personales" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                      <Input required value={formData.nombreCompleto} onChange={(e) => setFormData({ ...formData, nombreCompleto: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Maria Auxiliadora Chavarría" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Cédula <span className="text-red-500">*</span></label>
                      <Input required value={formData.cedula} onChange={(e) => setFormData({ ...formData, cedula: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 001-150890-1002G" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Teléfono <span className="text-red-500">*</span></label>
                      <Input required value={formData.telefono} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: 88889999" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Correo <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <Input type="email" value={formData.correo} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: correo@ejemplo.com" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Dirección <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <Input value={formData.direccion} onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} className="bg-muted/30 border-border" placeholder="Ej: Altamira, de la vicky 1c abajo" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Fecha de Nacimiento <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <Input type="date" value={formData.fechaNacimiento} onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })} className="bg-muted/30 border-border" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Sexo <span className="text-muted-foreground text-xs font-normal">(Opcional)</span></label>
                      <select value={formData.sexo} onChange={(e) => setFormData({ ...formData, sexo: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-muted/30 border-border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                        <option value="">Seleccionar...</option>
                        <option value="MASCULINO">Masculino</option>
                        <option value="FEMENINO">Femenino</option>
                        <option value="OTRO">Otro</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Tipo de Perfil</label>
                      <select value={formData.tipoPerfil} onChange={(e) => setFormData({ ...formData, tipoPerfil: e.target.value as any })} className="flex h-10 w-full rounded-md border border-input bg-muted/30 border-border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                        <option value="CLINICA">Solo Paciente Clínico</option>
                        <option value="AMBOS">Farmacia + Paciente Clínico</option>
                      </select>
                    </div>
                  </div>
                )}

                {formTab === "clinicos" && (
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        Tipo de Sangre
                      </label>
                      <select
                        value={formData.datosClinicos.tipoSangre}
                        onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, tipoSangre: e.target.value } })}
                        className="flex h-10 w-full rounded-md border border-input bg-muted/30 border-border px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Seleccionar grupo sanguíneo...</option>
                        <option value="O+">O Positivo (O+)</option>
                        <option value="O-">O Negativo (O-)</option>
                        <option value="A+">A Positivo (A+)</option>
                        <option value="A-">A Negativo (A-)</option>
                        <option value="B+">B Positivo (B+)</option>
                        <option value="B-">B Negativo (B-)</option>
                        <option value="AB+">AB Positivo (AB+)</option>
                        <option value="AB-">AB Negativo (AB-)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        Alergias o Contraindicaciones
                      </label>
                      <Textarea value={formData.datosClinicos.alergias} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, alergias: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Ej: Alérgico a la Penicilina, diabético..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <BookOpen className="w-4 h-4 text-blue-500" />
                        Antecedentes Patológicos / Familiares
                      </label>
                      <Textarea value={formData.datosClinicos.antecedentes} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, antecedentes: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Ej: Hipertensión arterial hereditaria, cirugías previas..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1 flex items-center gap-1">
                        <Heart className="w-4 h-4 text-emerald-500" />
                        Diagnóstico General Podológico
                      </label>
                      <Textarea value={formData.datosClinicos.diagnosticoGeneral} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, diagnosticoGeneral: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Ej: Onicomicosis severa en primer dedo de pie derecho..." />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">Observaciones Clínicas Adicionales</label>
                      <Textarea value={formData.datosClinicos.observacionesClinicas} onChange={(e) => setFormData({ ...formData, datosClinicos: { ...formData.datosClinicos, observacionesClinicas: e.target.value } })} className="bg-muted/30 border-border min-h-[80px]" placeholder="Notas de seguimiento o indicaciones especiales de calzado..." />
                    </div>
                  </div>
                )}

                {formTab === "examenes_iniciales" && !editingId && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div>
                        <h3 className="text-sm font-bold text-foreground">Exámenes Iniciales del Paciente</h3>
                        <p className="text-xs text-muted-foreground">Agrega exámenes clínicos de forma opcional durante el registro</p>
                      </div>
                      <Button type="button" size="sm" onClick={addInitialExamRow} className="bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                        <Plus className="w-4 h-4 mr-1" />
                        Añadir Examen
                      </Button>
                    </div>

                    {initialExams.length === 0 ? (
                      <div className="text-center p-8 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                        No hay exámenes iniciales añadidos.
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                        {initialExams.map((ex, index) => (
                          <div key={ex.tempId} className="p-4 border border-border rounded-lg bg-muted/15 relative space-y-3">
                            <button
                              type="button"
                              onClick={() => removeInitialExamRow(ex.tempId)}
                              className="absolute top-3 right-3 text-red-500 hover:text-red-400 p-1 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Nombre del Examen *</label>
                                <Input required size={30} value={ex.nombre} onChange={e => updateInitialExamRow(ex.tempId, "nombre", e.target.value)} placeholder="Ej: Hemograma, Placa Rayos X..." className="bg-background" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Tipo *</label>
                                <select value={ex.tipo} onChange={e => updateInitialExamRow(ex.tempId, "tipo", e.target.value as any)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none">
                                  <option value="LABORATORIO">Laboratorio</option>
                                  <option value="IMAGEN">Imagenología</option>
                                  <option value="FUNCIONAL">Prueba Funcional</option>
                                  <option value="BIOPSIA">Biopsia</option>
                                  <option value="OTRO">Otro</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Fecha de Examen *</label>
                                <Input type="date" required value={ex.fechaExamen} onChange={e => updateInitialExamRow(ex.tempId, "fechaExamen", e.target.value)} className="bg-background" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Resultado</label>
                                <Textarea rows={2} value={ex.resultado} onChange={e => updateInitialExamRow(ex.tempId, "resultado", e.target.value)} placeholder="Ej: Glucemia: 110 mg/dL..." className="bg-background resize-none min-h-[50px]" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Diagnóstico / Interpretación</label>
                                <Textarea rows={2} value={ex.interpretacion} onChange={e => updateInitialExamRow(ex.tempId, "interpretacion", e.target.value)} placeholder="Ej: Elevación leve de glucosa..." className="bg-background resize-none min-h-[50px]" />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Observaciones</label>
                                <Input value={ex.observaciones} onChange={e => updateInitialExamRow(ex.tempId, "observaciones", e.target.value)} placeholder="Ej: Paciente en ayunas de 8 horas..." className="bg-background" />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-muted-foreground mb-1">Adjunto Opcional (PDF, Imagen)</label>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                                    onChange={e => {
                                      const file = e.target.files?.[0] || null
                                      if (file && file.size > 10 * 1024 * 1024) {
                                        toast.error("El archivo supera el límite de 10 MB")
                                        e.target.value = ""
                                        return
                                      }
                                      updateInitialExamRow(ex.tempId, "file", file)
                                    }}
                                    className="bg-background cursor-pointer text-xs"
                                  />
                                  {ex.file && (
                                    <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded truncate max-w-[120px]">
                                      {ex.file.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="bg-primary hover:bg-primary/90 text-primary-foreground">{editingId ? "Actualizar Paciente" : "Guardar Paciente"}</Button>
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
                </div>
              </form>
            </Card>
          )}

          {/* Tabla de pacientes */}
          <Card className="glass-card overflow-hidden">
            {loading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/30 border-b border-border">
                    <tr>
                      {["Paciente", "Cédula", "Teléfono", "Alergias / Diagnóstico", "Estado", "Acciones"].map((h) => (
                        <th key={h} className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredPacientes.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-sm text-muted-foreground">
                          No se encontraron pacientes clínicos.
                        </td>
                      </tr>
                    ) : (
                      filteredPacientes.map((paciente) => (
                        <tr key={paciente.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-foreground">
                            <div>{paciente.nombreCompleto}</div>
                            {paciente.fechaNacimiento && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <Calendar className="w-3 h-3" />
                                {new Date(paciente.fechaNacimiento).toLocaleDateString('es-NI')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{paciente.cedula || "—"}</td>
                          <td className="px-6 py-4 text-sm text-muted-foreground">{paciente.telefono || "—"}</td>
                          <td className="px-6 py-4 text-sm max-w-[280px]">
                            {paciente.datosClinicos?.alergias && (
                              <div className="text-xs text-red-500 font-medium truncate" title={`Alergias: ${paciente.datosClinicos.alergias}`}>
                                Alergias: {paciente.datosClinicos.alergias}
                              </div>
                            )}
                            {paciente.datosClinicos?.diagnosticoGeneral ? (
                              <div className="text-xs text-muted-foreground truncate" title={paciente.datosClinicos.diagnosticoGeneral}>
                                Diag: {paciente.datosClinicos.diagnosticoGeneral}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/50 italic">Sin diagnóstico clínico</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${paciente.activo ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"}`}>
                              {paciente.activo ? "Activo" : "Inactivo"}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setShowDetailModal(true)
                                  setDetailTab("examenes")
                                  fetchPacienteDetail(paciente.id)
                                }}
                                className="text-primary hover:text-primary-foreground hover:bg-primary/20"
                                title="Ver Expediente Clínico Completo"
                              >
                                <BookOpen className="w-4 h-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleEdit(paciente)} className="text-muted-foreground hover:text-foreground" title="Editar"><Edit2 className="w-4 h-4" /></Button>
                              <Button size="sm" variant="ghost" onClick={() => handleToggleActivo(paciente)} className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title={paciente.activo ? "Desactivar" : "Reactivar"}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleHardDelete(paciente)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10" title="Eliminar permanentemente"><Trash2 className="w-4 h-4" /></Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </main>

      {/* ═══ MODAL EXPEDIENTE CLÍNICO COMPLETO ═══ */}
      {showDetailModal && selectedPaciente && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-5xl p-6 relative max-h-[92vh] flex flex-col shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => {
                setShowDetailModal(false)
                setSelectedPaciente(null)
              }}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            {/* Header Expediente */}
            <div className="border-b border-border pb-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Expediente Clínico del Paciente
                </h2>
                <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="font-bold text-foreground">{selectedPaciente.nombreCompleto}</span>
                  {selectedPaciente.cedula && <span>Cédula: <strong>{selectedPaciente.cedula}</strong></span>}
                  {selectedPaciente.telefono && <span>Teléfono: <strong>{selectedPaciente.telefono}</strong></span>}
                  <span>Edad: <strong>{calcularEdad(selectedPaciente.fechaNacimiento)}</strong></span>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold self-start sm:self-center ${selectedPaciente.activo ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20" : "bg-muted text-muted-foreground"}`}>
                {selectedPaciente.activo ? "Activo" : "Inactivo"}
              </span>
            </div>

            {detailModalLoading ? (
              <div className="flex-1 flex items-center justify-center p-12">
                <div className="space-y-4 w-full">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-40 w-full" />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col md:flex-row gap-5 min-h-0">
                {/* Lateral: Antecedentes e Info Clinica */}
                <div className="w-full md:w-80 flex-shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">
                  <Card className="bg-muted/20 border-border p-4 rounded-xl space-y-4">
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-1.5 border-b border-border pb-1">
                      <Heart className="w-4 h-4 text-primary" />
                      Ficha de Diagnóstico
                    </h3>
                    <div className="space-y-3 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Tipo de Sangre</span>
                        <p className="p-2 rounded bg-background border border-border text-foreground font-semibold">
                          {selectedPaciente.datosClinicos?.tipoSangre || "No especificado"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Alergias / Contraindicaciones</span>
                        <p className={`p-2 rounded bg-background border border-border ${selectedPaciente.datosClinicos?.alergias ? "text-red-500 font-semibold" : "text-muted-foreground italic"}`}>
                          {selectedPaciente.datosClinicos?.alergias || "Ninguna registrada"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Antecedentes Clínicos</span>
                        <p className="p-2 rounded bg-background border border-border text-foreground whitespace-pre-wrap">
                          {selectedPaciente.datosClinicos?.antecedentes || "Sin antecedentes registrados"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Diagnóstico General</span>
                        <p className="p-2 rounded bg-background border border-border text-foreground whitespace-pre-wrap">
                          {selectedPaciente.datosClinicos?.diagnosticoGeneral || "Sin diagnóstico general"}
                        </p>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-muted-foreground block mb-0.5">Observaciones Adicionales</span>
                        <p className="p-2 rounded bg-background border border-border text-foreground whitespace-pre-wrap">
                          {selectedPaciente.datosClinicos?.observacionesClinicas || "Ninguna observación registrada"}
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Central: Historial Clínico Dinámico */}
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Tabs del Detalle */}
                  <div className="flex border-b border-border pb-px mb-6">
                    <button
                      onClick={() => setDetailTab("examenes")}
                      className={`px-4 py-2 border-b-2 font-semibold text-xs transition-all ${
                        detailTab === "examenes" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Exámenes del Paciente ({(selectedPaciente.examenes || []).length})
                    </button>
                    <button
                      onClick={() => setDetailTab(" soap" as any)}
                      className={`px-4 py-2 border-b-2 font-semibold text-xs transition-all ${
                        detailTab === (" soap" as any) ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Consultas SOAP ({(selectedPaciente.atenciones || []).length})
                    </button>
                    <button
                      onClick={() => setDetailTab("recetas")}
                      className={`px-4 py-2 border-b-2 font-semibold text-xs transition-all ${
                        detailTab === "recetas" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Recetas ({(selectedPaciente.recetas || []).length})
                    </button>
                  </div>

                  {/* Contenido Dinámico de la Pestaña */}
                  <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                    
                    {/* TABS 1: EXÁMENES (NUEVO MÓDULO) */}
                    {detailTab === "examenes" && (
                      <div className="space-y-5">
                        {/* Buscador y Controles */}
                        <div className="flex flex-wrap gap-3 items-center justify-between mb-4">
                          <div className="flex flex-wrap gap-3 items-center">
                            <Input
                              type="text"
                              size={15}
                              placeholder="Buscar examen..."
                              value={examSearch}
                              onChange={e => setExamSearch(e.target.value)}
                              className="bg-muted/20 border-border text-xs h-8 py-1 px-2.5 max-w-[150px]"
                            />
                            <select
                              value={examTypeFilter}
                              onChange={e => setExamTypeFilter(e.target.value)}
                              className="h-8 rounded border border-border px-2 text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary/40"
                            >
                              <option value="">Todos los tipos</option>
                              <option value="LABORATORIO">Laboratorio</option>
                              <option value="IMAGEN">Imagenología</option>
                              <option value="FUNCIONAL">Prueba Funcional</option>
                              <option value="BIOPSIA">Biopsia</option>
                              <option value="OTRO">Otro</option>
                            </select>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground ml-2">
                              <span>Desde:</span>
                              <input type="date" value={examDateDesde} onChange={e => setExamDateDesde(e.target.value)} className="bg-background border border-border rounded p-1 text-xs h-8 text-foreground" />
                              <span>Hasta:</span>
                              <input type="date" value={examDateHasta} onChange={e => setExamDateHasta(e.target.value)} className="bg-background border border-border rounded p-1 text-xs h-8 text-foreground" />
                            </div>
                          </div>
                          <Button size="sm" onClick={handleOpenNewExam} className="bg-primary text-primary-foreground h-8 text-xs font-semibold">
                            <Plus className="w-3.5 h-3.5 mr-1" />
                            Registrar Examen
                          </Button>
                        </div>

                        {/* Listado de Exámenes */}
                        {filteredExamenes.length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-35" />
                            No se encontraron exámenes para el paciente.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {filteredExamenes.map(ex => (
                              <Card key={ex.id} className="bg-muted/10 border-border p-4 rounded-xl space-y-3 hover:bg-muted/15 transition-all">
                                <div className="flex items-start justify-between gap-4 border-b border-border/40 pb-2">
                                  <div>
                                    <h4 className="font-bold text-foreground text-sm">{ex.nombre}</h4>
                                    <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getExamTypeBadge(ex.tipo)}`}>
                                        {ex.tipo}
                                      </span>
                                      <span className="flex items-center gap-1 text-[11px]">
                                        <Calendar className="w-3.5 h-3.5" />
                                        Realizado: {new Date(ex.fechaExamen).toLocaleDateString("es-NI")}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <Button size="sm" variant="ghost" onClick={() => handleOpenEditExam(ex)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleDeleteExam(ex.id)} className="h-7 w-7 p-0 text-red-400 hover:text-red-300">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                  {ex.resultado && (
                                    <div className="p-2 rounded bg-background/50 border border-border/40">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Resultado</span>
                                      <p className="text-foreground whitespace-pre-wrap">{ex.resultado}</p>
                                    </div>
                                  )}
                                  {ex.interpretacion && (
                                    <div className="p-2 rounded bg-background/50 border border-border/40">
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Diagnóstico / Interpretación</span>
                                      <p className="text-foreground whitespace-pre-wrap">{ex.interpretacion}</p>
                                    </div>
                                  )}
                                </div>

                                {ex.observaciones && (
                                  <p className="text-xs text-muted-foreground italic pl-1.5 border-l-2 border-primary/45">
                                    Obs: {ex.observaciones}
                                  </p>
                                )}

                                {/* Adjunto y Metadatos */}
                                <div className="pt-2 border-t border-border/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-muted-foreground">
                                  <div>
                                    Registrado por: <strong>{ex.registrador?.nombreCompleto || "Médico"}</strong> el {new Date(ex.createdAt).toLocaleString("es-NI")}
                                  </div>

                                  {ex.archivoUrl ? (
                                    <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/15 px-2.5 py-1 rounded-lg">
                                      <FileText className="w-3.5 h-3.5 text-primary" />
                                      <span className="truncate max-w-[150px] font-mono text-foreground">{ex.archivoNombre}</span>
                                      <div className="flex gap-1 ml-1.5">
                                        <button type="button" onClick={() => handleViewAttachment(ex.id)} className="text-primary hover:text-primary/75 p-0.5" title="Visualizar archivo">
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button type="button" onClick={() => handleDownloadAttachment(ex.id, ex.archivoNombre || "archivo")} className="text-primary hover:text-primary/75 p-0.5" title="Descargar archivo">
                                          <Download className="w-3.5 h-3.5" />
                                        </button>
                                        {isUserAdmin && (
                                          <button type="button" onClick={() => handleDeleteAttachment(ex.id)} className="text-red-400 hover:text-red-300 p-0.5" title="Eliminar adjunto">
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-[11px] text-muted-foreground/65 italic">Sin archivo adjunto</span>
                                  )}
                                </div>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TABS 2: CONSULTAS SOAP */}
                    {detailTab === (" soap" as any) && (
                      <div className="space-y-4">
                        {(selectedPaciente.atenciones || []).length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                            <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-35" />
                            No hay consultas SOAP registradas.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {(selectedPaciente.atenciones || []).map((at: any) => (
                              <Card key={at.id} className="bg-muted/15 border-border p-4 rounded-xl space-y-3">
                                <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                  <div>
                                    <span className="text-xs font-bold text-foreground">Consulta Clínica SOAP</span>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">
                                      Atendido por: <strong>{at.usuario?.nombreCompleto || "Médico"}</strong> — {new Date(at.fecha).toLocaleString("es-NI")}
                                    </p>
                                  </div>
                                  {at.receta && (
                                    <Button size="sm" variant="outline" onClick={() => handlePrintReceta(at.receta)} className="h-7 text-xs text-primary border-primary/20 hover:bg-primary/5">
                                      <Printer className="w-3.5 h-3.5 mr-1" /> Receta
                                    </Button>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                  <div className="p-2 rounded bg-background/50 border border-border/40">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Subjetivo (S)</span>
                                    <p className="text-foreground whitespace-pre-wrap">{at.subjetivo}</p>
                                  </div>
                                  <div className="p-2 rounded bg-background/50 border border-border/40">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Objetivo (O)</span>
                                    <p className="text-foreground whitespace-pre-wrap">{at.objetivo}</p>
                                  </div>
                                  <div className="p-2 rounded bg-background/50 border border-border/40">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Análisis (A)</span>
                                    <p className="text-foreground whitespace-pre-wrap">{at.analisis}</p>
                                  </div>
                                  <div className="p-2 rounded bg-background/50 border border-border/40">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase block mb-0.5">Plan (P)</span>
                                    <p className="text-foreground whitespace-pre-wrap">{at.plan}</p>
                                  </div>
                                </div>

                                {/* Diagnósticos, Tratamientos e Insumos */}
                                {(at.diagnosticos?.length > 0 || at.tratamientos?.length > 0 || at.insumos?.length > 0) && (
                                  <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-border/30 text-[10px] items-center">
                                    {at.diagnosticos?.map((d: any) => (
                                      <span key={d.idDiagnostico} className="px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                                        {d.diagnostico.codigo ? `[${d.diagnostico.codigo}] ` : ""}{d.diagnostico.nombre}
                                      </span>
                                    ))}
                                    {at.tratamientos?.map((t: any) => (
                                      <span key={t.idTratamiento} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 font-medium">
                                        {t.tratamiento.nombre}
                                      </span>
                                    ))}
                                    {at.insumos?.map((i: any) => (
                                      <span key={i.id} className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
                                        Insumo: {i.producto.nombre} (x{i.cantidad})
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* TABS 3: RECETAS */}
                    {detailTab === "recetas" && (
                      <div className="space-y-4">
                        {(selectedPaciente.recetas || []).length === 0 ? (
                          <div className="text-center py-12 border border-dashed border-border rounded-xl text-muted-foreground text-sm">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-35" />
                            No hay recetas emitidas.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(selectedPaciente.recetas || []).map((rec: any) => (
                              <Card key={rec.id} className="bg-muted/15 border-border p-4 rounded-xl">
                                <div className="flex items-center justify-between border-b border-border/40 pb-2 mb-3">
                                  <div>
                                    <span className="text-xs font-mono font-bold text-primary">{rec.codigoReceta}</span>
                                    <span className="text-[11px] text-muted-foreground ml-3">
                                      Vence: {rec.fechaVencimiento ? new Date(rec.fechaVencimiento).toLocaleDateString("es-NI") : "No vence"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 font-bold uppercase">
                                      {rec.estado}
                                    </span>
                                    <Button size="sm" variant="ghost" onClick={() => handlePrintReceta(rec)} className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground">
                                      <Printer className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-muted-foreground border-b border-border/30">
                                      <th className="pb-1.5 font-bold uppercase">Artículo</th>
                                      <th className="pb-1.5 font-bold uppercase text-center w-16">Cant.</th>
                                      <th className="pb-1.5 font-bold uppercase">Indicaciones</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {rec.detalles.map((d: any) => (
                                      <tr key={d.id} className="text-foreground hover:bg-muted/5">
                                        <td className="py-1.5 font-medium">{d.producto.nombre}</td>
                                        <td className="py-1.5 text-center font-bold">{d.cantidad}</td>
                                        <td className="py-1.5 text-muted-foreground">{d.indicaciones || "Ninguna"}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </Card>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ═══ SUB-MODAL REGISTRAR/EDITAR EXAMEN (DENTRO DEL EXPEDIENTE) ═══ */}
      {showExamSubModal && selectedPaciente && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <Card className="glass-card w-full max-w-lg p-6 relative shadow-2xl rounded-2xl animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowExamSubModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 hover:bg-muted/40 rounded-full transition-colors"
            >
              <XCircle className="w-5 h-5" />
            </button>

            <div className="mb-5 flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-foreground">{editingExamId ? "Editar Examen Clínico" : "Registrar Nuevo Examen"}</h3>
                <p className="text-xs text-muted-foreground">Paciente: {selectedPaciente.nombreCompleto}</p>
              </div>
            </div>

            <form onSubmit={handleSubmitExam} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-foreground mb-1">Nombre del Examen *</label>
                  <Input
                    required
                    value={examForm.nombre}
                    onChange={e => setExamForm({ ...examForm, nombre: e.target.value })}
                    placeholder="Ej: Análisis de Sangre Completo, Biopsia de Tejido..."
                    className="bg-background border-border"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Tipo de Examen *</label>
                  <select
                    value={examForm.tipo}
                    onChange={e => setExamForm({ ...examForm, tipo: e.target.value as any })}
                    className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none"
                  >
                    <option value="LABORATORIO">Laboratorio</option>
                    <option value="IMAGEN">Imagenología</option>
                    <option value="FUNCIONAL">Prueba Funcional</option>
                    <option value="BIOPSIA">Biopsia</option>
                    <option value="OTRO">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Fecha del Examen *</label>
                  <Input
                    type="date"
                    required
                    value={examForm.fechaExamen}
                    onChange={e => setExamForm({ ...examForm, fechaExamen: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Resultado</label>
                  <Textarea
                    rows={3}
                    value={examForm.resultado}
                    onChange={e => setExamForm({ ...examForm, resultado: e.target.value })}
                    placeholder="Valores, descripción detallada o hallazgos..."
                    className="bg-background border-border resize-none min-h-[70px]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Interpretación / Diagnóstico</label>
                  <Textarea
                    rows={3}
                    value={examForm.interpretacion}
                    onChange={e => setExamForm({ ...examForm, interpretacion: e.target.value })}
                    placeholder="Conclusión del estudio clínico..."
                    className="bg-background border-border resize-none min-h-[70px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Observaciones</label>
                <Input
                  value={examForm.observaciones}
                  onChange={e => setExamForm({ ...examForm, observaciones: e.target.value })}
                  placeholder="Ej: Repetir en 3 meses, requiere ayuno..."
                  className="bg-background border-border"
                />
              </div>

              {/* Zona de adjunto */}
              <div className="border border-dashed border-border rounded-xl p-4 bg-muted/10">
                <label className="block text-xs font-semibold text-foreground mb-2">Archivo Adjunto (PDF, Imagen, Word - Máx 10 MB)</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                      onChange={e => {
                        const file = e.target.files?.[0] || null
                        if (file && file.size > 10 * 1024 * 1024) {
                          toast.error("El archivo supera el tamaño máximo permitido de 10 MB")
                          e.target.value = ""
                          return
                        }
                        setExamFile(file)
                      }}
                      className="bg-background text-xs cursor-pointer"
                    />
                  </div>
                  {examFile && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/10 border border-primary/20 p-2 rounded-lg truncate max-w-[180px]">
                      <FileText className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{examFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border mt-6 justify-end">
                <Button type="button" variant="outline" onClick={() => setShowExamSubModal(false)}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={examSubmitLoading}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                >
                  {examSubmitLoading ? "Guardando..." : "Guardar Examen"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}
