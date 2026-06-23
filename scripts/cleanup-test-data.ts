import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const PREFIX = 'QA_TEST_'

async function main() {
  console.log('🧹 Iniciando limpieza selectiva de datos de prueba (QA/Staging)...')

  // ==========================================================================
  // REGLA DE SEGURIDAD 1 & 2: Validar entorno y prevenir ejecución en producción
  // ==========================================================================
  const isProdEnv = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
  if (isProdEnv) {
    console.error('❌ ERROR CRÍTICO: No se puede ejecutar la limpieza en un entorno configurado como producción.')
    process.exit(1)
  }

  // Identificar IDs de registros de prueba antes de borrar para evitar borrar de más
  const testUsers = await prisma.usuario.findMany({
    where: {
      OR: [
        { nombreCompleto: { startsWith: PREFIX } },
        { correo: { endsWith: '@example.test' } }
      ]
    },
    select: { id: true, correo: true }
  })
  const testUserIds = testUsers.map(u => u.id)
  const testUserEmails = testUsers.map(u => u.correo)

  const testClients = await prisma.cliente.findMany({
    where: {
      OR: [
        { nombreCompleto: { startsWith: PREFIX } },
        { correo: { endsWith: '@example.test' } }
      ]
    },
    select: { id: true }
  })
  const testClientIds = testClients.map(c => c.id)

  const testProviders = await prisma.proveedor.findMany({
    where: { nombre: { startsWith: PREFIX } },
    select: { id: true }
  })
  const testProviderIds = testProviders.map(p => p.id)

  const testProducts = await prisma.producto.findMany({
    where: { nombre: { startsWith: PREFIX } },
    select: { id: true }
  })
  const testProductIds = testProducts.map(p => p.id)

  const testCategories = await prisma.categoriaProducto.findMany({
    where: { nombre: { startsWith: PREFIX } },
    select: { id: true }
  })
  const testCategoryIds = testCategories.map(c => c.id)

  console.log(`📋 Registros identificados para eliminación:`)
  console.log(`  - Usuarios: ${testUsers.length}`)
  console.log(`  - Clientes: ${testClients.length}`)
  console.log(`  - Proveedores: ${testProviders.length}`)
  console.log(`  - Productos: ${testProducts.length}`)
  console.log(`  - Categorías: ${testCategories.length}`)

  // Borrar movimientos e inventario del producto
  console.log('🔄 Ejecutando borrado en cascada manual...');

  // 1. Movimientos de inventario vinculados a productos de prueba o a usuarios de prueba
  let movCount = 0
  if (testProductIds.length > 0 || testUserIds.length > 0) {
    const res = await prisma.movimientoInventario.deleteMany({
      where: {
        OR: [
          { idProducto: { in: testProductIds } },
          { idUsuario: { in: testUserIds } }
        ]
      }
    })
    movCount = res.count
  }

  // 2. Lotes vinculados a productos de prueba
  let loteCount = 0
  if (testProductIds.length > 0) {
    const res = await prisma.lote.deleteMany({
      where: { idProducto: { in: testProductIds } }
    })
    loteCount = res.count
  }

  // 3. Detalles de Venta de productos de prueba
  let detVentaCount = 0
  if (testProductIds.length > 0) {
    const res = await prisma.detalleVenta.deleteMany({
      where: { idProducto: { in: testProductIds } }
    })
    detVentaCount = res.count
  }

  // 4. Detalles de Compra de productos de prueba
  let detCompraCount = 0
  if (testProductIds.length > 0) {
    const res = await prisma.detalleCompra.deleteMany({
      where: { idProducto: { in: testProductIds } }
    })
    detCompraCount = res.count
  }

  // 5. ProveedorProducto de productos o proveedores de prueba
  if (testProductIds.length > 0 || testProviderIds.length > 0) {
    await prisma.proveedorProducto.deleteMany({
      where: {
        OR: [
          { idProducto: { in: testProductIds } },
          { idProveedor: { in: testProviderIds } }
        ]
      }
    })
  }

  // 6. Ventas vinculadas a usuarios de prueba o clientes de prueba
  let ventaCount = 0
  if (testUserIds.length > 0 || testClientIds.length > 0) {
    const res = await prisma.venta.deleteMany({
      where: {
        OR: [
          { idUsuario: { in: testUserIds } },
          { idCliente: { in: testClientIds } }
        ]
      }
    })
    ventaCount = res.count
  }

  // 7. Compras vinculadas a usuarios de prueba o proveedores de prueba
  let compraCount = 0
  if (testUserIds.length > 0 || testProviderIds.length > 0) {
    const res = await prisma.compra.deleteMany({
      where: {
        OR: [
          { idUsuario: { in: testUserIds } },
          { idProveedor: { in: testProviderIds } }
        ]
      }
    })
    compraCount = res.count
  }

  // 8. AuditoriaLog vinculados a usuarios de prueba
  if (testUserIds.length > 0) {
    await prisma.auditoriaLog.deleteMany({
      where: { idUsuario: { in: testUserIds } }
    })
  }

  // 9. Limpieza de Auditoría transaccional de triggers
  if (testUserEmails.length > 0) {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Auditoria" 
      WHERE usuario IN (${testUserEmails.map(e => `'${e}'`).join(',')}) 
         OR usuario LIKE 'QA_TEST_%'
    `)
  }

  // 10. Tokens de restauración de contraseña vinculados a correos de prueba
  await prisma.passwordResetToken.deleteMany({
    where: { correo: { endsWith: '@example.test' } }
  })
  await prisma.passwordResetRequest.deleteMany({
    where: { correo: { endsWith: '@example.test' } }
  })

  // 11. Productos
  if (testProductIds.length > 0) {
    await prisma.producto.deleteMany({ where: { id: { in: testProductIds } } })
  }

  // 12. Categorías
  if (testCategoryIds.length > 0) {
    await prisma.categoriaProducto.deleteMany({ where: { id: { in: testCategoryIds } } })
  }

  // 13. Clientes
  if (testClientIds.length > 0) {
    await prisma.cliente.deleteMany({ where: { id: { in: testClientIds } } })
  }

  // 14. Proveedores
  if (testProviderIds.length > 0) {
    await prisma.proveedor.deleteMany({ where: { id: { in: testProviderIds } } })
  }

  // 15. Usuarios
  if (testUserIds.length > 0) {
    await prisma.usuario.deleteMany({ where: { id: { in: testUserIds } } })
  }

  console.log('✅ Resumen de Limpieza de Datos de Prueba:')
  console.log(`  - Productos eliminados: ${testProducts.length}`)
  console.log(`  - Lotes eliminados: ${loteCount}`)
  console.log(`  - Movimientos de Kardex eliminados: ${movCount}`)
  console.log(`  - Ventas eliminadas: ${ventaCount}`)
  console.log(`  - Detalles de Ventas eliminados: ${detVentaCount}`)
  console.log(`  - Compras eliminadas: ${compraCount}`)
  console.log(`  - Detalles de Compras eliminados: ${detCompraCount}`)
  console.log(`  - Clientes eliminados: ${testClients.length}`)
  console.log(`  - Proveedores eliminados: ${testProviders.length}`)
  console.log(`  - Categorías eliminadas: ${testCategories.length}`)
  console.log(`  - Usuarios eliminados: ${testUsers.length}`)

  console.log('🎉 ¡LIMPIEZA DE DATOS DE PRUEBA COMPLETADA EXITOSAMENTE! 🎉')
}

main()
  .catch((e) => {
    console.error('❌ Error catastrófico durante la limpieza de datos de prueba:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
