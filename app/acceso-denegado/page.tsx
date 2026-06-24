"use client"

import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { AlertTriangle, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useCurrentUser } from "@/app/hooks/useCurrentUser"

export default function AccesoDenegadoPage() {
  const { user, loading } = useCurrentUser()

  const role = user?.rolNombre || ""
  let customMessage = "No tienes autorización para acceder a esta sección de la aplicación."

  if (role === "DOCTOR") {
    customMessage = "El rol de Doctor/Podólogo tiene acceso exclusivo al área clínica de podología y consultas. Las secciones de farmacia, inventarios, compras y administración general están restringidas."
  } else if (role === "EMPLEADO") {
    customMessage = "El rol de Empleado de Farmacia tiene acceso exclusivo a la venta, facturación y catálogo de medicamentos. El expediente clínico de podología y consultas médicas están restringidos."
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="glass-card max-w-md p-8 text-center border-red-500/20 shadow-2xl animate-in fade-in zoom-in duration-200">
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20 w-fit mx-auto mb-4">
            <AlertTriangle className="w-12 h-12 text-red-500 animate-bounce" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Acceso Denegado</h1>
          <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
            {customMessage}
          </p>
          <div className="mt-6">
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center gap-2 mx-auto">
                <Home className="w-4 h-4" />
                Volver al Dashboard
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  )
}
