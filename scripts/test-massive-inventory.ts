import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando Prueba de Carga Masiva e Invariantes de Inventario...')
  console.log('📊 Simulación: 500 Compras y 1000 Ventas...')

  // 1. Crear productos de prueba dedicados para no ensuciar datos de producción/semilla
  console.log('📦 Creando productos de prueba...')
  
  // Buscar o crear la categoría de prueba
  let categoria = await prisma.categoriaProducto.findFirst({
    where: { nombre: 'Pruebas Carga' }
  })
  if (!categoria) {
    categoria = await prisma.categoriaProducto.create({
      data: {
        nombre: 'Pruebas Carga',
        descripcion: 'Categoría para pruebas de carga masiva de inventario'
      }
    })
  }

  // Crear 3 productos
  const productos = []
  for (let i = 1; i <= 3; i++) {
    const prod = await prisma.producto.create({
      data: {
        nombre: `Producto de Carga ${i} - ${Date.now()}`,
        codigoBarras: `ABC-TEST-${i}-${Date.now()}`,
        descripcion: `Producto de prueba de carga número ${i}`,
        idCategoria: categoria.id,
        precioCompra: 50.00,
        precioVenta: 100.00,
        stockActual: 0,
        stockMinimo: 10,
        activo: true
      }
    })
    productos.push(prod)
  }

  console.log(`✅ Creados 3 productos de prueba. IDs: ${productos.map(p => p.id).join(', ')}`)

  // Buscar un proveedor y usuario para las transacciones
  const proveedor = await prisma.proveedor.findFirst()
  const usuario = await prisma.usuario.findFirst()

  if (!proveedor || !usuario) {
    console.error('❌ Error: Debe haber al menos un proveedor y un usuario en la base de datos para correr la prueba.')
    process.exit(1)
  }

  const numPurchases = 500
  const numSales = 1000
  let successfulPurchases = 0
  let successfulSales = 0
  let rejectedSales = 0

  // ── FASE 1: EJECUTAR 500 COMPRAS MASIVAS ──
  console.log(`\n📥 Fase 1: Registrando ${numPurchases} compras de forma secuencial...`)
  for (let i = 0; i < numPurchases; i++) {
    const pIdx = i % productos.length
    const producto = productos[pIdx]
    const cantidad = Math.floor(Math.random() * 10) + 1 // 1 a 10 unidades
    const precioUnitario = 50.00 + (Math.random() * 5) // precio levemente variable
    const loteCode = `LOTE-CARGA-${pIdx}-${i}`
    const expDate = new Date()
    expDate.setFullYear(expDate.getFullYear() + 2) // vence en 2 años

    try {
      await prisma.$transaction(async (tx) => {
        // Crear Compra
        const compra = await tx.compra.create({
          data: {
            fecha: new Date(),
            idProveedor: proveedor.id,
            idUsuario: usuario.id,
            total: precioUnitario * cantidad,
            detalles: {
              create: {
                idProducto: producto.id,
                cantidad,
                precioUnitario,
                subtotal: precioUnitario * cantidad,
                lote: loteCode,
                fechaVencimiento: expDate
              }
            }
          },
          include: { detalles: true }
        })

        const detalle = compra.detalles[0]

        // Crear lote
        const lote = await tx.lote.create({
          data: {
            idProducto: producto.id,
            codigoLote: loteCode,
            fechaVencimiento: expDate,
            stockInicial: cantidad,
            stockActual: cantidad,
            costoCompra: precioUnitario,
            idDetalleCompra: detalle.id,
            activo: true
          }
        })

        // Actualizar stock del producto
        await tx.producto.update({
          where: { id: producto.id },
          data: {
            stockActual: { increment: cantidad },
            precioCompra: precioUnitario
          }
        })

        // Kardex
        await tx.movimientoInventario.create({
          data: {
            idProducto: producto.id,
            idLote: lote.id,
            tipo: 'ENTRADA_COMPRA',
            cantidad,
            stockResultante: (await tx.producto.findUnique({ where: { id: producto.id } }))?.stockActual || 0,
            costoUnitario: precioUnitario,
            referencia: `Compra Test #${compra.id}`,
            idUsuario: usuario.id,
            observacion: 'Entrada masiva test'
          }
        })
      })
      successfulPurchases++
    } catch (e) {
      console.error(`Error en compra #${i}:`, e)
    }

    // Cada 100 compras, verificar invariantes
    if ((i + 1) % 100 === 0) {
      await checkInvariants(productos.map(p => p.id), `Compras: Paso ${i + 1}`)
    }
  }

  console.log(`✅ Compras completadas. Exitosas: ${successfulPurchases}/${numPurchases}`)

  // ── FASE 2: EJECUTAR 1000 VENTAS MASIVAS (FEFO) ──
  console.log(`\n📤 Fase 2: Registrando ${numSales} ventas (FEFO)...`)
  for (let i = 0; i < numSales; i++) {
    const pIdx = i % productos.length
    const producto = productos[pIdx]
    const cantidadVender = Math.floor(Math.random() * 5) + 1 // 1 a 5 unidades

    try {
      const res = await prisma.$transaction(async (tx) => {
        // Bloquear producto
        const prod = await tx.producto.findUnique({
          where: { id: producto.id }
        })

        if (!prod || prod.stockActual < cantidadVender) {
          rejectedSales++
          return { success: false, reason: 'Stock insuficiente' }
        }

        // Crear Venta
        const venta = await tx.venta.create({
          data: {
            fecha: new Date(),
            idCliente: null,
            total: prod.precioVenta.toNumber() * cantidadVender,
            metodoPago: 'EFECTIVO',
            idUsuario: usuario.id,
            detalles: {
              create: {
                idProducto: producto.id,
                cantidad: cantidadVender,
                precioUnitario: prod.precioVenta,
                subtotal: prod.precioVenta.toNumber() * cantidadVender,
                tipoUnidad: 'UNIDAD'
              }
            }
          }
        })

        // Deducción por lote (FEFO)
        let pendiente = cantidadVender
        const lotes = await tx.lote.findMany({
          where: { idProducto: producto.id, activo: true, stockActual: { gt: 0 } },
          orderBy: [
            { fechaVencimiento: 'asc' },
            { createdAt: 'asc' }
          ]
        })

        for (const lote of lotes) {
          if (pendiente <= 0) break

          const deducir = Math.min(pendiente, lote.stockActual)
          const nuevoStockLote = lote.stockActual - deducir

          // Actualizar lote
          await tx.lote.update({
            where: { id: lote.id },
            data: {
              stockActual: nuevoStockLote,
              activo: nuevoStockLote > 0
            }
          })

          // Kardex
          await tx.movimientoInventario.create({
            data: {
              idProducto: producto.id,
              idLote: lote.id,
              tipo: 'SALIDA_VENTA',
              cantidad: deducir,
              stockResultante: prod.stockActual - (cantidadVender - pendiente + deducir),
              costoUnitario: lote.costoCompra,
              referencia: `Venta Test #${venta.id}`,
              idUsuario: usuario.id,
              observacion: `Deducción test lote ${lote.codigoLote}`
            }
          })

          pendiente -= deducir
        }

        if (pendiente > 0) {
          throw new Error(`Inconsistencia: Quedó stock pendiente sin lote para deducir`)
        }

        // Decrementar stock general de producto
        await tx.producto.update({
          where: { id: producto.id },
          data: { stockActual: { decrement: cantidadVender } }
        })

        return { success: true }
      })

      if (res.success) {
        successfulSales++
      }
    } catch (e) {
      console.error(`Error en venta #${i}:`, e)
    }

    // Cada 200 ventas, verificar invariantes
    if ((i + 1) % 200 === 0) {
      await checkInvariants(productos.map(p => p.id), `Ventas: Paso ${i + 1}`)
    }
  }

  console.log(`✅ Ventas completadas. Exitosas: ${successfulSales}, Rechazadas (sin stock): ${rejectedSales}`)

  // ── FASE 3: AUDITORÍA FINAL ──
  console.log('\n🔍 Realizando Auditoría Final de los productos de prueba...')
  await checkInvariants(productos.map(p => p.id), 'Auditoría Final', true)

  // ── LIMPIEZA ──
  console.log('\n🧹 Limpiando registros de prueba de la base de datos...')
  const prodIds = productos.map(p => p.id)
  await prisma.movimientoInventario.deleteMany({ where: { idProducto: { in: prodIds } } })
  await prisma.lote.deleteMany({ where: { idProducto: { in: prodIds } } })
  
  // Para borrar DetalleVenta y Venta, borramos primero los detalles
  const detallesVenta = await prisma.detalleVenta.findMany({ where: { idProducto: { in: prodIds } } })
  const ventaIds = detallesVenta.map(dv => dv.idVenta)
  await prisma.detalleVenta.deleteMany({ where: { idProducto: { in: prodIds } } })
  await prisma.venta.deleteMany({ where: { id: { in: ventaIds } } })

  const detallesCompra = await prisma.detalleCompra.findMany({ where: { idProducto: { in: prodIds } } })
  const compraIds = detallesCompra.map(dc => dc.idCompra)
  await prisma.detalleCompra.deleteMany({ where: { idProducto: { in: prodIds } } })
  await prisma.compra.deleteMany({ where: { id: { in: compraIds } } })

  await prisma.producto.deleteMany({ where: { id: { in: prodIds } } })
  console.log('✅ Base de datos limpia de registros de prueba.')

  await prisma.$disconnect()
}

