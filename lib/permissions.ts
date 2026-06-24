import { prisma } from "@/lib/prisma"

// Roles del sistema
export type RolNombre = "ADMIN" | "DOCTOR" | "EMPLEADO"

// Permisos por módulo
export const PERMISOS = {
  CLINICA: {
    VER: ["ADMIN", "DOCTOR"],
    CREAR: ["ADMIN", "DOCTOR"],
    EDITAR: ["ADMIN", "DOCTOR"],
    ELIMINAR: ["ADMIN"], // Solo eliminación lógica
  },
  EXAMENES: {
    VER: ["ADMIN", "DOCTOR"],
    CREAR: ["ADMIN", "DOCTOR"],
    EDITAR: ["ADMIN", "DOCTOR"],
    ELIMINAR: ["ADMIN", "DOCTOR"], // Eliminación lógica
    DESCARGAR_ARCHIVO: ["ADMIN", "DOCTOR"],
  },
  SERVICIOS_PODOLOGIA: {
    VER: ["ADMIN", "DOCTOR"],
    CREAR: ["ADMIN", "DOCTOR"],
    EDITAR: ["ADMIN", "DOCTOR"],
    ELIMINAR: ["ADMIN"],
    USAR_EN_CONSULTA: ["ADMIN", "DOCTOR"],
  },
  FARMACIA: {
    VER: ["ADMIN", "EMPLEADO"],
    CREAR: ["ADMIN", "EMPLEADO"],
    EDITAR: ["ADMIN"],
    ELIMINAR: ["ADMIN"],
  },
  ADMINISTRACION: {
    VER: ["ADMIN"],
    CREAR: ["ADMIN"],
    EDITAR: ["ADMIN"],
    ELIMINAR: ["ADMIN"],
  },
  AUDITORIA: {
    VER_FARMACIA: ["ADMIN"],
    VER_CLINICA: ["ADMIN", "DOCTOR"],
  },
} as const

type ModuloKey = keyof typeof PERMISOS

export function tienePermiso(rol: string, modulo: ModuloKey, accion: string): boolean {
  const mod = PERMISOS[modulo] as Record<string, readonly string[]>
  if (!mod) return false
  const rolesPermitidos = mod[accion]
  if (!rolesPermitidos) return false
  return rolesPermitidos.includes(rol)
}

export async function verificarPermisoClinico(userId: number): Promise<{ rol: string; permitido: boolean }> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: userId },
    include: { rol: true },
  })
  if (!usuario || !usuario.activo) {
    return { rol: "", permitido: false }
  }
  const rol = usuario.rol.nombre
  const permitido = tienePermiso(rol, "CLINICA", "VER")
  return { rol, permitido }
}
