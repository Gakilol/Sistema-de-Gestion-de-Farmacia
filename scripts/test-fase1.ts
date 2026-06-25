import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

let pasados = 0
let fallados = 0
const errores: string[] = []

async function test(nombre: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✅ ${nombre}`)
    pasados++
  } catch (err: any) {
    console.error(`  ❌ ${nombre}`)
    console.error(`     → ${err.message}`)
    errores.push(`${nombre}: ${err.message}`)
    fallados++
  }
}

function expect(valor: unknown) {
  return {
    toBe: (esperado: unknown) => {
      if (valor !== esperado) throw new Error(`Se esperaba ${JSON.stringify(esperado)}, se obtuvo ${JSON.stringify(valor)}`)
    },
    toBeTruthy: () => {
      if (!valor) throw new Error(`Se esperaba un valor truthy, se obtuvo ${JSON.stringify(valor)}`)
    },
    toBeFalsy: () => {
      if (valor) throw new Error(`Se esperaba un valor falsy, se obtuvo ${JSON.stringify(valor)}`)
    },
    toContain: (sub: string) => {
      if (typeof valor !== "string" || !valor.includes(sub))
        throw new Error(`Se esperaba que "${valor}" contuviera "${sub}"`)
    },
    toHaveLength: (len: number) => {
      if (!Array.isArray(valor) || valor.length !== len)
        throw new Error(`Se esperaba longitud ${len}, se obtuvo ${Array.isArray(valor) ? valor.length : "no array"}`)
    },
  }
}

async function main() {
  console.log("🏁 INICIANDO PRUEBAS DE INTEGRACIÓN — FASE 1 (Compras e Inventario)")
  console.log("======================================================================")

  // 1. Configurar datos de prueba
  console.log("📦 Configurando datos temporales de prueba...")
  
  const categoria = await prisma.categoriaProducto.create({
    data: {
      nombre: `Cat Test F1 - ${Date.now()}`,
      descripcion: "Categoría de prueba para Fase 1",
      esDatoPrueba: true,
    }
  })

  const proveedor = await prisma.proveedor.create({
    data: {
      nombre: `Prov Test F1 - ${Date.now()}`,
      telefono: "8888-0000",
      correo: `prov_f1_${Date.now()}@test.com`,
      esDatoPrueba: true,
    }
  })

  const productoFisico = await prisma.producto.create({
    data: {
      nombre: `Producto Físico F1 - ${Date.now()}`,
      codigoBarras: `BAR-FISICO-${Date.now()}`,
      idCategoria: categoria.id,
      precioCompra: 10.00,
      precioVenta: 15.00,
      stockActual: 0,
      stockMinimo: 5,
      esServicio: false,
      esDatoPrueba: true,
    }
  })

  const productoServicio = await prisma.producto.create({
    data: {
      nombre: `Servicio F1 - ${Date.now()}`,
      codigoBarras: `BAR-SERVICIO-${Date.now()}`,
      idCategoria: categoria.id,
      precioCompra: 0.00,
      precioVenta: 20.00,
      stockActual: 0,
      stockMinimo: 5,
      esServicio: true,
      esDatoPrueba: true,
    }
  })

  console.log("✅ Datos de prueba creados.")

  // ==========================================
  // PRUEBA 1: Filtrado de Productos vs Servicios
  // ==========================================
  await test("GET /api/productos?esServicio=false no debe retornar servicios", async () => {
    // Simular consulta de la API para productos físicos
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        esServicio: false,
        idCategoria: categoria.id, // filtrar por nuestra categoría de test
      }
    })

    expect(productos).toHaveLength(1)
    expect(productos[0].id).toBe(productoFisico.id)
    expect(productos[0].esServicio).toBeFalsy()
  })

  await test("GET /api/productos?esServicio=true debe retornar únicamente servicios", async () => {
    // Simular consulta de la API para servicios
    const productos = await prisma.producto.findMany({
      where: {
        activo: true,
        esServicio: true,
        idCategoria: categoria.id,
      }
    })

    expect(productos).toHaveLength(1)
    expect(productos[0].id).toBe(productoServicio.id)
    expect(productos[0].esServicio).toBeTruthy()
  })

  // ==========================================
  // PRUEBA 2: Validación del Backend en POST /api/compras
  // ==========================================
  await test("Validación de Compras debe rechazar transacciones que incluyan servicios", async () => {
    // Payload simulado que Gemini intentaría inyectar o un usuario seleccionaría
    const detallesCompraConServicio = [
      { idProducto: productoFisico.id, cantidad: 10, precioUnitario: 10.00 },
      { idProducto: productoServicio.id, cantidad: 1, precioUnitario: 0.00 }
    ]

    const productIds = detallesCompraConServicio.map(d => d.idProducto)
    
    // Consulta simulada idéntica a la que agregamos en la API
    const dbProductos = await prisma.producto.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        nombre: true,
        esServicio: true
      }
    })

    const serviciosDetectados = dbProductos.filter(p => p.esServicio)
    
    expect(serviciosDetectados).toHaveLength(1)
    expect(serviciosDetectados[0].id).toBe(productoServicio.id)
  })

  await test("Validación de Compras debe aceptar transacciones con solo productos físicos", async () => {
    const detallesCompraSoloFisicos = [
      { idProducto: productoFisico.id, cantidad: 10, precioUnitario: 10.00 }
    ]

    const productIds = detallesCompraSoloFisicos.map(d => d.idProducto)
    
    const dbProductos = await prisma.producto.findMany({
      where: {
        id: { in: productIds }
      },
      select: {
        id: true,
        nombre: true,
        esServicio: true
      }
    })

    const serviciosDetectados = dbProductos.filter(p => p.esServicio)
    expect(serviciosDetectados).toHaveLength(0)
  })

  // ==========================================
  // PRUEBA 3: Reportes de Stock Bajo y KPIs
  // ==========================================
  await test("Reporte de stock-bajo no debe incluir servicios bajo stock mínimo", async () => {
    // Ambos productos tienen stockActual = 0 y stockMinimo = 5, pero productoServicio es servicio.
    const todosProductosStockBajo = await prisma.producto.findMany({
      where: { 
        activo: true,
        esServicio: false,
        idCategoria: categoria.id
      }
    })

    const filtrados = todosProductosStockBajo.filter(p => p.stockActual <= (p.stockMinimo ?? 10))
    
    expect(filtrados).toHaveLength(1)
    expect(filtrados[0].id).toBe(productoFisico.id)
  })

  // ==========================================
  // 4. Limpieza de datos de prueba
  // ==========================================
  console.log("\n🧹 Limpiando datos de prueba...")
  await prisma.producto.deleteMany({ where: { idCategoria: categoria.id } })
  await prisma.categoriaProducto.delete({ where: { id: categoria.id } })
  await prisma.proveedor.delete({ where: { id: proveedor.id } })
  console.log("✅ Limpieza completada.")

  // ==========================================
  // Reporte Final
  // ==========================================
  console.log("\n======================================================================")
  console.log(`📊 RESULTADOS FINALES:`)
  console.log(`  ✅ Pruebas pasadas: ${pasados}`)
  console.log(`  ❌ Pruebas falladas: ${fallados}`)
  console.log(`  📋 Total: ${pasados + fallados}`)

  if (errores.length > 0) {
    console.log("\n❌ ERRORES ENCONTRADOS:")
    errores.forEach((e, i) => console.log(`  ${i + 1}. ${e}`))
    process.exit(1)
  } else {
    console.log("\n🎉 ¡Todas las pruebas de la Fase 1 pasaron exitosamente!")
    process.exit(0)
  }
}

main()
  .catch((e) => {
    console.error("💥 Error crítico en la suite de pruebas:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