async function checkInvariants(productoIds: number[], stage: string, showDetails = false) {
  let isConsistent = true
  
  for (const id of productoIds) {
    const prod = await prisma.producto.findUnique({
      where: { id },
      include: { lotes: true }
    })

    if (!prod) continue

    const sumLotes = prod.lotes.reduce((acc, curr) => acc + curr.stockActual, 0)
    const stockActual = prod.stockActual

    if (showDetails) {
      console.log(`[${stage}] Producto: ${prod.nombre} | StockActual: ${stockActual} | Suma Lotes: ${sumLotes} | Lotes Totales: ${prod.lotes.length}`)
    }

    if (sumLotes !== stockActual) {
      console.error(`❌ INCONSISTENCIA ENCONTRADA EN: ${prod.nombre}. stockActual=${stockActual}, sum(Lotes)=${sumLotes}`)
      isConsistent = false
    }

    // Verificar que no haya stock negativo
    if (stockActual < 0) {
      console.error(`❌ STOCK NEGATIVO ENCONTRADO EN: ${prod.nombre}. stockActual=${stockActual}`)
      isConsistent = false
    }

    for (const lote of prod.lotes) {
      if (lote.stockActual < 0) {
        console.error(`❌ STOCK DE LOTE NEGATIVO: ${prod.nombre} Lote: ${lote.codigoLote} stockActual=${lote.stockActual}`)
        isConsistent = false
      }
    }
  }

  if (isConsistent) {
    console.log(`✅ [${stage}] Invariante de Inventario verificado con éxito ( stockActual == sum(Lote.stockActual) ).`)
  } else {
    throw new Error(`❌ Falló la validación de invariantes de inventario en etapa: ${stage}`)
  }
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
