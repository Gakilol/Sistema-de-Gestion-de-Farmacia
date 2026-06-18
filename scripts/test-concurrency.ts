import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando Prueba de Concurrencia y Bloqueos de Transacción (SELECT FOR UPDATE)...')

  // Buscar un usuario para las transacciones
  const usuario = await prisma.usuario.findFirst()
  if (!usuario) {
    console.error('❌ Error: Debe haber al menos un usuario en la base de datos para correr la prueba.')
    process.exit(1)
  }

  // 1. Ejecutar prueba con 5, 10 y 20 usuarios concurrentes
  const testCases = [5, 10, 20]

  for (const numUsers of testCases) {
    console.log(`\n-------------------------------------------------------------`)
    console.log(`🏃 Ejecutando prueba de concurrencia con ${numUsers} ventas simultáneas...`)
    
    // Crear un producto de prueba nuevo
    const stockInicial = 15 // Stock disponible
    const cantPorVenta = 2  // Cada usuario intenta comprar 2 unidades
    // Capacidad máxima de ventas exitosas: limitada por stock disponible o número de usuarios
    const maxVentasExitosas = Math.min(numUsers, Math.floor(stockInicial / cantPorVenta))

    const prod = await prisma.producto.create({
      data: {
        nombre: `Prod Concurrente ${numUsers} - ${Date.now()}`,
        codigoBarras: `BAR-CONC-${numUsers}-${Date.now()}`,
        descripcion: 'Producto para prueba de concurrencia y locking pesimista',
        idCategoria: 1, // Usar primera categoría
        precioCompra: 50.00,
        precioVenta: 100.00,
        stockActual: stockInicial,
        stockMinimo: 5,
        activo: true,
        lotes: {
          create: {
            codigoLote: `LOTE-CONC-${numUsers}`,
            fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Vence en 1 año
            stockInicial: stockInicial,
            stockActual: stockInicial,
            costoCompra: 50.00,
            activo: true
          }
        }
      },
      include: { lotes: true }
    })

    const lote = prod.lotes[0]
    console.log(`📦 Creado producto #${prod.id} con ${stockInicial} unidades en el lote ${lote.codigoLote}.`)

    // Lanzar numUsers promesas en paralelo
    console.log(`⚡ Ejecutando ${numUsers} solicitudes de venta en paralelo...`)
    
    const promises = Array.from({ length: numUsers }).map(async (_, idx) => {
      // Intentar realizar la venta usando la lógica exacta con lock SELECT FOR UPDATE
      try {
        return await prisma.$transaction(async (tx) => {
          // 1. Bloqueo pesimista determinista
          await tx.$executeRawUnsafe(
            `SELECT id FROM "Producto" WHERE id = ${prod.id} FOR UPDATE`
          )
          await tx.$executeRawUnsafe(
            `SELECT id FROM "Lote" WHERE id = ${lote.id} FOR UPDATE`
          )

          // 2. Obtener estado actual post-lock
          const dbProd = await tx.producto.findUnique({
            where: { id: prod.id },
            select: { stockActual: true }
          })

          if (!dbProd || dbProd.stockActual < cantPorVenta) {
            throw new Error('STOCK_INSUFICIENTE')
          }

          // 3. Crear Venta
          const venta = await tx.venta.create({
            data: {
              fecha: new Date(),
              idCliente: null,
              total: prod.precioVenta.toNumber() * cantPorVenta,
              metodoPago: 'EFECTIVO',
              idUsuario: usuario.id,
              detalles: {
                create: {
                  idProducto: prod.id,
                  cantidad: cantPorVenta,
                  precioUnitario: prod.precioVenta,
                  subtotal: prod.precioVenta.toNumber() * cantPorVenta,
                  tipoUnidad: 'UNIDAD'
                }
              }
            }
          })

          // Deducción del lote
          await tx.lote.update({
            where: { id: lote.id },
            data: {
              stockActual: { decrement: cantPorVenta }
            }
          })

          // Decremento de producto
          await tx.producto.update({
            where: { id: prod.id },
            data: {
              stockActual: { decrement: cantPorVenta }
            }
          })

          // Kardex
          await tx.movimientoInventario.create({
            data: {
              idProducto: prod.id,
              idLote: lote.id,
              tipo: 'SALIDA_VENTA',
              cantidad: cantPorVenta,
              stockResultante: dbProd.stockActual - cantPorVenta,
              costoUnitario: lote.costoCompra,
              referencia: `Venta Concurrente #${venta.id}`,
              idUsuario: usuario.id,
              observacion: `Venta paralela por usuario #${idx + 1}`
            }
          })

          return { success: true, error: null }
        })
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    })

    const results = await Promise.all(promises)

    const exitosas = results.filter(r => r.success).length
    const fallidas = results.filter(r => !r.success && r.error === 'STOCK_INSUFICIENTE').length
    const otrosErrores = results.filter(r => !r.success && r.error !== 'STOCK_INSUFICIENTE')

    console.log(`📊 Resultados para ${numUsers} usuarios:`)
    console.log(`  - Ventas Exitosas: ${exitosas} (Esperado: ${maxVentasExitosas})`)
    console.log(`  - Ventas Rechazadas por Stock: ${fallidas} (Esperado: ${numUsers - maxVentasExitosas})`)
    console.log(`  - Otros Errores/Deadlocks: ${otrosErrores.length}`)
    if (otrosErrores.length > 0) {
      console.log('Detalle de otros errores:', otrosErrores)
    }

    // Validar estado final
    const finalProd = await prisma.producto.findUnique({
      where: { id: prod.id },
      include: { lotes: true }
    })

    const finalStock = finalProd?.stockActual || 0
    const finalLoteStock = finalProd?.lotes[0]?.stockActual || 0
    const stockEsperado = stockInicial - (exitosas * cantPorVenta)

    console.log(`🔎 Estado Final del Producto:`)
    console.log(`  - Stock Producto: ${finalStock} (Esperado: ${stockEsperado})`)
    console.log(`  - Stock Lote: ${finalLoteStock} (Esperado: ${stockEsperado})`)

    // Assertions
    if (finalStock < 0 || finalLoteStock < 0) {
      throw new Error('❌ ERROR DE CONCURRENCIA: ¡El stock quedó negativo!')
    }
    if (finalStock !== finalLoteStock) {
      throw new Error('❌ ERROR DE CONCURRENCIA: Inconsistencia entre Producto y Lote')
    }
    if (exitosas !== maxVentasExitosas) {
      throw new Error(`❌ ERROR DE CONCURRENCIA: Se completaron ${exitosas} ventas cuando el máximo debía ser ${maxVentasExitosas}`)
    }
    if (otrosErrores.length > 0) {
      throw new Error(`❌ ERROR DE CONCURRENCIA: Ocurrieron errores de base de datos o deadlocks (${otrosErrores.length})`)
    }

    console.log(`✅ Prueba con ${numUsers} usuarios concurrentes completada exitosamente sin inconsistencias ni deadlocks.`)

    // Limpieza del caso de prueba
    const pId = prod.id
    await prisma.movimientoInventario.deleteMany({ where: { idProducto: pId } })
    await prisma.lote.deleteMany({ where: { idProducto: pId } })
    
    const dVentas = await prisma.detalleVenta.findMany({ where: { idProducto: pId } })
    const vIds = dVentas.map(dv => dv.idVenta)
    await prisma.detalleVenta.deleteMany({ where: { idProducto: pId } })
    await prisma.venta.deleteMany({ where: { id: { in: vIds } } })
    await prisma.producto.deleteMany({ where: { id: pId } })
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE CONCURRENCIA Y BLOQUEOS PASARON EXITOSAMENTE! 🎉')
  await prisma.$disconnect()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
