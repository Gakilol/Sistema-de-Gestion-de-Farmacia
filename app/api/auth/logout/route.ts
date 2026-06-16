import { NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { registrarLog } from "@/lib/audit"

export async function POST() {
  const user = await getCurrentUser()
  if (user) {
    registrarLog({
      accion: "LOGOUT",
      entidad: "Usuario",
      entidadId: user.id,
      idUsuario: user.id,
      detalles: { correo: user.correo },
    })
  }

  const response = NextResponse.json({ success: true })
  response.cookies.delete("token")
  return response
}

