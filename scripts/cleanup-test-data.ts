import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Iniciando limpieza selectiva de datos de prueba en PostgreSQL (esDatoPrueba: true)...')

  const isProdEnv = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
  if (isProdEnv) {
    console.error('❌ ERROR CRÍTICO: No se puede ejecutar la limpieza en un entorno configurado como producción.')
    process.exit(1)
  }

  // Identificar registros marcados como datos de prueba
  const testUsers = await prisma.usuario.findMany({
    where: { esDatoPrueba: true },
    select: { id: true, correo: true }
  })
  const testUserIds = testUsers.map(u => u.id)
  const testUserEmails = testUsers.map(u => u.correo)

  const testClients = await prisma.cliente.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testClientIds = testClients.map(c => c.id)

  const testProviders = await prisma.proveedor.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testProviderIds = testProviders.map(p => p.id)

  const testProducts = await prisma.producto.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testProductIds = testProducts.map(p => p.id)

  const testCategories = await prisma.categoriaProducto.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testCategoryIds = testCategories.map(c => c.id)

  const testCitas = await prisma.cita.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testCitaIds = testCitas.map(c => c.id)

  const testAtenciones = await prisma.atencionPodologica.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testAtencionIds = testAtenciones.map(a => a.id)

  const testRecetas = await prisma.receta.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testRecetaIds = testRecetas.map(r => r.id)

  const testDevoluciones = await prisma.devolucionProveedor.findMany({
    where: { esDatoPrueba: true },
    select: { id: true }
  })
  const testDevolucionIds = testDevoluciones.map(d => d.id)

  console.log(`📋 Registros de prueba identificados para eliminación cascade:`)
  console.log(`  - Usuarios: ${testUsers.length}`)
  console.log(`  - Clientes: ${testClients.length}`)
  console.log(`  - Proveedores: ${testProviders.length}`)
  console.log(`  - Productos: ${testProducts.length}`)
  console.log(`  - Categorías: ${testCategories.length}`)
  console.log(`  - Citas: ${testCitas.length}`)
  console.log(`  - Atenciones SOAP: ${testAtenciones.length}`)
  console.log(`  - Recetas: ${testRecetas.length}`)
  console.log(`  - Devoluciones: ${testDevoluciones.length}`)

  console.log('🔄 Ejecutando borrado ordenado para mantener la integridad referencial...');

  // 1. Devoluciones a laboratorios
  if (testDevolucionIds.length > 0 || testProductIds.length > 0 || testUserIds.length > 0) {
    await prisma.devolucionProveedor.deleteMany({
      where: {
        OR: [
          { id: { in: testDevolucionIds } },
          { idProducto: { in: testProductIds } },
          { idUsuario: { in: testUserIds } }
        ]
      }
    })
  }

  // 2. Detalles de recetas
  if (testRecetaIds.length > 0 || testProductIds.length > 0) {
    await prisma.detalleReceta.deleteMany({
      where: {
        OR: [
          { idReceta: { in: testRecetaIds } },
          { idProducto: { in: testProductIds } }
        ]
      }
    })
  }

  // 3. Recetas
  if (testRecetaIds.length > 0 || testAtencionIds.length > 0 || testClientIds.length > 0 || testUserIds.length > 0) {
    await prisma.receta.deleteMany({
      where: {
        OR: [
          { id: { in: testRecetaIds } },
          { idAtencion: { in: testAtencionIds } },
          { idCliente: { in: testClientIds } },
          { idUsuario: { in: testUserIds } }
        ]
      }
    })
  }

  // 4. Atenciones Podológicas
  if (testAtencionIds.length > 0 || testCitaIds.length > 0 || testClientIds.length > 0 || testUserIds.length > 0) {
    await prisma.atencionPodologica.deleteMany({
      where: {
        OR: [
          { id: { in: testAtencionIds } },
          { idCita: { in: testCitaIds } },
          { idCliente: { in: testClientIds } },
          { idUsuario: { in: testUserIds } }
        ]
      }
    })
  }

  // 5. Citas
  if (testCitaIds.length > 0 || testClientIds.length > 0) {
    await prisma.cita.deleteMany({
      where: {
        OR: [
          { id: { in: testCitaIds } },
          { idCliente: { in: testClientIds } }
        ]
      }
    })
  }

  // 6. DetalleVentaLote
  if (testProductIds.length > 0) {
    await prisma.detalleVentaLote.deleteMany({
      where: {
        lote: {
          idProducto: { in: testProductIds }
        }
      }
    })
  }

  // 7. Movimientos de inventario
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

  // 8. Lotes
  let loteCount = 0
  if (testProductIds.length > 0) {
    const res = await prisma.lote.deleteMany({
      where: { idProducto: { in: testProductIds } }
    })
    loteCount = res.count
  }

  // 9. Detalles de Ventas
  let detVentaCount = 0
  if (testProductIds.length > 0) {
    const res = await prisma.detalleVenta.deleteMany({
      where: { idProducto: { in: testProductIds } }
    })
    detVentaCount = res.count
  }

  // 10. Detalles de Compras
  let detCompraCount = 0
  if (testProductIds.length > 0) {
    const res = await prisma.detalleCompra.deleteMany({
      where: { idProducto: { in: testProductIds } }
    })
    detCompraCount = res.count
  }

  // 11. ProveedorProducto
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

  // 12. Ventas
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

  // 13. Compras
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

  // 14. AuditoriaLog
  if (testUserIds.length > 0) {
    await prisma.auditoriaLog.deleteMany({
      where: { idUsuario: { in: testUserIds } }
    })
  }

  // 15. Limpieza de Auditoría transaccional de triggers
  if (testUserEmails.length > 0) {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Auditoria" 
      WHERE usuario IN (${testUserEmails.map(e => `'${e}'`).join(',')})
    `)
  }

  // 16. Tokens de restauración de contraseña
  if (testUserEmails.length > 0) {
    await prisma.passwordResetToken.deleteMany({
      where: { correo: { in: testUserEmails } }
    })
    await prisma.passwordResetRequest.deleteMany({
      where: { correo: { in: testUserEmails } }
    })
  }

  // 17. Eliminar Entidades Base de Prueba
  if (testProductIds.length > 0) {
    await prisma.producto.deleteMany({ where: { id: { in: testProductIds } } })
  }
  if (testCategoryIds.length > 0) {
    await prisma.categoriaProducto.deleteMany({ where: { id: { in: testCategoryIds } } })
  }
  if (testClientIds.length > 0) {
    await prisma.cliente.deleteMany({ where: { id: { in: testClientIds } } })
  }
  if (testProviderIds.length > 0) {
    await prisma.proveedor.deleteMany({ where: { id: { in: testProviderIds } } })
  }
  if (testUserIds.length > 0) {
    await prisma.usuario.deleteMany({ where: { id: { in: testUserIds } } })
  }

  console.log('✅ Resumen de Limpieza de Datos de Prueba (esDatoPrueba: true):')
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
  console.log(`  - Citas eliminadas: ${testCitas.length}`)
  console.log(`  - Atenciones SOAP eliminadas: ${testAtenciones.length}`)
  console.log(`  - Recetas eliminadas: ${testRecetas.length}`)
  console.log(`  - Devoluciones eliminadas: ${testDevoluciones.length}`)
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
