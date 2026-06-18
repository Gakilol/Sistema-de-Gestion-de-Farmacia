import fs from 'fs';
import path from 'path';

async function generateSeed() {
  console.log('🌱 Generando script SQL de semillas para NeonDB...');

  const sqlStatements: string[] = [];

  sqlStatements.push('-- ============================================================');
  sqlStatements.push('-- SCRIPT DE SEMILLAS DE DATOS REALISTAS PARA NEONDB (FARMAPOS)');
  sqlStatements.push('-- Registros totales: ~350');
  sqlStatements.push('-- Generado el: ' + new Date().toISOString().split('T')[0]);
  sqlStatements.push('-- ============================================================');
  sqlStatements.push('\n-- Desactivar triggers temporalmente para carga masiva rápida');
  sqlStatements.push('SET session_replication_role = \'replica\';\n');

  sqlStatements.push('-- Limpiar tablas existentes en orden de dependencia');
  sqlStatements.push('TRUNCATE TABLE "MovimientoInventario", "DetalleVenta", "Venta", "Lote", "DetalleCompra", "Compra", "ProveedorProducto", "Producto", "Proveedor", "CategoriaProducto", "Cliente", "Usuario", "Rol" RESTART IDENTITY CASCADE;\n');

  // 1. ROLES
  sqlStatements.push('-- 1. INSERTAR ROLES');
  sqlStatements.push('INSERT INTO "Rol" ("id", "nombre") VALUES');
  sqlStatements.push('  (1, \'ADMIN\'),');
  sqlStatements.push('  (2, \'CAJERO\'),');
  sqlStatements.push('  (3, \'FARMACEUTICO\'),');
  sqlStatements.push('  (4, \'DOCTOR\');\n');

  // 2. USUARIOS (Password hash para "password123")
  sqlStatements.push('-- 2. INSERTAR USUARIOS');
  sqlStatements.push('INSERT INTO "Usuario" ("id", "nombreCompleto", "correo", "passwordHash", "idRol", "activo", "createdAt", "updatedAt") VALUES');
  sqlStatements.push('  (1, \'Carlos Pérez (Administrador)\', \'admin@farmapos.com\', \'$2a$10$tZ2R8vLz3tQpXb.Fbe5k.OF3T4sHkZ8lqY67aW1JvX8N1tE/Y3o2G\', 1, true, NOW(), NOW()),');
  sqlStatements.push('  (2, \'Ana López (Cajera)\', \'ana.caja@farmapos.com\', \'$2a$10$tZ2R8vLz3tQpXb.Fbe5k.OF3T4sHkZ8lqY67aW1JvX8N1tE/Y3o2G\', 2, true, NOW(), NOW()),');
  sqlStatements.push('  (3, \'Dr. Luis Rivas (Farmacéutico)\', \'luis.farmacia@farmapos.com\', \'$2a$10$tZ2R8vLz3tQpXb.Fbe5k.OF3T4sHkZ8lqY67aW1JvX8N1tE/Y3o2G\', 3, true, NOW(), NOW()),');
  sqlStatements.push('  (4, \'Dra. Sofia Mendez (Doctora)\', \'sofia.doc@farmapos.com\', \'$2a$10$tZ2R8vLz3tQpXb.Fbe5k.OF3T4sHkZ8lqY67aW1JvX8N1tE/Y3o2G\', 4, true, NOW(), NOW());\n');

  // 3. CATEGORÍAS
  sqlStatements.push('-- 3. INSERTAR CATEGORÍAS');
  sqlStatements.push('INSERT INTO "CategoriaProducto" ("id", "nombre", "descripcion", "createdAt", "updatedAt") VALUES');
  sqlStatements.push('  (1, \'Medicamentos\', \'Medicamentos generales bajo receta o de venta libre\', NOW(), NOW()),');
  sqlStatements.push('  (2, \'Vitaminas\', \'Suplementos alimenticios y multivitamínicos\', NOW(), NOW()),');
  sqlStatements.push('  (3, \'Antibióticos\', \'Medicamentos antibacterianos de uso restringido\', NOW(), NOW()),');
  sqlStatements.push('  (4, \'Analgésicos\', \'Medicamentos analgésicos y antiinflamatorios\', NOW(), NOW()),');
  sqlStatements.push('  (5, \'Insumos médicos\', \'Gasas, jeringas, alcohol y vendajes\', NOW(), NOW()),');
  sqlStatements.push('  (6, \'Higiene personal\', \'Jabones germicidas y cuidado corporal\', NOW(), NOW());\n');

  // 4. PROVEEDORES
  sqlStatements.push('-- 4. INSERTAR PROVEEDORES');
  sqlStatements.push('INSERT INTO "Proveedor" ("id", "nombre", "telefono", "correo", "direccion", "createdAt", "updatedAt") VALUES');
  sqlStatements.push('  (1, \'Droguería Médica S.A.\', \'+505 2222-1111\', \'ventas@drogueriamedica.com\', \'Managua, Pista Jean Paul Genie\', NOW(), NOW()),');
  sqlStatements.push('  (2, \'FarmaDistribuidores Nicaragua\', \'+505 2288-3434\', \'contacto@farmadist.com\', \'Masaya, Km 15 Carretera a Masaya\', NOW(), NOW()),');
  sqlStatements.push('  (3, \'Laboratorios Pfizer Distribuidora\', \'+505 8888-9999\', \'pfizer.nica@pfizer.com\', \'Managua, Centro América\', NOW(), NOW()),');
  sqlStatements.push('  (4, \'Suplidores Médicos Generales\', \'+505 2244-1212\', \'info@suplidoresmed.com\', \'León, Costado Oeste Catedral\', NOW(), NOW()),');
  sqlStatements.push('  (5, \'Higiene y Salud Corp\', \'+505 2266-7878\', \'pedidos@higienesalud.com\', \'Granada, Calle Real Xalteva\', NOW(), NOW());\n');

  // 5. PRODUCTOS (50 Productos)
  sqlStatements.push('-- 5. INSERTAR PRODUCTOS');
  sqlStatements.push('INSERT INTO "Producto" ("id", "nombre", "codigoBarras", "descripcion", "idCategoria", "precioCompra", "precioVenta", "stockActual", "stockMinimo", "activo", "createdAt", "updatedAt") VALUES');
  
  const productNames = [
    // Cat 1: Medicamentos
    { name: 'Ibuprofeno 400mg', cat: 1, pc: 1.20, pv: 2.50, min: 20 },
    { name: 'Omeprazol 20mg', cat: 1, pc: 0.80, pv: 1.80, min: 30 },
    { name: 'Loratadina 10mg', cat: 1, pc: 0.50, pv: 1.20, min: 15 },
    { name: 'Metformina 850mg', cat: 1, pc: 1.50, pv: 3.50, min: 25 },
    { name: 'Atorvastatina 20mg', cat: 1, pc: 2.10, pv: 4.80, min: 10 },
    { name: 'Losartán Potásico 50mg', cat: 1, pc: 1.10, pv: 2.50, min: 20 },
    { name: 'Salbutamol Inhalador 100mcg', cat: 1, pc: 3.50, pv: 7.50, min: 10 },
    { name: 'Paracetamol 500mg', cat: 1, pc: 0.30, pv: 0.80, min: 50 },
    { name: 'Enalapril 10mg', cat: 1, pc: 0.70, pv: 1.60, min: 15 },
    { name: 'Amlodipino 5mg', cat: 1, pc: 0.90, pv: 2.00, min: 15 },
    
    // Cat 2: Vitaminas
    { name: 'Vitamina C 500mg (Masticable)', cat: 2, pc: 1.50, pv: 3.00, min: 25 },
    { name: 'Complejo B Inyectable', cat: 2, pc: 2.20, pv: 4.50, min: 10 },
    { name: 'Multivitamínico A-Z', cat: 2, pc: 5.80, pv: 12.00, min: 8 },
    { name: 'Calcio + Vitamina D3', cat: 2, pc: 3.40, pv: 6.99, min: 15 },
    { name: 'Zinc 50mg Suplemento', cat: 2, pc: 1.80, pv: 3.99, min: 20 },
    { name: 'Omega 3 Aceite de Pescado', cat: 2, pc: 4.50, pv: 9.99, min: 10 },
    { name: 'Vitamina E 400 UI', cat: 2, pc: 3.80, pv: 8.50, min: 12 },
    { name: 'Colágeno Hidrolizado Polvo', cat: 2, pc: 12.00, pv: 24.99, min: 5 },
    
    // Cat 3: Antibióticos
    { name: 'Amoxicilina 500mg', cat: 3, pc: 2.50, pv: 5.50, min: 20 },
    { name: 'Azitromicina 500mg', cat: 3, pc: 4.00, pv: 9.00, min: 10 },
    { name: 'Ciprofloxacina 500mg', cat: 3, pc: 3.20, pv: 7.00, min: 15 },
    { name: 'Cefalexina 500mg', cat: 3, pc: 2.80, pv: 6.20, min: 15 },
    { name: 'Amoxicilina + Ácido Clavulánico', cat: 3, pc: 5.50, pv: 12.50, min: 10 },
    { name: 'Clindamicina 300mg', cat: 3, pc: 4.80, pv: 10.50, min: 10 },
    
    // Cat 4: Analgésicos
    { name: 'Ibuprofeno 800mg', cat: 4, pc: 1.80, pv: 3.80, min: 30 },
    { name: 'Acetaminofén 500mg Forte', cat: 4, pc: 0.40, pv: 1.00, min: 50 },
    { name: 'Diclofenaco Sódico 75mg Gel', cat: 4, pc: 2.00, pv: 4.50, min: 15 },
    { name: 'Tramadol 50mg Cápsulas', cat: 4, pc: 3.50, pv: 8.00, min: 10 },
    { name: 'Meloxicam 15mg', cat: 4, pc: 1.50, pv: 3.20, min: 15 },
    { name: 'Naproxeno 500mg', cat: 4, pc: 1.20, pv: 2.80, min: 20 },
    { name: 'Ketorolaco 10mg Sublingual', cat: 4, pc: 2.20, pv: 5.00, min: 15 },
    { name: 'Celecoxib 200mg', cat: 4, pc: 4.50, pv: 9.50, min: 10 },
    
    // Cat 5: Insumos médicos
    { name: 'Gasas Estériles 3x3 (Caja 100)', cat: 5, pc: 4.00, pv: 8.50, min: 10 },
    { name: 'Alcohol Gel 70% 500ml', cat: 5, pc: 1.50, pv: 3.00, min: 20 },
    { name: 'Jeringas 3ml con aguja (Caja 100)', cat: 5, pc: 6.00, pv: 12.00, min: 8 },
    { name: 'Algodón Plisado 200g', cat: 5, pc: 1.10, pv: 2.50, min: 15 },
    { name: 'Termómetro Digital Clínico', cat: 5, pc: 2.50, pv: 6.00, min: 5 },
    { name: 'Venda Elástica 4 pulgadas', cat: 5, pc: 0.90, pv: 2.20, min: 20 },
    { name: 'Curitas Adhesivas (Caja 100)', cat: 5, pc: 2.00, pv: 4.50, min: 12 },
    { name: 'Oxímetro de Pulso Digital', cat: 5, pc: 8.50, pv: 18.00, min: 4 },
    
    // Cat 6: Higiene personal
    { name: 'Jabón Germicida Antiséptico', cat: 6, pc: 1.30, pv: 2.99, min: 20 },
    { name: 'Crema Corporal Hidratante CeraVe', cat: 6, pc: 8.00, pv: 16.50, min: 8 },
    { name: 'Pasta Dental Colgate Total 12', cat: 6, pc: 1.80, pv: 3.50, min: 15 },
    { name: 'Champú Anticaspa Ketoconazol 2%', cat: 6, pc: 4.50, pv: 9.99, min: 10 },
    { name: 'Desodorante Clínico Roll-on', cat: 6, pc: 2.10, pv: 4.50, min: 15 },
    { name: 'Enjuague Bucal Antiséptico 500ml', cat: 6, pc: 2.50, pv: 5.50, min: 12 },
  ];

  const productsInsertStatements: string[] = [];
  const initialStocks: number[] = [];

  for (let i = 0; i < productNames.length; i++) {
    const p = productNames[i];
    const id = i + 1;
    // Stock inicial configurado en base a lotes
    const stock = 200; // Stock inicial de la semilla por producto
    initialStocks.push(stock);
    const barcode = `7501000${(100000 + id).toString().slice(1)}`;
    const line = `  (${id}, \'${p.name}\', \'${barcode}\', \'${p.name} de alta calidad de prueba\', ${p.cat}, ${p.pc.toFixed(2)}, ${p.pv.toFixed(2)}, ${stock}, ${p.min}, true, NOW(), NOW())`;
    productsInsertStatements.push(line + (i === productNames.length - 1 ? ';' : ','));
  }
  sqlStatements.push(productsInsertStatements.join('\n') + '\n');

  // 6. CLIENTES (50 Clientes)
  sqlStatements.push('-- 6. INSERTAR CLIENTES');
  sqlStatements.push('INSERT INTO "Cliente" ("id", "nombreCompleto", "telefono", "correo", "cedula", "ruc", "direccion", "activo", "createdAt", "updatedAt") VALUES');
  
  const clientNames = [
    'Juan Carlos Blandón', 'María Elena Rostrán', 'Roberto José Ortega', 'Sofía Carolina Duarte', 'Francisco Solís',
    'Lucía Valeria Martínez', 'Guillermo Alfonso Silva', 'Gabriela Auxiliadora Díaz', 'Alejandro Rafael Lacayo', 'Patricia Isabel Gómez',
    'Miguel Angel Salgado', 'Sandra Lorena Obando', 'Jorge Luis Balmaceda', 'Tatiana María Morales', 'Carlos Fernando Chamorro',
    'Fabiola Vanessa Zelaya', 'Ernesto Antonio Jarquín', 'Yolanda del Carmen López', 'Felipe Santiago Castillo', 'Claudia Verónica Mayorga',
    'Javier Enrique Granera', 'Maritza Auxiliadora Altamirano', 'Rolando José Sevilla', 'Helena Patricia Rivas', 'Eduardo Daniel Narváez',
    'Marta Lorena Gutiérrez', 'José Noel Calderón', 'Angélica María Tercero', 'Mauricio Salvador Aguilar', 'Rebeca del Socorro Guido',
    'Fernando Arturo Somarriba', 'Karla Patricia Espinoza', 'Wilfredo José Mendoza', 'Luz Marina Talavera', 'Alvaro Gabriel Pineda',
    'Elizabeth del Carmen Vivas', 'Julio Cesar Oporta', 'Rosa Maria Barberena', 'Armando José Pasquier', 'Sonia del Rosario Centeno',
    'René Francisco Quintana', 'Ivonne Maria Guerrero', 'Ramón Antonio Urbina', 'Gema Auxiliadora Téllez', 'Luis Manuel Barberena',
    'Beatriz Elena Mayorga', 'Oscar Danilo Solórzano', 'Juana Francisca Orozco', 'Manuel Salvador Gadea', 'Dolores del Carmen Rayo'
  ];

  const clientsInsertStatements: string[] = [];
  for (let i = 0; i < clientNames.length; i++) {
    const id = i + 1;
    const cedula = `001-${(100000 + id).toString().slice(1)}-000${id}A`;
    const phone = `+505 8888-${(1000 + id).toString()}`;
    const email = `cliente${id}@gmail.com`;
    const ruc = i % 5 === 0 ? `'123456789000${id}'` : 'NULL';
    const line = `  (${id}, \'${clientNames[i]}\', \'${phone}\', \'${email}\', \'${cedula}\', ${ruc}, \'Ciudad de Managua, Calle #${id}\', true, NOW(), NOW())`;
    clientsInsertStatements.push(line + (i === clientNames.length - 1 ? ';' : ','));
  }
  sqlStatements.push(clientsInsertStatements.join('\n') + '\n');

  // 7. PROVEEDOR-PRODUCTO
  sqlStatements.push('-- 7. ASOCIAR PRODUCTOS A PROVEEDORES');
  sqlStatements.push('INSERT INTO "ProveedorProducto" ("id", "idProveedor", "idProducto", "precioCompra", "createdAt") VALUES');
  const provProdStatements: string[] = [];
  let ppId = 1;
  for (let i = 0; i < productNames.length; i++) {
    const provId = (i % 5) + 1;
    const prodId = i + 1;
    const pc = productNames[i].pc;
    const line = `  (${ppId}, ${provId}, ${prodId}, ${pc.toFixed(2)}, NOW())`;
    provProdStatements.push(line + (i === productNames.length - 1 ? ';' : ','));
    ppId++;
  }
  sqlStatements.push(provProdStatements.join('\n') + '\n');

  // 8. LOTES (2 lotes por producto, uno de 100u y otro de 100u, total 200u por producto)
  sqlStatements.push('-- 8. INSERTAR LOTES POR PRODUCTO (Múltiple Batch FEFO)');
  sqlStatements.push('INSERT INTO "Lote" ("id", "idProducto", "codigoLote", "fechaVencimiento", "stockInicial", "stockActual", "costoCompra", "activo", "createdAt", "updatedAt") VALUES');
  const batchStatements: string[] = [];
  let lotId = 1;
  for (let i = 0; i < productNames.length; i++) {
    const prodId = i + 1;
    const pc = productNames[i].pc;
    
    // Lote A (vence en 3 meses)
    const expA = new Date();
    expA.setMonth(expA.getMonth() + 3);
    const dateStrA = expA.toISOString().split('T')[0];
    const lineA = `  (${lotId}, ${prodId}, \'LOTE-26A-${prodId.toString().padStart(2, '0')}\', \'${dateStrA} 00:00:00\', 100, 100, ${pc.toFixed(2)}, true, NOW(), NOW()),`;
    batchStatements.push(lineA);
    lotId++;

    // Lote B (vence en 12 meses)
    const expB = new Date();
    expB.setMonth(expB.getMonth() + 12);
    const dateStrB = expB.toISOString().split('T')[0];
    const lineB = `  (${lotId}, ${prodId}, \'LOTE-26B-${prodId.toString().padStart(2, '0')}\', \'${dateStrB} 00:00:00\', 100, 100, ${pc.toFixed(2)}, true, NOW(), NOW())` + (i === productNames.length - 1 ? ';' : ',');
    batchStatements.push(lineB);
    lotId++;
  }
  sqlStatements.push(batchStatements.join('\n') + '\n');

  // 9. VENTAS (100 Ventas de prueba realistas para reportes y ABC)
  sqlStatements.push('-- 9. INSERTAR VENTAS HISTÓRICAS DE EJEMPLO');
  sqlStatements.push('INSERT INTO "Venta" ("id", "fecha", "idCliente", "total", "metodoPago", "nombrePodologo", "numeroReceta", "idUsuario", "tipoComprobante", "estado", "montoRecibido", "cambio", "rucCliente", "createdAt", "updatedAt") VALUES');
  const saleStatements: string[] = [];
  const numSales = 80;
  
  // Guardamos las ventas que vamos a insertar para usar sus detalles
  const salesDetailsToInsert: { id: number; idVenta: number; idProducto: number; cantidad: number; precio: number; subtotal: number }[] = [];
  let detailId = 1;

  for (let i = 1; i <= numSales; i++) {
    const clientId = (i % clientNames.length) + 1;
    const userId = (i % 3) + 2; // Cajera Ana (2) o Farmacéutico Luis (3)
    const method = i % 3 === 0 ? 'EFECTIVO' : i % 3 === 1 ? 'TARJETA' : 'TRANSFERENCIA';
    
    // Cada venta tendrá entre 1 y 3 productos
    const itemsCount = (i % 3) + 1;
    let saleTotal = 0;
    
    for (let item = 0; item < itemsCount; item++) {
      const prodIndex = (i + item * 7) % productNames.length;
      const prodId = prodIndex + 1;
      const precio = productNames[prodIndex].pv;
      const cant = (i % 3) + 1; // 1 a 3 unidades
      const subtotal = cant * precio;
      saleTotal += subtotal;

      salesDetailsToInsert.push({
        id: detailId,
        idVenta: i,
        idProducto: prodId,
        cantidad: cant,
        precio,
        subtotal
      });
      detailId++;
    }

    const saleDate = new Date();
    // Fechas distribuidas en los últimos 30 días
    saleDate.setDate(saleDate.getDate() - (i % 30));
    const saleDateStr = saleDate.toISOString().split('T')[0] + ' 12:00:00';
    
    const ruc = i % 10 === 0 ? `\'RUC123456-${clientId}\'` : 'NULL';
    const rec = i % 3 === 0 ? `\'RECETA-${i}-2026\'` : 'NULL';
    
    const line = `  (${i}, \'${saleDateStr}\', ${clientId}, ${saleTotal.toFixed(2)}, \'${method}\', \'Dr. Pedro Solórzano\', ${rec}, ${userId}, \'FACTURA\', \'COMPLETADA\', ${(saleTotal + 5).toFixed(2)}, 5.00, ${ruc}, \'${saleDateStr}\', \'${saleDateStr}\')`;
    saleStatements.push(line + (i === numSales ? ';' : ','));
  }
  sqlStatements.push(saleStatements.join('\n') + '\n');

  // 10. DETALLES DE VENTAS
  sqlStatements.push('-- 10. INSERTAR DETALLE DE LAS VENTAS');
  sqlStatements.push('INSERT INTO "DetalleVenta" ("id", "idVenta", "idProducto", "cantidad", "precioUnitario", "subtotal", "tipoUnidad", "createdAt", "updatedAt") VALUES');
  const detailsInsert: string[] = [];
  for (let i = 0; i < salesDetailsToInsert.length; i++) {
    const d = salesDetailsToInsert[i];
    const line = `  (${d.id}, ${d.idVenta}, ${d.idProducto}, ${d.cantidad}, ${d.precio.toFixed(2)}, ${d.subtotal.toFixed(2)}, \'UNIDAD\', NOW(), NOW())`;
    detailsInsert.push(line + (i === salesDetailsToInsert.length - 1 ? ';' : ','));
  }
  sqlStatements.push(detailsInsert.join('\n') + '\n');

  // 11. MOVIMIENTOS DE INVENTARIO (KARDEX)
  sqlStatements.push('-- 11. INSERTAR HISTORIAL DE MOVIMIENTOS EN KARDEX');
  sqlStatements.push('INSERT INTO "MovimientoInventario" ("id", "idProducto", "idLote", "tipo", "cantidad", "stockResultante", "costoUnitario", "referencia", "observacion", "idUsuario", "createdAt") VALUES');
  
  const movementsStatements: string[] = [];
  let movId = 1;

  // 11.1 Movimientos de Entrada de Lotes
  for (let i = 0; i < productNames.length; i++) {
    const prodId = i + 1;
    const pc = productNames[i].pc;
    const stock = initialStocks[i];
    
    // Entrada Lote A (100 u)
    const lotIdA = i * 2 + 1;
    movementsStatements.push(`  (${movId}, ${prodId}, ${lotIdA}, \'ENTRADA_COMPRA\', 100, 100, ${pc.toFixed(2)}, \'Carga Inicial Semilla\', \'Carga de lote A\', 1, NOW() - INTERVAL \'31 days\'),`);
    movId++;

    // Entrada Lote B (100 u)
    const lotIdB = i * 2 + 2;
    movementsStatements.push(`  (${movId}, ${prodId}, ${lotIdB}, \'ENTRADA_COMPRA\', 100, 200, ${pc.toFixed(2)}, \'Carga Inicial Semilla\', \'Carga de lote B\', 1, NOW() - INTERVAL \'31 days\'),`);
    movId++;
  }

  // 11.2 Movimientos de Salida de Ventas
  for (let i = 0; i < salesDetailsToInsert.length; i++) {
    const d = salesDetailsToInsert[i];
    const prodIndex = d.idProducto - 1;
    const pc = productNames[prodIndex].pc;
    
    // Buscamos el lote A del producto para la deducción (Lote con ID impar)
    const lotId = (d.idProducto - 1) * 2 + 1;
    
    const line = `  (${movId}, ${d.idProducto}, ${lotId}, \'SALIDA_VENTA\', ${d.cantidad}, 190, ${pc.toFixed(2)}, \'Venta #${d.idVenta}\', \'Salida de inventario por venta\', 2, NOW())`;
    movementsStatements.push(line + (i === salesDetailsToInsert.length - 1 ? ';' : ','));
    movId++;
  }
  sqlStatements.push(movementsStatements.join('\n') + '\n');

  sqlStatements.push('-- Reactivar triggers');
  sqlStatements.push('SET session_replication_role = \'origin\';\n');

  // Guardar archivo seeds_neondb.sql
  const destPath = path.join(process.cwd(), 'prisma', 'seeds_neondb.sql');
  fs.writeFileSync(destPath, sqlStatements.join('\n'));
  console.log(`✅ Script SQL de semillas creado exitosamente en: ${destPath}`);
}

generateSeed().catch(e => {
  console.error('❌ Error al generar las semillas SQL:', e);
});
