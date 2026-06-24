import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { tienePermiso } from "@/lib/permissions"
import { registrarLog } from "@/lib/audit"
import fs from "fs"
import path from "path"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "EXAMENES", "CREAR")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idExamen = parseInt(id, 10)
    if (isNaN(idExamen)) {
      return NextResponse.json({ error: "ID de examen inválido" }, { status: 400 })
    }

    const examen = await prisma.examenPaciente.findFirst({
      where: { id: idExamen, activo: true },
    })

    if (!examen) {
      return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
    }

    // Validar tamaño máximo: 10 MB
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "El archivo supera el tamaño máximo permitido de 10 MB" }, { status: 400 })
    }

    // Validar tipo MIME
    const ALLOWED_MIME_TYPES = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Tipo de archivo no permitido. Solo se aceptan PDFs, imágenes y documentos Word." }, { status: 400 })
    }

    // Crear directorio para guardar el archivo
    const uploadDir = path.join(process.cwd(), "uploads", "examenes", String(examen.idPaciente))
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    // Generar nombre de archivo único
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_")
    const finalFilename = `${timestamp}_${sanitizedFilename}`
    const filePath = path.join(uploadDir, finalFilename)

    // Guardar archivo
    const buffer = Buffer.from(await file.arrayBuffer())
    fs.writeFileSync(filePath, buffer)

    // Conservar referencia al archivo antiguo si existía para borrarlo
    let oldFilePath: string | null = null
    if (examen.archivoUrl) {
      oldFilePath = path.join(process.cwd(), examen.archivoUrl)
    }

    // Guardar ruta relativa en la base de datos
    const relativeUrl = path.join("uploads", "examenes", String(examen.idPaciente), finalFilename).replace(/\\/g, "/")
    const examenActualizado = await prisma.examenPaciente.update({
      where: { id: idExamen },
      data: {
        archivoUrl: relativeUrl,
        archivoNombre: file.name,
        archivoTipo: file.type,
      },
    })

    // Eliminar archivo antiguo físico si existía
    if (oldFilePath && fs.existsSync(oldFilePath)) {
      try {
        fs.unlinkSync(oldFilePath)
      } catch (err) {
        console.error("Error al eliminar el archivo antiguo:", err)
      }
    }

    // Registrar en auditoría
    registrarLog({
      accion: "SUBIR_ARCHIVO_CLINICO",
      entidad: "ExamenPaciente",
      entidadId: idExamen,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { filename: file.name, size: file.size, idPaciente: examen.idPaciente },
    })

    return NextResponse.json({
      message: "Archivo subido con éxito",
      examen: examenActualizado,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return NextResponse.json({ error: "Error al subir el archivo" }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    if (!tienePermiso(rol, "EXAMENES", "DESCARGAR_ARCHIVO")) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 })
    }

    const { id } = await params
    const idExamen = parseInt(id, 10)
    if (isNaN(idExamen)) {
      return NextResponse.json({ error: "ID de examen inválido" }, { status: 400 })
    }

    const examen = await prisma.examenPaciente.findFirst({
      where: { id: idExamen, activo: true },
    })

    if (!examen || !examen.archivoUrl) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 })
    }

    const filePath = path.join(process.cwd(), examen.archivoUrl)
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "El archivo físico no existe en el servidor" }, { status: 404 })
    }

    // Leer el archivo y enviarlo por streaming
    const fileBuffer = fs.readFileSync(filePath)

    // Registrar en auditoría
    registrarLog({
      accion: "VER_ARCHIVO_CLINICO",
      entidad: "ExamenPaciente",
      entidadId: idExamen,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { filename: examen.archivoNombre, idPaciente: examen.idPaciente },
    })

    // Establecer Content-Disposition de manera segura
    const contentDisposition = `inline; filename="${encodeURIComponent(examen.archivoNombre || "archivo")}"`

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": examen.archivoTipo || "application/octet-stream",
        "Content-Disposition": contentDisposition,
      },
    })
  } catch (error) {
    console.error("Error downloading file:", error)
    return NextResponse.json({ error: "Error al descargar el archivo" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })

    if (!usuarioDb || !usuarioDb.activo) {
      return NextResponse.json({ error: "Usuario inactivo o no encontrado" }, { status: 403 })
    }

    const rol = usuarioDb.rol.nombre
    // Solo administrador para eliminar físicamente archivos adjuntos
    if (rol !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado. Solo administradores pueden eliminar archivos adjuntos." }, { status: 403 })
    }

    const { id } = await params
    const idExamen = parseInt(id, 10)
    if (isNaN(idExamen)) {
      return NextResponse.json({ error: "ID de examen inválido" }, { status: 400 })
    }

    const examen = await prisma.examenPaciente.findFirst({
      where: { id: idExamen, activo: true },
    })

    if (!examen || !examen.archivoUrl) {
      return NextResponse.json({ error: "El examen no tiene ningún archivo adjunto" }, { status: 404 })
    }

    const filePath = path.join(process.cwd(), examen.archivoUrl)

    // Actualizar registro en la BD
    const examenActualizado = await prisma.examenPaciente.update({
      where: { id: idExamen },
      data: {
        archivoUrl: null,
        archivoNombre: null,
        archivoTipo: null,
      },
    })

    // Eliminar archivo físico
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }

    // Registrar en auditoría
    registrarLog({
      accion: "ELIMINAR_ARCHIVO_CLINICO",
      entidad: "ExamenPaciente",
      entidadId: idExamen,
      idUsuario: user.id,
      modulo: "CLINICA",
      detalles: { filename: examen.archivoNombre, idPaciente: examen.idPaciente },
    })

    return NextResponse.json({
      message: "Archivo adjunto eliminado con éxito",
      examen: examenActualizado,
    })
  } catch (error) {
    console.error("Error deleting file:", error)
    return NextResponse.json({ error: "Error al eliminar el archivo adjunto" }, { status: 500 })
  }
}
