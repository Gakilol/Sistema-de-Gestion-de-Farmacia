import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔎 INICIANDO VERIFICACIÓN DE INTEGRIDAD DE DATOS DE PRUEBA (esDatoPrueba: true)...')

  // Cargar datos de prueba
  const testUsers = await prisma.usuario.findMany({
    where: { esDatoPrueba: true }
  })
  const testClients = await prisma.cliente.findMany({
    where: { esDatoPrueba: true }
  })
  const testProviders = await prisma.proveedor.findMany({
    where: { esDatoPrueba: true }
  })
  const testCategories = await prisma.categoriaProducto.findMany({
    where: { esDatoPrueba: true }
  })
  const testProducts = await prisma.producto.findMany({
    where: { esDatoPrueba: true },
    include: { lotes: true }
  })
  const testCitas = await prisma.cita.findMany({
    where: { esDatoPrueba: true }
  })
  const testAtenciones = await prisma.atencionPodologica.findMany({
    where: { esDatoPrueba: true }
  })
  const testRecetas = await prisma.receta.findMany({
    where: { esDatoPrueba: true },
    include: { detalles: true }
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
  console.log(`- Citas creadas: ${testCitas.length}`)
  console.log(`- Atenciones SOAP creadas: ${testAtenciones.length}`)
  console.log(`- Recetas creadas: ${testRecetas.length}`)

  // Desglosar perfiles de stock de productos
  console.log('\n📋 CLASIFICACIÓN DE PRODUCTOS POR PERFIL DE STOCK:')
  
  const normalProds = testProducts.filter(p => p.nombre.includes('Paracetamol'))
  const lowStockProds = testProducts.filter(p => p.nombre.includes('Amoxicilina'))
  const zeroStockProds = testProducts.filter(p => p.nombre.includes('Vitamina_C') || p.nombre.includes('Vitamina C'))
  const expiringProds = testProducts.filter(p => p.nombre.includes('Jarabe_Tos') || p.nombre.includes('Jarabe para la Tos'))
  const expiredProds = testProducts.filter(p => p.nombre.includes('Crema_Tópica') || p.nombre.includes('Clotrimazol Crema') || p.nombre.includes('Hidrocortisona Crema') || p.nombre.includes('Barmicil Crema') || p.nombre.includes('Baycuten Crema') || p.nombre.includes('Quadriderm Crema'))
  const multiBatchProds = testProducts.filter(p => p.nombre.includes('Gasas') || p.nombre.includes('Vendas') || p.nombre.includes('Esparadrapo') || p.nombre.includes('Curitas') || p.nombre.includes('Algodón') || p.nombre.includes('Guantes') || p.nombre.includes('Mascarillas') || p.nombre.includes('Jeringas'))
  const concurrencyProds = testProducts.filter(p => p.nombre.includes('Alcohol') || p.nombre.includes('Gel Antiséptico') || p.nombre.includes('Jabón Líquido') || p.nombre.includes('Toallitas') || p.nombre.includes('Sanitizante'))

  console.log(`  - Stock normal (Paracetamol/Acetaminofén): ${normalProds.length}`)
  console.log(`  - Stock bajo (Amoxicilina/Antibióticos): ${lowStockProds.length}`)
  console.log(`  - Stock cero (Vitamina C): ${zeroStockProds.length}`)
  console.log(`  - Próximos a vencer: ${expiringProds.length}`)
  console.log(`  - Vencidos: ${expiredProds.length}`)
  console.log(`  - Múltiples lotes: ${multiBatchProds.length}`)
  console.log(`  - Alta rotación/concurrencia: ${concurrencyProds.length}`)

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

  // 3. Verificar que stockActual en Producto equivalga a la suma de stockActual en sus lotes activos (excluyendo servicios)
  let mismatchStockCount = 0
  for (const p of testProducts) {
    if (p.esServicio) continue; // Los servicios no tienen lotes reales
    const sumLotes = p.lotes.reduce((acc, l) => acc + l.stockActual, 0)
    if (p.stockActual !== sumLotes) {
      console.error(`❌ FALLA: Desbalance de stock en producto "${p.nombre}" (ID: ${p.id}). Producto stock: ${p.stockActual}, Suma lotes stock: ${sumLotes}`)
      mismatchStockCount++
      failures++
    }
  }
  if (mismatchStockCount === 0) {
    console.log('✅ Correcto: El stock general de productos físicos coincide al 100% con la sumatoria de sus lotes.')
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
