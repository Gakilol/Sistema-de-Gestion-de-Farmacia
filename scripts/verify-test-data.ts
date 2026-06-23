import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const PREFIX = 'QA_TEST_'

async function main() {
  console.log('🔎 INICIANDO VERIFICACIÓN DE INTEGRIDAD DE DATOS DE PRUEBA (QA)...')

  // Cargar datos de prueba
  const testUsers = await prisma.usuario.findMany({
    where: { nombreCompleto: { startsWith: PREFIX } }
  })
  const testClients = await prisma.cliente.findMany({
    where: { nombreCompleto: { startsWith: PREFIX } }
  })
  const testProviders = await prisma.proveedor.findMany({
    where: { nombre: { startsWith: PREFIX } }
  })
  const testCategories = await prisma.categoriaProducto.findMany({
    where: { nombre: { startsWith: PREFIX } }
  })
  const testProducts = await prisma.producto.findMany({
    where: { nombre: { startsWith: PREFIX } },
    include: { lotes: true }
  })

  const testUserIds = testUsers.map(u => u.id)
  const testProductIds = testProducts.map(p => p.id)
  const testClientIds = testClients.map(c => c.id)
  const testProviderIds = testProviders.map(p => p.id)

  const testPurchases = await prisma.compra.findMany({
    where: { idUsuario: { in: testUserIds } },
    include: { detalles: true }
  })
  const testSales = await prisma.venta.findMany({
    where: { idUsuario: { in: testUserIds } },
    include: { detalles: true }
  })
  const testMovements = await prisma.movimientoInventario.findMany({
    where: { idProducto: { in: testProductIds } }
  })
  const testAuditLogs = await prisma.auditoriaLog.findMany({
    where: { idUsuario: { in: testUserIds } }
  })

  // Contadores
  console.log('\n📊 RESUMEN DE REGISTROS DE PRUEBA ENCONTRADOS:')
  console.log(`- Usuarios creados: ${testUsers.length}`)
  console.log(`- Clientes creados: ${testClients.length}`)
  console.log(`- Proveedores creados: ${testProviders.length}`)
  console.log(`- Categorías creadas: ${testCategories.length}`)
  console.log(`- Productos creados: ${testProducts.length}`)
  console.log(`- Compras creadas: ${testPurchases.length}`)
  console.log(`- Ventas creadas: ${testSales.length}`)
  console.log(`- Movimientos de Kardex creados: ${testMovements.length}`)
  console.log(`- Logs de Auditoría creados: ${testAuditLogs.length}`)

  // Desglosar perfiles de stock de productos
  console.log('\n📋 CLASIFICACIÓN DE PRODUCTOS POR PERFIL DE STOCK:')
  
  const normalProds = testProducts.filter(p => p.nombre.includes('Paracetamol_'))
  const lowStockProds = testProducts.filter(p => p.nombre.includes('Amoxicilina_'))
  const zeroStockProds = testProducts.filter(p => p.nombre.includes('Vitamina_C_'))
  const expiringProds = testProducts.filter(p => p.nombre.includes('Jarabe_Tos_'))
  const expiredProds = testProducts.filter(p => p.nombre.includes('Crema_Tópica_'))
  const multiBatchProds = testProducts.filter(p => p.nombre.includes('Gasas_Estériles_'))
  const concurrencyProds = testProducts.filter(p => p.nombre.includes('Alcohol_Glicerinado_'))

  console.log(`  - Stock normal (Paracetamol): ${normalProds.length} (Esperado: 40)`)
  console.log(`  - Stock bajo (Amoxicilina): ${lowStockProds.length} (Esperado: 10)`)
  console.log(`  - Stock cero (Vitamina C): ${zeroStockProds.length} (Esperado: 5)`)
  console.log(`  - Próximos a vencer (Jarabe Tos): ${expiringProds.length} (Esperado: 5)`)
  console.log(`  - Vencidos (Crema Tópica): ${expiredProds.length} (Esperado: 5)`)
  console.log(`  - Múltiples lotes (Gasas Estériles): ${multiBatchProds.length} (Esperado: 10)`)
  console.log(`  - Alta rotación/concurrencia (Alcohol Glic.): ${concurrencyProds.length} (Esperado: 5)`)

  // Validaciones de Lógica de Negocio
  console.log('\n🛡️ INICIANDO COMPROBACIONES DE INTEGRIDAD LÓGICA:')
  let failures = 0

  // 1. Verificar duplicados de códigos de barra o nombres en catálogo QA
  const barcodes = testProducts.map(p => p.codigoBarras).filter(Boolean) as string[]
  const dupBarcodes = barcodes.filter((item, index) => barcodes.indexOf(item) !== index)
  if (dupBarcodes.length > 0) {
    console.error(`❌ FALLA: Códigos de barra duplicados en datos QA: ${dupBarcodes.join(', ')}`)
    failures++
  } else {
    console.log('✅ Correcto: No hay códigos de barra duplicados en catálogo de pruebas.')
  }

  // 2. Verificar que no haya stock negativo
  const negativeStockProducts = testProducts.filter(p => p.stockActual < 0)
  if (negativeStockProducts.length > 0) {
    console.error(`❌ FALLA: Se encontraron productos con stock negativo: ${negativeStockProducts.map(p => `${p.nombre} (${p.stockActual})`).join(', ')}`)
    failures++
  } else {
    console.log('✅ Correcto: No hay productos con stock negativo.')
  }

  // 3. Verificar que stockActual en Producto equivalga a la suma de stockActual en sus lotes activos
  let mismatchStockCount = 0
  for (const p of testProducts) {
    const sumLotes = p.lotes.reduce((acc, l) => acc + l.stockActual, 0)
    if (p.stockActual !== sumLotes) {
      console.error(`❌ FALLA: Desbalance de stock en producto "${p.nombre}" (ID: ${p.id}). Producto stock: ${p.stockActual}, Suma lotes stock: ${sumLotes}`)
      mismatchStockCount++
      failures++
    }
  }
  if (mismatchStockCount === 0) {
    console.log('✅ Correcto: El stock general coincide al 100% con la sumatoria de sus lotes.')
  }

  // 4. Verificar que no haya ventas vacías (sin detalles)
  const emptySales = testSales.filter(s => s.detalles.length === 0)
  if (emptySales.length > 0) {
    console.error(`❌ FALLA: Se encontraron ventas de prueba sin detalles asociados: ${emptySales.map(s => s.id).join(', ')}`)
    failures++
  } else {
    console.log('✅ Correcto: Todas las ventas simuladas tienen detalles asociados.')
  }

  // 5. Verificar que no haya compras vacías (sin detalles)
  const emptyPurchases = testPurchases.filter(cp => cp.detalles.length === 0)
  if (emptyPurchases.length > 0) {
    console.error(`❌ FALLA: Se encontraron compras de prueba sin detalles asociados: ${emptyPurchases.map(cp => cp.id).join(', ')}`)
    failures++
  } else {
    console.log('✅ Correcto: Todas las compras simuladas tienen detalles asociados.')
  }

  // 6. Verificar relaciones válidas
  const invalidProviderPurchases = testPurchases.filter(p => !testProviderIds.includes(p.idProveedor))
  if (invalidProviderPurchases.length > 0) {
    console.error(`❌ FALLA: Se encontraron compras con proveedores no pertenecientes a QA: ${invalidProviderPurchases.map(p => p.id).join(', ')}`)
    failures++
  } else {
    console.log('✅ Correcto: Las relaciones Compra -> Proveedor son coherentes.')
  }

  // 7. Verificar que el precio de venta sea mayor o igual al precio de compra
  const underpricedProducts = testProducts.filter(p => Number(p.precioVenta) < Number(p.precioCompra))
  if (underpricedProducts.length > 0) {
    console.error(`❌ FALLA: Se encontraron productos con precio de venta inferior al de compra: ${underpricedProducts.map(p => `${p.nombre} (V: ${p.precioVenta}, C: ${p.precioCompra})`).join(', ')}`)
    failures++
  } else {
    console.log('✅ Correcto: Los precios de venta son coherentes (mayores al costo de compra).')
  }

  // 8. Verificar que no se hayan vendido productos con lotes vencidos
  let soldExpired = 0
  const ahora = new Date()
  for (const sale of testSales) {
    if (sale.estado === 'ANULADA') continue
    for (const det of sale.detalles) {
      // Buscar movimientos asociados a esta venta y producto
      const movs = testMovements.filter(m => m.referencia === `Venta #${sale.id}` && m.idProducto === det.idProducto)
      for (const m of movs) {
        if (m.idLote) {
          const lote = await prisma.lote.findUnique({ where: { id: m.idLote } })
          if (lote && lote.fechaVencimiento && lote.fechaVencimiento <= ahora) {
            console.error(`❌ FALLA: Se detectó venta de lote vencido. Venta #${sale.id}, Producto: ${det.idProducto}, Lote: ${lote.codigoLote}, Expiró: ${lote.fechaVencimiento}`)
            soldExpired++
            failures++
          }
        }
      }
    }
  }
  if (soldExpired === 0) {
    console.log('✅ Correcto: No se registraron ventas de lotes vencidos en las transacciones completadas.')
  }

  // Reporte Final de integridad
  console.log('\n======================================================================')
  if (failures === 0) {
    console.log('🎉 RESULTADO DE LA VALIDACIÓN: ¡EXITOSA! Datos 100% íntegros.')
  } else {
    console.error(`❌ RESULTADO DE LA VALIDACIÓN: ¡FALLIDA! Se detectaron ${failures} problemas de integridad lógica.`)
  }
  console.log('======================================================================')

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error('❌ Error catastrófico durante la validación de datos:', e)
  process.exit(1)
})
