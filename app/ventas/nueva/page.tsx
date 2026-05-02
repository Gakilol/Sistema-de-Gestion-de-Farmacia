"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Sidebar } from "@/components/sidebar"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Trash2 } from "lucide-react"

interface Producto {
  id: number
  nombre: string
  precioVenta: string
  precioBlister?: string | null
  precioCaja?: string | null
  stockActual: number
  unidadesPorBlister?: number | null
  unidadesPorCaja?: number | null
}

interface Cliente {
  id: number
  nombreCompleto: string
}

interface LineaVenta {
  idProducto: number
  nombre: string
  cantidad: number
  precioUnitario: number
  subtotal: number
  tipoUnidad: string
}

export default function NuevaVentaPage() {
  const router = useRouter()
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [lineas, setLineas] = useState<LineaVenta[]>([])
  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)

  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [tipoUnidad, setTipoUnidad] = useState<string>("UNIDAD")
  const [cantidad, setCantidad] = useState("")
  const [selectedCliente, setSelectedCliente] = useState("")
  const [metodoPago, setMetodoPago] = useState("EFECTIVO")
  const [nombrePodologo, setNombrePodologo] = useState("")
  const [numeroReceta, setNumeroReceta] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [resProductos, resClientes] = await Promise.all([fetch("/api/productos"), fetch("/api/clientes")])

      const productos = await resProductos.json()
      const clientes = await resClientes.json()

      setProductos(productos)
      setClientes(clientes)
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const getPrecioUnitario = () => {
    if (!selectedProducto) return 0
    if (tipoUnidad === "BLISTER" && selectedProducto.precioBlister) {
      return Number.parseFloat(selectedProducto.precioBlister)
    }
    if (tipoUnidad === "CAJA" && selectedProducto.precioCaja) {
      return Number.parseFloat(selectedProducto.precioCaja)
    }
    return Number.parseFloat(selectedProducto.precioVenta)
  }

  const agregarLinea = () => {
    if (!selectedProducto || !cantidad) return

    const cant = Number.parseInt(cantidad)
    if (cant <= 0) return

    let cantDeducir = cant
    if (tipoUnidad === "BLISTER") {
      cantDeducir = cant * (selectedProducto.unidadesPorBlister || 1)
    } else if (tipoUnidad === "CAJA") {
      cantDeducir = cant * (selectedProducto.unidadesPorCaja || 1)
    }

    // Calcular ocupado en carrito
    const ocupadoEnCarrito = lineas
      .filter((l) => l.idProducto === selectedProducto.id)
      .reduce((sum, l) => {
        let deducir = l.cantidad;
        if (l.tipoUnidad === "BLISTER") deducir = l.cantidad * (selectedProducto.unidadesPorBlister || 1);
        if (l.tipoUnidad === "CAJA") deducir = l.cantidad * (selectedProducto.unidadesPorCaja || 1);
        return sum + deducir;
      }, 0);

    if (cantDeducir + ocupadoEnCarrito > selectedProducto.stockActual) {
      alert("Stock insuficiente")
      return
    }

    const precioUnitario = getPrecioUnitario()
    const subtotal = precioUnitario * cant

    const nuevaLinea: LineaVenta = {
      idProducto: selectedProducto.id,
      nombre: selectedProducto.nombre,
      cantidad: cant,
      precioUnitario,
      subtotal,
      tipoUnidad,
    }

    setLineas([...lineas, nuevaLinea])
    setSelectedProducto(null)
    setCantidad("")
    setTipoUnidad("UNIDAD")
  }

  const eliminarLinea = (idx: number) => {
    setLineas(lineas.filter((_, i) => i !== idx))
  }

  const total = lineas.reduce((sum, l) => sum + l.subtotal, 0)

  const handleRegistrarVenta = async () => {
    if (lineas.length === 0) {
      alert("Agregue al menos un producto")
      return
    }

    setProcesando(true)

    try {
      const res = await fetch("/api/ventas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCliente: selectedCliente ? Number.parseInt(selectedCliente) : null,
          detalles: lineas.map((l) => ({
            idProducto: l.idProducto,
            cantidad: l.cantidad,
            precioUnitario: l.precioUnitario,
            tipoUnidad: l.tipoUnidad,
          })),
          metodoPago,
          nombrePodologo: nombrePodologo || null,
          numeroReceta: numeroReceta || null,
        }),
      })

      if (res.ok) {
        alert("Venta registrada exitosamente")
        router.push("/ventas/historial")
      } else {
        const data = await res.json()
        alert(data.error || "Error al registrar venta")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error al registrar venta")
    } finally {
      setProcesando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-8">Cargando...</main>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Nueva Venta</h1>
          <p className="text-gray-600 mb-8">Registra una nueva venta de productos</p>

          <div className="grid grid-cols-3 gap-6">
            {/* Panel izquierdo: Agregar productos */}
            <div className="col-span-2">
              <Card className="p-6 bg-white mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Agregar Productos</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                    <select
                      value={selectedProducto?.id || ""}
                      onChange={(e) => {
                        const prod = productos.find((p) => p.id === Number.parseInt(e.target.value))
                        setSelectedProducto(prod || null)
                        setTipoUnidad("UNIDAD")
                      }}
                      className="w-full p-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Selecciona un producto</option>
                      {productos.map((p) => {
                        let stockDisplay = `${p.stockActual} uds`;
                        if (p.unidadesPorCaja) stockDisplay += ` / ${Math.floor(p.stockActual / p.unidadesPorCaja)} cajas`;
                        return (
                          <option key={p.id} value={p.id}>
                            {p.nombre} - Stock: {stockDisplay}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {selectedProducto && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Venta</label>
                      <select
                        value={tipoUnidad}
                        onChange={(e) => setTipoUnidad(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg"
                      >
                        <option value="UNIDAD">Unidad</option>
                        {selectedProducto.precioBlister && <option value="BLISTER">Blister</option>}
                        {selectedProducto.precioCaja && <option value="CAJA">Caja</option>}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                      <Input
                        type="number"
                        min="1"
                        value={cantidad}
                        onChange={(e) => setCantidad(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario</label>
                      <Input
                        type="text"
                        disabled
                        value={
                          selectedProducto ? `C$${getPrecioUnitario().toFixed(2)}` : "-"
                        }
                      />
                    </div>
                  </div>

                  <Button onClick={agregarLinea} className="w-full bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar al carrito
                  </Button>
                </div>
              </Card>

              {/* Tabla de líneas */}
              <Card className="p-6 bg-white">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Carrito</h2>
                {lineas.length === 0 ? (
                  <p className="text-gray-500">Sin productos agregados</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-200">
                        <tr>
                          <th className="text-left py-2">Producto</th>
                          <th className="text-right py-2">Cantidad</th>
                          <th className="text-right py-2">Precio</th>
                          <th className="text-right py-2">Subtotal</th>
                          <th className="py-2">Acción</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineas.map((linea, idx) => (
                          <tr key={idx} className="border-b border-gray-100">
                            <td className="py-2">
                              {linea.nombre}
                              <span className="text-xs text-gray-500 ml-2">({linea.tipoUnidad})</span>
                            </td>
                            <td className="text-right">{linea.cantidad}</td>
                            <td className="text-right">C${linea.precioUnitario.toFixed(2)}</td>
                            <td className="text-right font-medium">C${linea.subtotal.toFixed(2)}</td>
                            <td className="text-center">
                              <Button size="sm" variant="ghost" onClick={() => eliminarLinea(idx)}>
                                <Trash2 className="w-4 h-4 text-red-600" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="mt-4 pt-4 border-t text-right">
                      <p className="text-lg font-bold">Total: C${total.toFixed(2)}</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Panel derecho: Información de venta */}
            <div className="col-span-1">
              <Card className="p-6 bg-white sticky top-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Información de Venta</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente (Opcional)</label>
                    <select
                      value={selectedCliente}
                      onChange={(e) => setSelectedCliente(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="">Sin cliente</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombreCompleto}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                    >
                      <option value="EFECTIVO">Efectivo</option>
                      <option value="TARJETA">Tarjeta</option>
                      <option value="TRANSFERENCIA">Transferencia</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Podólogo (Opcional)</label>
                    <Input
                      value={nombrePodologo}
                      onChange={(e) => setNombrePodologo(e.target.value)}
                      placeholder="Nombre del podólogo"
                      className="text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1"># Receta (Opcional)</label>
                    <Input
                      value={numeroReceta}
                      onChange={(e) => setNumeroReceta(e.target.value)}
                      placeholder="Número de receta"
                      className="text-sm"
                    />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm mb-2">
                      <p className="text-gray-600">Productos</p>
                      <p className="text-2xl font-bold text-gray-900">{lineas.length}</p>
                    </div>
                    <div className="text-sm">
                      <p className="text-gray-600">Total</p>
                      <p className="text-2xl font-bold text-green-600">C${total.toFixed(2)}</p>
                    </div>
                  </div>

                  <Button
                    onClick={handleRegistrarVenta}
                    disabled={procesando || lineas.length === 0}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    {procesando ? "Procesando..." : "Registrar Venta"}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
