"use client"
import useSWR from "swr"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
const fetcher = (url: string) => fetch(url).then((r) => r.json())
export default function RecomendacionesCompraPage() {
  const { data, error } = useSWR("/api/compras/recomendaciones", fetcher)
  return <div className="flex min-h-screen bg-background"><Sidebar /><main className="flex-1 p-4 pt-16 md:p-8"><h1 className="text-3xl font-bold mb-2">Compras inteligentes</h1><p className="text-muted-foreground mb-6">Sugerencias locales, explicables y sin IA externa.</p>{error && <p>Error al cargar.</p>}<div className="space-y-3">{data?.recomendaciones?.map((r: any) => <Card key={r.idProducto} className="p-5"><div className="flex justify-between gap-4"><div><h2 className="font-bold">{r.producto}</h2><p className="text-sm text-muted-foreground mt-1">{r.explicacion}</p><p className="text-xs mt-2">Proveedor: {r.proveedorSugerido ? `${r.proveedorSugerido.nombre} · C$${r.proveedorSugerido.ultimoCosto.toFixed(2)}` : "Sin costo registrado"}</p></div><div className="text-right shrink-0"><p className="text-xs uppercase text-muted-foreground">Comprar</p><p className="text-2xl font-bold text-primary">{r.cantidadSugerida} u.</p></div></div></Card>)}</div></main></div>
}
