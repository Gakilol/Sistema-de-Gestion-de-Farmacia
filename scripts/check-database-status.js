const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('📊 OBTENIENDO RECUENTOS DE LAS TABLAS DE LA BASE DE DATOS...');
  
  const roles = await prisma.rol.count();
  const usuarios = await prisma.usuario.count();
  const clientes = await prisma.cliente.count();
  const proveedores = await prisma.proveedor.count();
  const categorias = await prisma.categoriaProducto.count();
  const productos = await prisma.producto.count();
  const compras = await prisma.compra.count();
  const ventas = await prisma.venta.count();
  const citas = await prisma.cita.count();
  const atenciones = await prisma.atencionPodologica.count();
  const recetas = await prisma.receta.count();
  const lotes = await prisma.lote.count();
  const devoluciones = await prisma.devolucionProveedor.count();
  const kardex = await prisma.movimientoInventario.count();
  const auditoriaLog = await prisma.auditoriaLog.count();
  const dmlAuditoria = await prisma.auditoria.count();

  console.log(`\n📋 REPORTE DE TABLAS:`);
  console.log(`- Roles: ${roles}`);
  console.log(`- Usuarios: ${usuarios}`);
  console.log(`- Clientes: ${clientes}`);
  console.log(`- Proveedores: ${proveedores}`);
  console.log(`- Categorías: ${categorias}`);
  console.log(`- Productos: ${productos}`);
  console.log(`- Lotes: ${lotes}`);
  console.log(`- Compras: ${compras}`);
  console.log(`- Ventas: ${ventas}`);
  console.log(`- Movimientos Kardex: ${kardex}`);
  console.log(`- Citas Clínicas: ${citas}`);
  console.log(`- Atenciones SOAP: ${atenciones}`);
  console.log(`- Recetas Emitidas: ${recetas}`);
  console.log(`- Devoluciones Proveedor: ${devoluciones}`);
  console.log(`- Logs de Auditoría: ${auditoriaLog}`);
  console.log(`- Auditoría Triggers DML: ${dmlAuditoria}`);

  console.log('\n--- DETALLES DE USUARIOS ACTIVOS ---');
  const userList = await prisma.usuario.findMany({
    include: { rol: true }
  });
  for (const u of userList) {
    console.log(`* ${u.nombreCompleto} (${u.correo}) - Rol: ${u.rol.nombre} - Activo: ${u.activo}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
