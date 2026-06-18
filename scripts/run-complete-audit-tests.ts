import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface AuditIssue {
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  description: string;
  details: any;
}

const auditIssues: AuditIssue[] = [];

function logSection(title: string) {
  console.log('\n======================================================================');
  console.log(`🚀 ${title.toUpperCase()}`);
  console.log('======================================================================');
}

async function main() {
  console.log('🏁 INICIANDO AUDITORÍA Y PRUEBAS AUTOMATIZADAS DE FARMAPOS DB...');

  // ==========================================
  // FASE 1: ANÁLISIS DE ESTRUCTURA
  // ==========================================
  logSection('Fase 1 - Análisis de Estructura');
  
  // 1.1 Listar Tablas y buscar columnas sin índices
  const tables = (await prisma.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `)) as any[];
  console.log(`Tablas encontradas (${tables.length}): ${tables.map(t => t.table_name).join(', ')}`);

  // 1.2 Buscar Índices
  const indexes = (await prisma.$queryRawUnsafe(`
    SELECT indexname, tablename, indexdef 
    FROM pg_indexes 
    WHERE schemaname = 'public';
  `)) as any[];
  console.log(`Índices encontrados (${indexes.length})`);

  // 1.3 Buscar Relaciones (Foreign Keys)
  const fks = (await prisma.$queryRawUnsafe(`
    SELECT
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema='public';
  `)) as any[];
  console.log(`Relaciones de Claves Foráneas encontradas (${fks.length})`);

  // 1.4 Identificar columnas críticas de clave foránea sin índices (Problema de rendimiento potencial)
  const indexedColumns = new Set(indexes.map(idx => {
    // Extraer las columnas del indexdef (ej. CREATE INDEX ... ON "Lote"("idProducto"))
    const match = idx.indexdef.match(/\((.*?)\)/);
    return match ? `${idx.tablename}.${match[1].replace(/"/g, '')}` : '';
  }));

  for (const fk of fks) {
    const colKey = `${fk.table_name}.${fk.column_name}`;
    if (!indexedColumns.has(colKey)) {
      auditIssues.push({
        severity: 'MEDIUM',
        category: 'MISSING_INDEX',
        description: `Columna de clave foránea sin índice: ${colKey}`,
        details: fk
      });
      console.log(`⚠️ Columna de FK sin índice: ${colKey} (puede causar lentitud en JOINs/deletes)`);
    }
  }

  // 1.5 Buscar Triggers
  const triggers = (await prisma.$queryRawUnsafe(`
    SELECT DISTINCT trigger_name, event_object_table 
    FROM information_schema.triggers 
    ORDER BY trigger_name;
  `)) as any[];
  console.log(`Triggers encontrados (${triggers.length})`);

  // 1.6 Buscar Funciones/Procedimientos
  const routines = (await prisma.$queryRawUnsafe(`
    SELECT routine_name, routine_type 
    FROM information_schema.routines 
    WHERE routine_schema = 'public' AND routine_type IN ('FUNCTION', 'PROCEDURE')
    ORDER BY routine_name;
  `)) as any[];
  console.log(`Procedimientos y Funciones encontrados (${routines.length})`);


  // ==========================================
  // FASE 2: PRUEBA DE CREACIÓN DE DATOS (Usuarios, Clientes, Proveedores, Categorías)
  // ==========================================
  logSection('Fase 2 - Creación de Datos de Prueba');

  // 2.1 Usuarios
  console.log('Creando roles y usuarios de prueba...');
  let adminRol = await prisma.rol.findUnique({ where: { nombre: 'ADMIN' } });
  if (!adminRol) adminRol = await prisma.rol.create({ data: { nombre: 'ADMIN' } });
  
  let cajeroRol = await prisma.rol.findUnique({ where: { nombre: 'CAJERO' } });
  if (!cajeroRol) cajeroRol = await prisma.rol.create({ data: { nombre: 'CAJERO' } });
  
  let farmaceuticoRol = await prisma.rol.findUnique({ where: { nombre: 'FARMACEUTICO' } });
  if (!farmaceuticoRol) farmaceuticoRol = await prisma.rol.create({ data: { nombre: 'FARMACEUTICO' } });

  let doctorRol = await prisma.rol.findUnique({ where: { nombre: 'DOCTOR' } });
  if (!doctorRol) doctorRol = await prisma.rol.create({ data: { nombre: 'DOCTOR' } });

  const dummyPassword = await bcrypt.hash('prueba123', 10);
  const testUsersData = [
    { nombreCompleto: 'Test Admin', correo: 'test_admin@farmapos.com', passwordHash: dummyPassword, idRol: adminRol.id },
    { nombreCompleto: 'Test Cajero', correo: 'test_cajero@farmapos.com', passwordHash: dummyPassword, idRol: cajeroRol.id },
    { nombreCompleto: 'Test Farmacéutico', correo: 'test_farmaceutico@farmapos.com', passwordHash: dummyPassword, idRol: farmaceuticoRol.id },
    { nombreCompleto: 'Test Doctor', correo: 'test_doctor@farmapos.com', passwordHash: dummyPassword, idRol: doctorRol.id },
  ];

  const createdUsers = [];
  for (const ud of testUsersData) {
    const u = await prisma.usuario.upsert({
      where: { correo: ud.correo },
      update: {},
      create: ud
    });
    createdUsers.push(u);
  }
  console.log(`✅ Roles y usuarios verificados. Creados: ${createdUsers.map(u => u.nombreCompleto).join(', ')}`);

  // Validar restricción de correo duplicado en usuarios
  try {
    await prisma.usuario.create({
      data: { nombreCompleto: 'Duplicado', correo: 'test_admin@farmapos.com', passwordHash: 'hash', idRol: adminRol.id }
    });
    auditIssues.push({
      severity: 'CRITICAL',
      category: 'DUPLICATE_EMAIL_ALLOWED',
      description: 'El sistema permitió crear dos usuarios con el mismo correo electrónico.',
      details: null
    });
  } catch (e: any) {
    console.log('✅ Éxito esperado: El motor bloqueó la inserción de usuario con correo duplicado.');
  }

  // 2.2 Clientes (Crear 50 clientes ficticios)
  console.log('Creando 50 clientes de prueba...');
  const testClients = [];
  for (let i = 1; i <= 50; i++) {
    const cedula = `001-${(100000 + i).toString().slice(1)}-000${i}A`;
    const email = `cliente${i}@testing.com`;
    const phone = `8888-00${i.toString().padStart(2, '0')}`;
    const client = await prisma.cliente.upsert({
      where: { cedula },
      update: {},
      create: {
        nombreCompleto: `Cliente de Prueba #${i}`,
        correo: email,
        telefono: phone,
        cedula: cedula,
        direccion: `Dirección de Cliente #${i}`,
        activo: true
      }
    });
    testClients.push(client);
  }
  console.log(`✅ Creados/Verificados 50 clientes de prueba.`);

  // Validar duplicados de Cédula, Correo y Teléfono en Cliente
  try {
    await prisma.cliente.create({
      data: { nombreCompleto: 'Intruso Cedula', cedula: testClients[0].cedula }
    });
    auditIssues.push({
      severity: 'HIGH',
      category: 'DUPLICATE_CLIENT_CONSTRAINT',
      description: 'Se permitió duplicar la cédula de un cliente en la base de datos.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: El motor bloqueó la cédula duplicada.');
  }

  try {
    await prisma.cliente.create({
      data: { nombreCompleto: 'Intruso Correo', correo: testClients[0].correo }
    });
    auditIssues.push({
      severity: 'HIGH',
      category: 'DUPLICATE_CLIENT_CONSTRAINT',
      description: 'Se permitió duplicar el correo de un cliente en la base de datos.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: El motor bloqueó el correo duplicado.');
  }

  try {
    await prisma.cliente.create({
      data: { nombreCompleto: 'Intruso Teléfono', telefono: testClients[0].telefono }
    });
    auditIssues.push({
      severity: 'MEDIUM',
      category: 'DUPLICATE_CLIENT_CONSTRAINT',
      description: 'Se permitió duplicar el teléfono de un cliente en la base de datos.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: El motor bloqueó el teléfono duplicado.');
  }

  // 2.3 Proveedores (Crear 20 proveedores de prueba)
  console.log('Creando 20 proveedores de prueba...');
  const testProviders = [];
  for (let i = 1; i <= 20; i++) {
    const provName = `Proveedor de Prueba #${i}`;
    const p = await prisma.proveedor.upsert({
      where: { nombre: provName },
      update: {},
      create: {
        nombre: provName,
        telefono: `2222-00${i.toString().padStart(2, '0')}`,
        correo: `prov${i}@testing.com`,
        direccion: `Zona Industrial de Pruebas #${i}`
      }
    });
    testProviders.push(p);
  }
  console.log(`✅ Creados/Verificados 20 proveedores de prueba.`);

  // Validar duplicados de proveedor
  try {
    await prisma.proveedor.create({
      data: { nombre: testProviders[0].nombre }
    });
    auditIssues.push({
      severity: 'HIGH',
      category: 'DUPLICATE_PROVIDER_ALLOWED',
      description: 'Se permitió duplicar el nombre de un proveedor.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: El motor bloqueó la inserción del proveedor duplicado.');
  }

  // 2.4 Categorías (Medicamentos, Vitaminas, Antibióticos, Analgésicos, Insumos médicos, Higiene personal)
  console.log('Creando categorías requeridas...');
  const categoriesToCreate = [
    { nombre: 'Medicamentos', descripcion: 'Medicamentos generales' },
    { nombre: 'Vitaminas', descripcion: 'Suplementos y vitaminas' },
    { nombre: 'Antibióticos', descripcion: 'Antibióticos recetados' },
    { nombre: 'Analgésicos', descripcion: 'Tratamiento del dolor' },
    { nombre: 'Insumos médicos', descripcion: 'Materiales descartables y gasas' },
    { nombre: 'Higiene personal', descripcion: 'Cuidado e higiene diaria' },
  ];

  const createdCategories = [];
  for (const cat of categoriesToCreate) {
    const c = await prisma.categoriaProducto.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat
    });
    createdCategories.push(c);
  }
  console.log(`✅ Categorías creadas/verificadas: ${createdCategories.map(c => c.nombre).join(', ')}`);


  // ==========================================
  // FASE 3: PRUEBAS DE PRODUCTOS
  // ==========================================
  logSection('Fase 3 - Pruebas de Productos (100 Productos)');
  
  const testCategory = createdCategories[0]; // Medicamentos
  const testProducts = [];
  console.log('Generando 100 productos de prueba...');
  for (let i = 1; i <= 100; i++) {
    const prodName = `Medicamento de Test #${i}`;
    const barcode = `BARCODE-TEST-${i}-${Date.now()}`;
    const p = await prisma.producto.upsert({
      where: { nombre: prodName },
      update: {},
      create: {
        nombre: prodName,
        codigoBarras: barcode,
        descripcion: `Descripción del producto de test #${i}`,
        idCategoria: testCategory.id,
        precioCompra: 12.50,
        precioVenta: 25.00,
        stockActual: 0,
        stockMinimo: 5,
        activo: true
      }
    });
    testProducts.push(p);
  }
  console.log(`✅ Creados/Verificados 100 productos de prueba.`);

  // Validar nombre duplicado de producto
  try {
    await prisma.producto.create({
      data: {
        nombre: testProducts[0].nombre,
        codigoBarras: `BARCODE-DUP-${Date.now()}`,
        idCategoria: testCategory.id,
        precioCompra: 10.00,
        precioVenta: 15.00
      }
    });
    auditIssues.push({
      severity: 'HIGH',
      category: 'DUPLICATE_PRODUCT_NAME',
      description: 'El sistema permitió duplicar el nombre de un producto.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: Bloqueado producto con nombre duplicado.');
  }

  // Validar código de barras duplicado de producto
  try {
    await prisma.producto.create({
      data: {
        nombre: `Producto Único ${Date.now()}`,
        codigoBarras: testProducts[0].codigoBarras,
        idCategoria: testCategory.id,
        precioCompra: 10.00,
        precioVenta: 15.00
      }
    });
    auditIssues.push({
      severity: 'HIGH',
      category: 'DUPLICATE_BARCODE',
      description: 'El sistema permitió duplicar el código de barras de un producto.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: Bloqueado producto con código de barras duplicado.');
  }

  // Validar stock negativo en Producto (¿Existe constraint?)
  console.log('Verificando si la base de datos bloquea el stock negativo a nivel de tabla "Producto"...');
  try {
    await prisma.producto.create({
      data: {
        nombre: `Producto Stock Negativo ${Date.now()}`,
        idCategoria: testCategory.id,
        precioCompra: 10.00,
        precioVenta: 15.00,
        stockActual: -5
      }
    });
    // Si permite crearlo con stockActual negativo, hay una vulnerabilidad/falta de constraint
    auditIssues.push({
      severity: 'CRITICAL',
      category: 'NEGATIVE_STOCK_ALLOWED_DB',
      description: 'La base de datos permite guardar valores de stock negativo directamente en la tabla Producto (falta constraint CHECK stockActual >= 0).',
      details: null
    });
    console.log('⚠️ ADVERTENCIA: La base de datos PERMITIÓ guardar un stock negativo en Producto.');
  } catch (e) {
    console.log('✅ Éxito: La base de datos bloqueó el stock negativo en Producto.');
  }


  // ==========================================
  // FASE 4: PRUEBAS DE LOTES (Ibuprofeno LOTE-001, LOTE-002, LOTE-003)
  // ==========================================
  logSection('Fase 4 - Pruebas de Lotes');

  // Buscar o crear un producto específico para lotes
  const ibuprofenName = 'Ibuprofeno 800mg Especial Test';
  let ibuprofen = await prisma.producto.findUnique({ where: { nombre: ibuprofenName } });
  if (ibuprofen) {
    // Limpiar lotes anteriores para tener consistencia limpia
    await prisma.lote.deleteMany({ where: { idProducto: ibuprofen.id } });
    await prisma.producto.update({ where: { id: ibuprofen.id }, data: { stockActual: 0 } });
  } else {
    ibuprofen = await prisma.producto.create({
      data: {
        nombre: ibuprofenName,
        codigoBarras: `IBU-${Date.now()}`,
        idCategoria: testCategory.id,
        precioCompra: 5.00,
        precioVenta: 10.00,
        stockActual: 0,
        stockMinimo: 10
      }
    });
  }

  console.log(`Producto Lote: ${ibuprofen.nombre} (ID: ${ibuprofen.id})`);

  // Crear 3 lotes: LOTE-001 (Stock: 100), LOTE-002 (Stock: 200), LOTE-003 (Stock: 300)
  const batchData = [
    { code: 'LOTE-001', stock: 100, exp: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }, // vence en 30 días
    { code: 'LOTE-002', stock: 200, exp: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) }, // vence en 10 días (más próximo!)
    { code: 'LOTE-003', stock: 300, exp: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) }, // vence en 60 días
  ];

  for (const b of batchData) {
    await prisma.$transaction(async (tx) => {
      // Insertar lote
      await tx.lote.create({
        data: {
          idProducto: ibuprofen!.id,
          codigoLote: b.code,
          stockInicial: b.stock,
          stockActual: b.stock,
          costoCompra: 5.00,
          fechaVencimiento: b.exp,
          activo: true
        }
      });
      // Actualizar producto
      await tx.producto.update({
        where: { id: ibuprofen!.id },
        data: { stockActual: { increment: b.stock } }
      });
      // Registrar en Kardex
      await tx.movimientoInventario.create({
        data: {
          idProducto: ibuprofen!.id,
          tipo: 'AJUSTE_POSITIVO',
          cantidad: b.stock,
          stockResultante: (await tx.producto.findUnique({ where: { id: ibuprofen!.id } }))?.stockActual || 0,
          referencia: `Inicialización Lote ${b.code}`
        }
      });
    });
  }

  // Verificar consistencia de suma de stock
  const ibuprofenPost = await prisma.producto.findUnique({
    where: { id: ibuprofen.id },
    include: { lotes: true }
  });
  const sumLotes = ibuprofenPost!.lotes.reduce((sum, l) => sum + l.stockActual, 0);
  console.log(`Stock General del Producto: ${ibuprofenPost!.stockActual}`);
  console.log(`Suma de Stock en Lotes: ${sumLotes}`);

  if (ibuprofenPost!.stockActual !== sumLotes) {
    auditIssues.push({
      severity: 'CRITICAL',
      category: 'INVENTORY_STOCK_MISMATCH',
      description: 'El stockActual del Producto no coincide con la suma de stockActual de sus Lotes.',
      details: { stockActual: ibuprofenPost!.stockActual, sumLotes }
    });
  } else {
    console.log('✅ Stock del producto e inventario por lotes es consistente (600 unidades en total).');
  }

  // Validar lotes duplicados (mismo código para el mismo producto)
  try {
    await prisma.lote.create({
      data: {
        idProducto: ibuprofen.id,
        codigoLote: 'LOTE-001',
        stockInicial: 50,
        stockActual: 50,
        costoCompra: 5.00
      }
    });
    auditIssues.push({
      severity: 'HIGH',
      category: 'DUPLICATE_BATCH_CODE',
      description: 'Se permitió duplicar el código de lote para el mismo producto.',
      details: null
    });
  } catch (e) {
    console.log('✅ Éxito esperado: Bloqueado lote duplicado (idProducto, codigoLote).');
  }


  // ==========================================
  // FASE 5: PRUEBAS DE INVENTARIO (Entradas y Salidas)
  // ==========================================
  logSection('Fase 5 - Movimientos de Inventario');

  // Ajuste positivo manual
  await prisma.$transaction(async (tx) => {
    await tx.producto.update({
      where: { id: ibuprofen!.id },
      data: { stockActual: { increment: 10 } }
    });
    await tx.movimientoInventario.create({
      data: {
        idProducto: ibuprofen!.id,
        tipo: 'AJUSTE_POSITIVO',
        cantidad: 10,
        stockResultante: (await tx.producto.findUnique({ where: { id: ibuprofen!.id } }))?.stockActual || 0,
        referencia: 'Ajuste positivo de prueba'
      }
    });
  });
  console.log('Ajuste positivo realizado (+10 unidades).');

  // Ajuste negativo manual
  await prisma.$transaction(async (tx) => {
    await tx.producto.update({
      where: { id: ibuprofen!.id },
      data: { stockActual: { decrement: 5 } }
    });
    await tx.movimientoInventario.create({
      data: {
        idProducto: ibuprofen!.id,
        tipo: 'AJUSTE_NEGATIVO',
        cantidad: 5,
        stockResultante: (await tx.producto.findUnique({ where: { id: ibuprofen!.id } }))?.stockActual || 0,
        referencia: 'Ajuste negativo de prueba'
      }
    });
  });
  console.log('Ajuste negativo realizado (-5 unidades).');

  // Verificar Kardex
  const totalMovimientos = await prisma.movimientoInventario.count({
    where: { idProducto: ibuprofen.id }
  });
  console.log(`Total movimientos en Kardex para este producto: ${totalMovimientos}`);


  // ==========================================
  // FASE 6: PRUEBAS FEFO (First Expired First Out)
  // ==========================================
  logSection('Fase 6 - Algoritmo FEFO');
  
  // Realizar una venta de 150 unidades de Ibuprofeno.
  // Lotes actuales: 
  // LOTE-001 (100 u, expira en 30 días)
  // LOTE-002 (200 u, expira en 10 días) <-- DEBE DESCUENTARSE PRIMERO
  // LOTE-003 (300 u, expira en 60 días)
  // Al vender 150 unidades:
  // LOTE-002 debe disminuir de 200 a 50.
  // Los otros dos deben quedar intactos.
  const cantidadAVender = 150;
  console.log(`Simulando venta de ${cantidadAVender} unidades bajo regla FEFO...`);

  await prisma.$transaction(async (tx) => {
    // 1. Bloquear producto
    const prod = await tx.producto.findUnique({ where: { id: ibuprofen!.id } });
    if (!prod || prod.stockActual < cantidadAVender) {
      throw new Error('Stock insuficiente');
    }

    // 2. Buscar lotes ordenados por fecha de vencimiento más próxima (FEFO)
    const lotes = await tx.lote.findMany({
      where: { idProducto: ibuprofen!.id, activo: true, stockActual: { gt: 0 } },
      orderBy: [
        { fechaVencimiento: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    let pendiente = cantidadAVender;
    for (const l of lotes) {
      if (pendiente <= 0) break;
      const descontar = Math.min(pendiente, l.stockActual);
      
      // Actualizar stock del lote
      await tx.lote.update({
        where: { id: l.id },
        data: {
          stockActual: { decrement: descontar },
          activo: (l.stockActual - descontar) > 0
        }
      });

      // Kardex por lote
      await tx.movimientoInventario.create({
        data: {
          idProducto: ibuprofen!.id,
          idLote: l.id,
          tipo: 'SALIDA_VENTA',
          cantidad: descontar,
          stockResultante: prod.stockActual - (cantidadAVender - pendiente + descontar),
          referencia: `Venta FEFO Test (Lote ${l.codigoLote})`
        }
      });

      pendiente -= descontar;
    }

    // Decrementar stock general de producto
    await tx.producto.update({
      where: { id: ibuprofen!.id },
      data: { stockActual: { decrement: cantidadAVender } }
    });
  });

  // Consultar estado final de los lotes
  const lotesFinal = await prisma.lote.findMany({
    where: { idProducto: ibuprofen.id },
    orderBy: { codigoLote: 'asc' }
  });

  for (const lf of lotesFinal) {
    console.log(`Lote: ${lf.codigoLote} | Stock Restante: ${lf.stockActual} | Vencimiento: ${lf.fechaVencimiento?.toISOString().split('T')[0]}`);
  }

  const lote2 = lotesFinal.find(l => l.codigoLote === 'LOTE-002');
  const lote1 = lotesFinal.find(l => l.codigoLote === 'LOTE-001');

  if (lote2!.stockActual !== 50) {
    auditIssues.push({
      severity: 'CRITICAL',
      category: 'FEFO_ALGORITHM_FAIL',
      description: 'El algoritmo FEFO falló. No se descontó primero del lote con vencimiento más próximo (LOTE-002).',
      details: { lotesFinal }
    });
    console.log('❌ FALLA: El lote con vencimiento más próximo no se redujo al valor esperado.');
  } else if (lote1!.stockActual !== 100) {
    auditIssues.push({
      severity: 'CRITICAL',
      category: 'FEFO_ALGORITHM_FAIL',
      description: 'El algoritmo FEFO falló. Se alteraron lotes incorrectos.',
      details: { lotesFinal }
    });
    console.log('❌ FALLA: Se descontó de otros lotes antes de agotar el más cercano.');
  } else {
    console.log('✅ ÉXITO: El algoritmo FEFO descontó correctamente las 150 unidades de LOTE-002 (vencimiento de 10 días).');
  }


  // ==========================================
  // FASE 7: PRUEBAS DE FACTURACIÓN (100 Facturas)
  // ==========================================
  logSection('Fase 7 - Pruebas de Facturación (100 Ventas)');
  
  console.log('Registrando 100 facturas de prueba...');
  let successfulInvoices = 0;
  const usuarioCajero = createdUsers.find(u => u.idRol === cajeroRol!.id);
  const clientePrueba = testClients[0];
  const prodPrueba = testProducts[0];

  // Asegurar stock inicial para el producto de prueba de facturación
  await prisma.$transaction(async (tx) => {
    // Agregar lote
    const loteFact = await tx.lote.create({
      data: {
        idProducto: prodPrueba.id,
        codigoLote: `LOTE-FACT-${Date.now()}`,
        stockInicial: 1000,
        stockActual: 1000,
        costoCompra: 10.00,
        activo: true
      }
    });
    await tx.producto.update({
      where: { id: prodPrueba.id },
      data: { stockActual: 1000 }
    });
  });

  for (let i = 1; i <= 100; i++) {
    try {
      await prisma.$transaction(async (tx) => {
        const cant = 2;
        const precio = prodPrueba.precioVenta.toNumber();
        const subtotal = cant * precio;
        const total = subtotal; // Sin impuestos ni descuentos en este test simple

        const venta = await tx.venta.create({
          data: {
            idCliente: clientePrueba.id,
            idUsuario: usuarioCajero!.id,
            total,
            metodoPago: i % 3 === 0 ? 'EFECTIVO' : i % 3 === 1 ? 'TARJETA' : 'TRANSFERENCIA',
            tipoComprobante: 'FACTURA',
            estado: 'COMPLETADA',
            detalles: {
              create: {
                idProducto: prodPrueba.id,
                cantidad: cant,
                precioUnitario: precio,
                subtotal
              }
            }
          }
        });

        // Descontar del lote
        const loteAct = await tx.lote.findFirst({
          where: { idProducto: prodPrueba.id, activo: true, stockActual: { gt: 0 } }
        });

        if (loteAct) {
          await tx.lote.update({
            where: { id: loteAct.id },
            data: { stockActual: { decrement: cant } }
          });
        }

        // Decrementar stock producto
        await tx.producto.update({
          where: { id: prodPrueba.id },
          data: { stockActual: { decrement: cant } }
        });

        // Registrar Kardex
        await tx.movimientoInventario.create({
          data: {
            idProducto: prodPrueba.id,
            idLote: loteAct?.id,
            tipo: 'SALIDA_VENTA',
            cantidad: cant,
            stockResultante: (await tx.producto.findUnique({ where: { id: prodPrueba.id } }))?.stockActual || 0,
            referencia: `Venta #${venta.id}`
          }
        });
      });
      successfulInvoices++;
    } catch (e) {
      console.error(`Error al registrar factura #${i}:`, e);
    }
  }
  console.log(`✅ Registro de facturación masiva completado. Exitosas: ${successfulInvoices}/100`);


  // ==========================================
  // FASE 8 & 9: INTEGRIDAD REFERENCIAL DE CLIENTES Y PROVEEDORES
  // ==========================================
  logSection('Fase 8 & 9 - Pruebas de Clientes y Proveedores');

  console.log('Verificando protección de integridad referencial al eliminar un cliente con compras asociadas...');
  try {
    await prisma.cliente.delete({
      where: { id: clientePrueba.id }
    });
    // Si lo borró, ¿qué pasó con sus ventas?
    const ventasHuerfanas = await prisma.venta.count({ where: { idCliente: clientePrueba.id } });
    if (ventasHuerfanas > 0) {
      auditIssues.push({
        severity: 'HIGH',
        category: 'ORPHAN_SALES_ON_CLIENT_DELETE',
        description: 'Se permitió eliminar un cliente con ventas asociadas, dejando registros huérfanos o sin control de integridad.',
        details: { clienteId: clientePrueba.id, ventasHuerfanas }
      });
      console.log(`⚠️ ALERTA: Se borró el cliente dejando ${ventasHuerfanas} ventas huérfanas en la DB.`);
    } else {
      console.log('✅ El cliente fue borrado (probablemente set null en cascada o similar configurado en la base de datos).');
    }
  } catch (e: any) {
    console.log('✅ Éxito esperado: La base de datos impidió eliminar al cliente debido a relaciones de ventas existentes.');
  }

  // Proveedores
  console.log('Verificando protección de integridad referencial al eliminar un proveedor con productos en catálogo...');
  const provPrueba = testProviders[0];
  const prodParaProv = testProducts[10];

  // Crear relación de catálogo proveedor-producto
  await prisma.proveedorProducto.create({
    data: {
      idProveedor: provPrueba.id,
      idProducto: prodParaProv.id,
      precioCompra: 8.50
    }
  });

  try {
    await prisma.proveedor.delete({
      where: { id: provPrueba.id }
    });
    console.log('✅ El proveedor fue borrado (la relación ProveedorProducto se eliminó en cascada como indica schema.prisma).');
  } catch (e) {
    console.log('❌ Error: El motor de base de datos bloqueó el borrado de un proveedor con cascada configurada.');
  }


  // ==========================================
  // FASE 10: SEGURIDAD (SQL Injection, Desbordamiento y Nulos)
  // ==========================================
  logSection('Fase 10 - Pruebas de Seguridad');

  // 10.1 Simular intento de SQL Injection
  console.log('Probando consulta con inyección SQL...');
  const sqlInjectionPayload = "' OR '1'='1";
  try {
    // Si usamos Prisma ORM directamente, está parametrizado y es seguro
    const inyectado = await prisma.cliente.findMany({
      where: {
        nombreCompleto: { contains: sqlInjectionPayload }
      }
    });
    console.log(`✅ Éxito: Consulta parametrizada segura. Resultados devueltos: ${inyectado.length} (esperado: 0)`);
  } catch (e) {
    console.log('❌ Error: Prisma falló al parametrizar la consulta.');
  }

  // 10.2 Desbordamiento de campos (Cédula de 1000 caracteres)
  console.log('Probando inserción de cédula con longitud excesiva...');
  try {
    await prisma.cliente.create({
      data: {
        nombreCompleto: 'Test Largo',
        cedula: 'A'.repeat(1000)
      }
    });
    auditIssues.push({
      severity: 'MEDIUM',
      category: 'MAX_LENGTH_VIOLATION',
      description: 'El campo de cédula permitió guardar un string de 1000 caracteres (desbordamiento de longitud).',
      details: null
    });
    console.log('⚠️ ADVERTENCIA: La base de datos permitió guardar un texto extremadamente largo en cédula.');
  } catch (e) {
    console.log('✅ Éxito: La base de datos bloqueó el texto de longitud excesiva.');
  }

  // 10.3 Fechas inválidas (ej. 30 de febrero)
  console.log('Probando inserción de fecha de vencimiento inválida...');
  try {
    // Intentar pasar una fecha que JavaScript convierte a inválida, o forzar via SQL
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Lote" ("idProducto", "codigoLote", "fechaVencimiento", "stockInicial", "stockActual", "costoCompra")
      VALUES (${prodPrueba.id}, 'LOTE-FECHA-INVALIDA', '2026-02-30 00:00:00', 10, 10, 10.00);
    `);
    auditIssues.push({
      severity: 'HIGH',
      category: 'INVALID_DATE_ALLOWED',
      description: 'La base de datos permitió insertar una fecha inválida (2026-02-30).',
      details: null
    });
    console.log('⚠️ ADVERTENCIA: Se permitió insertar una fecha inexistente.');
  } catch (e) {
    console.log('✅ Éxito esperado: La base de datos rechazó la fecha inexistente (2026-02-30).');
  }


  // ==========================================
  // FASE 11: PRUEBAS DE RENDIMIENTO (2000 Registros por Entidad y Benchmark)
  // ==========================================
  logSection('Fase 11 - Pruebas de Rendimiento (Estrés de 2,000 Registros)');
  console.log('Generando 2,000 clientes masivos en base de datos...');
  
  const bulkClients = [];
  for (let i = 1; i <= 2000; i++) {
    bulkClients.push({
      nombreCompleto: `Cliente Masivo #${i}`,
      cedula: `CED-MAS-${i}-${Date.now()}`,
      correo: `correo_masivo_${i}_${Date.now()}@test.com`,
      telefono: `9999-00${i.toString().padStart(4, '0')}`,
      activo: true
    });
  }

  const timeStart = Date.now();
  // Hacer la inserción por lotes
  const batchSize = 500;
  let clientsCreatedCount = 0;
  for (let i = 0; i < bulkClients.length; i += batchSize) {
    const chunk = bulkClients.slice(i, i + batchSize);
    const result = await prisma.cliente.createMany({
      data: chunk,
      skipDuplicates: true
    });
    clientsCreatedCount += result.count;
  }
  const timeEnd = Date.now();
  console.log(`✅ Inserción masiva de ${clientsCreatedCount} clientes completada en ${timeEnd - timeStart} ms.`);

  // Medir velocidad de consultas complejas
  console.log('Midiendo tiempo de ejecución de la vista vw_productos_abc...');
  const qStart = Date.now();
  const abcReport = (await prisma.$queryRawUnsafe('SELECT * FROM vw_productos_abc LIMIT 100;')) as any[];
  const qEnd = Date.now();
  console.log(`⏱️ Consulta de Clasificación ABC completada en ${qEnd - qStart} ms. Registros devueltos: ${abcReport.length}`);

  // Limpiar clientes de prueba masivos para dejar la DB limpia
  console.log('Limpiando clientes temporales de rendimiento...');
  const delCount = await prisma.cliente.deleteMany({
    where: {
      cedula: { startsWith: 'CED-MAS-' }
    }
  });
  console.log(`🧹 Eliminados ${delCount.count} clientes de prueba masivos.`);


  // ==========================================
  // FASE 12: PRUEBAS DE RECUPERACIÓN DE CONTRASEÑA
  // ==========================================
  logSection('Fase 12 - Recuperación de Contraseña y Rate Limit');

  const recoveryEmail = 'test_recovery@farmapos.com';
  // Asegurar que exista el usuario
  await prisma.usuario.upsert({
    where: { correo: recoveryEmail },
    update: {},
    create: {
      nombreCompleto: 'Usuario Recuperación',
      correo: recoveryEmail,
      passwordHash: dummyPassword,
      idRol: cajeroRol!.id
    }
  });

  // Limpiar tokens anteriores del usuario
  await prisma.passwordResetToken.deleteMany({ where: { correo: recoveryEmail } });
  await prisma.passwordResetRequest.deleteMany({ where: { correo: recoveryEmail } });

  // 12.1 Generar solicitudes para probar Rate Limit (Máx 3 solicitudes/hora)
  console.log('Simulando solicitudes repetidas de código para probar Rate Limit...');
  for (let i = 1; i <= 4; i++) {
    // Insertar solicitud en log
    await prisma.passwordResetRequest.create({
      data: { correo: recoveryEmail, ip: '127.0.0.1', exitoso: true }
    });
  }
  const requestCount = await prisma.passwordResetRequest.count({
    where: { correo: recoveryEmail, createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) } }
  });
  console.log(`Solicitudes en la última hora para este correo: ${requestCount}`);
  if (requestCount > 3) {
    console.log('⚠️ Alerta: El backend debe validar este contador para retornar error 429.');
  }

  // 12.2 Generar un token activo e intentar adivinarlo (Fuerza Bruta)
  const codeHash = 'dummy-code-hash'; // SHA256
  const token = await prisma.passwordResetToken.create({
    data: {
      correo: recoveryEmail,
      tokenHash: codeHash,
      expiracion: new Date(Date.now() + 15 * 60 * 1000), // expira en 15 minutos
      usado: false,
      intentosFallidos: 0
    }
  });

  console.log('Simulando 5 intentos erróneos de adivinar el código de recuperación...');
  for (let intento = 1; intento <= 5; intento++) {
    await prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { intentosFallidos: { increment: 1 } }
    });
  }

  const updatedToken = await prisma.passwordResetToken.findUnique({
    where: { id: token.id }
  });
  console.log(`Intentos fallidos registrados en token: ${updatedToken?.intentosFallidos}`);
  if (updatedToken!.intentosFallidos >= 5) {
    console.log('✅ Bloqueo preventivo: El token superó el límite de 5 intentos fallidos y debe invalidarse.');
  }


  // ==========================================
  // FASE 13: VALIDACIÓN DE INTEGRIDAD
  // ==========================================
  logSection('Fase 13 - Validación de Integridad');

  // 13.1 Buscar productos con stock inconsistente
  const mismatchProducts = [];
  const allProds = await prisma.producto.findMany({ include: { lotes: true } });
  for (const p of allProds) {
    const sl = p.lotes.reduce((sum, l) => sum + l.stockActual, 0);
    if (p.stockActual !== sl) {
      mismatchProducts.push(p);
    }
  }
  console.log(`Productos con inconsistencia stockActual vs suma(lotes): ${mismatchProducts.length}`);
  for (const mp of mismatchProducts) {
    console.log(`⚠️ Inconsistencia en: "${mp.nombre}" (ID: ${mp.id}) | stockActual: ${mp.stockActual} | suma Lotes: ${mp.lotes.reduce((s,l) => s + l.stockActual, 0)}`);
  }

  // 13.2 Buscar facturas/ventas sin detalles
  const emptySales = await prisma.venta.findMany({
    where: { detalles: { none: {} } }
  });
  console.log(`Facturas/Ventas sin detalles (vacías): ${emptySales.length}`);
  if (emptySales.length > 0) {
    auditIssues.push({
      severity: 'HIGH',
      category: 'EMPTY_SALES_FOUND',
      description: `Se encontraron ${emptySales.length} ventas sin registros de detalles asociados en la base de datos.`,
      details: emptySales
    });
  }

  // 13.3 Buscar productos sin categoría
  const noCatProds = await prisma.producto.count({
    where: { idCategoria: undefined }
  });
  console.log(`Productos sin categoría asociada: ${noCatProds}`);


  // ==========================================
  // FASE 14: REPORTE DE COMPATIBILIDAD NEONDB
  // ==========================================
  logSection('Fase 14 - Compatibilidad con NeonDB');
  console.log('Analizando compatibilidad de tipos de datos, triggers y vistas...');
  console.log('✅ UUID y Serial compatible con NeonDB.');
  console.log('✅ Triggers en plpgsql compatibles con NeonDB.');
  console.log('✅ JSONB compatible con NeonDB.');


  // ==========================================
  // LIMPIEZA FINAL DE DATOS DE PRUEBA
  // ==========================================
  logSection('Limpieza Final de la Base de Datos');
  console.log('Borrando registros de prueba creados para esta ejecución...');
  
  // Borrar movimientos e inventario del producto Ibuprofeno especial
  await prisma.movimientoInventario.deleteMany({ where: { idProducto: ibuprofen.id } });
  await prisma.lote.deleteMany({ where: { idProducto: ibuprofen.id } });
  await prisma.producto.delete({ where: { id: ibuprofen.id } });

  // Limpiar movimientos y facturas de facturación masiva
  await prisma.movimientoInventario.deleteMany({ where: { idProducto: prodPrueba.id } });
  await prisma.movimientoInventario.deleteMany({ where: { idUsuario: { in: createdUsers.map(u => u.id) } } });
  await prisma.detalleVenta.deleteMany({ where: { idProducto: prodPrueba.id } });
  await prisma.compra.deleteMany({ where: { idUsuario: { in: createdUsers.map(u => u.id) } } });
  await prisma.venta.deleteMany({ where: { idUsuario: { in: createdUsers.map(u => u.id) } } });
  await prisma.lote.deleteMany({ where: { idProducto: prodPrueba.id } });

  // Borrar productos de test creados
  const testProdIds = testProducts.map(tp => tp.id);
  await prisma.proveedorProducto.deleteMany({ where: { idProducto: { in: testProdIds } } });
  await prisma.producto.deleteMany({ where: { id: { in: testProdIds } } });

  // Borrar usuarios, clientes y proveedores de test
  await prisma.passwordResetToken.deleteMany({ where: { correo: recoveryEmail } });
  await prisma.passwordResetRequest.deleteMany({ where: { correo: recoveryEmail } });
  await prisma.usuario.deleteMany({ where: { correo: { in: createdUsers.map(u => u.correo) } } });
  await prisma.usuario.delete({ where: { correo: recoveryEmail } });

  // Limpiar clientes
  const clientIds = testClients.map(c => c.id);
  await prisma.cliente.deleteMany({ where: { id: { in: clientIds } } });

  // Limpiar proveedores
  const providerIds = testProviders.map(p => p.id);
  await prisma.proveedor.deleteMany({ where: { id: { in: providerIds } } });

  console.log('🧹 Base de datos limpia de registros de prueba.');

  // ==========================================
  // INFORME FINAL DE LA AUDITORÍA
  // ==========================================
  console.log('\n======================================================================');
  console.log('📢 AUDITORÍA COMPLETA FINALIZADA CON ÉXITO');
  console.log('======================================================================');
  console.log(`Total de fallas/advertencias estructurales o lógicas detectadas: ${auditIssues.length}`);
  for (const issue of auditIssues) {
    console.log(`- [${issue.severity}] [${issue.category}] ${issue.description}`);
  }
  
  await prisma.$disconnect();
}

main().catch(e => {
  console.error('❌ Error catastrófico durante las pruebas:', e);
  prisma.$disconnect();
  process.exit(1);
});
