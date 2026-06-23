const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 INICIANDO LIMPIEZA TOTAL DE DATOS DE LA BASE DE DATOS...');
  console.log('⚠️ Conservando únicamente Roles y Cuentas de Usuario de acceso.');

  // 1. Devoluciones a proveedores
  const dCount = await prisma.devolucionProveedor.deleteMany({});
  console.log(`- Devoluciones eliminadas: ${dCount.count}`);

  // 2. Detalles de recetas
  const drCount = await prisma.detalleReceta.deleteMany({});
  console.log(`- Detalles de recetas eliminados: ${drCount.count}`);

  // 3. Recetas
  const rCount = await prisma.receta.deleteMany({});
  console.log(`- Recetas eliminadas: ${rCount.count}`);

  // 4. Atenciones Podológicas (SOAP)
  const apCount = await prisma.atencionPodologica.deleteMany({});
  console.log(`- Atenciones SOAP eliminadas: ${apCount.count}`);

  // 5. Citas
  const cCount = await prisma.cita.deleteMany({});
  console.log(`- Citas eliminadas: ${cCount.count}`);

  // 6. DetalleVentaLote
  const dvlCount = await prisma.detalleVentaLote.deleteMany({});
  console.log(`- DetalleVentaLote eliminados: ${dvlCount.count}`);

  // 7. Movimientos de inventario (Kardex)
  const mCount = await prisma.movimientoInventario.deleteMany({});
  console.log(`- Movimientos de Kardex eliminados: ${mCount.count}`);

  // 8. Lotes
  const lCount = await prisma.lote.deleteMany({});
  console.log(`- Lotes eliminados: ${lCount.count}`);

  // 9. Detalles de Ventas
  const dvCount = await prisma.detalleVenta.deleteMany({});
  console.log(`- Detalles de Ventas eliminados: ${dvCount.count}`);

  // 10. Detalles de Compras
  const dcCount = await prisma.detalleCompra.deleteMany({});
  console.log(`- Detalles de Compras eliminados: ${dcCount.count}`);

  // 11. ProveedorProducto (Catálogo de relación)
  const ppCount = await prisma.proveedorProducto.deleteMany({});
  console.log(`- Relaciones Proveedor-Producto eliminadas: ${ppCount.count}`);

  // 12. Ventas
  const vCount = await prisma.venta.deleteMany({});
  console.log(`- Ventas eliminadas: ${vCount.count}`);

  // 13. Compras
  const coCount = await prisma.compra.deleteMany({});
  console.log(`- Compras eliminadas: ${coCount.count}`);

  // 14. Logs de Auditoría
  const auCount = await prisma.auditoriaLog.deleteMany({});
  console.log(`- Logs de auditoría eliminados: ${auCount.count}`);

  // 15. Auditoría Transaccional (Tabla Auditoria de los Triggers)
  const dmlCount = await prisma.auditoria.deleteMany({});
  console.log(`- Logs de auditoría DML eliminados: ${dmlCount.count}`);

  // 16. Tokens y solicitudes de contraseña
  const prtCount = await prisma.passwordResetToken.deleteMany({});
  const prrCount = await prisma.passwordResetRequest.deleteMany({});
  console.log(`- Tokens de restablecimiento eliminados: ${prtCount.count + prrCount.count}`);

  // 17. Productos
  const pCount = await prisma.producto.deleteMany({});
  console.log(`- Productos del catálogo eliminados: ${pCount.count}`);

  // 18. Categorías de productos
  const catCount = await prisma.categoriaProducto.deleteMany({});
  console.log(`- Categorías de productos eliminadas: ${catCount.count}`);

  // 19. Clientes
  const cliCount = await prisma.cliente.deleteMany({});
  console.log(`- Clientes eliminados: ${cliCount.count}`);

  // 20. Proveedores
  const provCount = await prisma.proveedor.deleteMany({});
  console.log(`- Proveedores eliminados: ${provCount.count}`);

  console.log('\n✅ ¡LIMPIEZA TOTAL COMPLETADA CON ÉXITO!');
  console.log('La base de datos está vacía para pruebas desde cero.');
}

main()
  .catch((e) => {
    console.error('❌ Error catastrófico durante la limpieza de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
