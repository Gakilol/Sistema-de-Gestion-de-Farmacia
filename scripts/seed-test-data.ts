import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Prefijo obligatorio para datos de pruebas
const PREFIX = 'QA_TEST_'

async function main() {
  console.log('🌱 Iniciando carga de datos de prueba en la base de datos...')

  // ==========================================================================
  // REGLA DE SEGURIDAD 1 & 2: Validar entorno y prevenir ejecución en producción
  // ==========================================================================
  const isProdEnv = process.env.NODE_ENV === 'production' || process.env.APP_ENV === 'production'
  if (isProdEnv) {
    console.error('❌ ERROR CRÍTICO: No se pueden insertar datos de prueba en un entorno configurado como producción.')
    process.exit(1)
  }

  // Verificar si hay registros reales en la base de datos
  const realClientsCount = await prisma.cliente.count({
    where: {
      NOT: {
        nombreCompleto: { startsWith: PREFIX }
      }
    }
  })

  // Si hay más de 20 clientes que no tienen el prefijo QA_TEST_, asumimos que podría ser producción
  if (realClientsCount > 20) {
    console.error(`❌ ERROR CRÍTICO: Se detectaron ${realClientsCount} clientes reales sin el prefijo '${PREFIX}'. Operación abortada por seguridad.`)
    process.exit(1)
  }

  console.log('🔒 Verificación de seguridad aprobada. Procediendo a limpiar datos previos de pruebas...')

  // ==========================================================================
  // REGLA DE SEGURIDAD 10: Limpieza selectiva de datos de prueba previos (idempotencia)
  // ==========================================================================
  // Borrar en orden inverso de claves foráneas
  const testUsers = await prisma.usuario.findMany({
    where: { nombreCompleto: { startsWith: PREFIX } },
    select: { id: true }
  })
  const testUserIds = testUsers.map(u => u.id)

  const testClients = await prisma.cliente.findMany({
    where: { nombreCompleto: { startsWith: PREFIX } },
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

  console.log('🧹 Borrando registros de auditoría y Kardex vinculados a pruebas...')
  if (testProductIds.length > 0) {
    await prisma.movimientoInventario.deleteMany({ where: { idProducto: { in: testProductIds } } })
    await prisma.lote.deleteMany({ where: { idProducto: { in: testProductIds } } })
    await prisma.detalleVenta.deleteMany({ where: { idProducto: { in: testProductIds } } })
    await prisma.detalleCompra.deleteMany({ where: { idProducto: { in: testProductIds } } })
    await prisma.proveedorProducto.deleteMany({ where: { idProducto: { in: testProductIds } } })
  }

  if (testUserIds.length > 0) {
    await prisma.auditoriaLog.deleteMany({ where: { idUsuario: { in: testUserIds } } })
    await prisma.movimientoInventario.deleteMany({ where: { idUsuario: { in: testUserIds } } })
  }

  // Limpiar Auditoria transaccional DML creada por test
  await prisma.$executeRawUnsafe(`DELETE FROM "Auditoria" WHERE usuario LIKE '%@example.test' OR usuario LIKE 'QA_TEST_%'`)

  console.log('🧹 Borrando ventas y compras vinculadas a pruebas...')
  if (testUserIds.length > 0 || testClientIds.length > 0) {
    await prisma.venta.deleteMany({
      where: {
        OR: [
          { idUsuario: { in: testUserIds } },
          { idCliente: { in: testClientIds } }
        ]
      }
    })
  }

  if (testUserIds.length > 0 || testProviderIds.length > 0) {
    await prisma.compra.deleteMany({
      where: {
        OR: [
          { idUsuario: { in: testUserIds } },
          { idProveedor: { in: testProviderIds } }
        ]
      }
    })
  }

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

  console.log('✅ Base de datos limpia de pruebas previas. Iniciando inserción...');

  // ==========================================================================
  // 1. ROLES Y USUARIOS
  // ==========================================================================
  console.log('👤 Creando usuarios y roles...');
  let adminRol = await prisma.rol.findUnique({ where: { nombre: 'ADMIN' } })
  if (!adminRol) adminRol = await prisma.rol.create({ data: { nombre: 'ADMIN' } })

  let empleadoRol = await prisma.rol.findUnique({ where: { nombre: 'EMPLEADO' } })
  if (!empleadoRol) empleadoRol = await prisma.rol.create({ data: { nombre: 'EMPLEADO' } })

  const passwordHash = await bcrypt.hash('QA_password123!', 10)

  const rolesAsignados = [
    { nombreCompleto: `${PREFIX}ADMIN`, correo: 'qa_test_admin@example.test', passwordHash, idRol: adminRol.id, activo: true },
    { nombreCompleto: `${PREFIX}FARMACEUTICO`, correo: 'qa_test_farmaceutico@example.test', passwordHash, idRol: empleadoRol.id, activo: true },
    { nombreCompleto: `${PREFIX}CAJERO`, correo: 'qa_test_cajero@example.test', passwordHash, idRol: empleadoRol.id, activo: true },
    { nombreCompleto: `${PREFIX}BODEGA`, correo: 'qa_test_bodega@example.test', passwordHash, idRol: empleadoRol.id, activo: true },
    { nombreCompleto: `${PREFIX}AUDITOR`, correo: 'qa_test_auditor@example.test', passwordHash, idRol: adminRol.id, activo: true },
  ]

  const usersList: any[] = []
  for (const rData of rolesAsignados) {
    const user = await prisma.usuario.create({ data: rData })
    usersList.push(user)
  }
  const mainAdminUser = usersList.find(u => u.nombreCompleto.endsWith('ADMIN'))!
  console.log(`- 5 usuarios creados con éxito.`);

  // ==========================================================================
  // 2. CLIENTES
  // ==========================================================================
  console.log('👥 Creando clientes...');
  const clientsList: any[] = []

  // 30 clientes activos
  for (let i = 1; i <= 30; i++) {
    const c = await prisma.cliente.create({
      data: {
        nombreCompleto: `${PREFIX}Cliente_Activo_${i}`,
        correo: `qa_test_client_act_${i}@example.test`,
        telefono: `8888-9${i.toString().padStart(3, '0')}`,
        cedula: `001-QA-ACT-${i.toString().padStart(3, '0')}-0001A`,
        direccion: `Dirección ficticia activa ${i}`,
        activo: true
      }
    })
    clientsList.push(c)
  }

  // 5 clientes con datos mínimos
  for (let i = 1; i <= 5; i++) {
    const c = await prisma.cliente.create({
      data: {
        nombreCompleto: `${PREFIX}Cliente_Min_${i}`,
        cedula: `001-QA-MIN-${i.toString().padStart(3, '0')}-0001A`,
        activo: true
      }
    })
    clientsList.push(c)
  }

  // 5 clientes con nombres similares para pruebas de búsqueda
  const similares = [
    { nombre: `${PREFIX}Juan Perez`, email: 'juan_perez@example.test', cedula: '001-QA-SIM-001-0001A', phone: '8888-7001' },
    { nombre: `${PREFIX}Juan Perez Gomez`, email: 'juan_gomez@example.test', cedula: '001-QA-SIM-002-0001A', phone: '8888-7002' },
    { nombre: `${PREFIX}Juan Carlos Perez`, email: 'juan_carlos@example.test', cedula: '001-QA-SIM-003-0001A', phone: '8888-7003' },
    { nombre: `${PREFIX}Juana Perez`, email: 'juana_perez@example.test', cedula: '001-QA-SIM-004-0001A', phone: '8888-7004' },
    { nombre: `${PREFIX}Juan Perez Ortiz`, email: 'juan_ortiz@example.test', cedula: '001-QA-SIM-005-0001A', phone: '8888-7005' },
  ]
  for (const sim of similares) {
    const c = await prisma.cliente.create({
      data: {
        nombreCompleto: sim.nombre,
        correo: sim.email,
        telefono: sim.phone,
        cedula: sim.cedula,
        activo: true
      }
    })
    clientsList.push(c)
  }

  // 3 clientes inactivos
  for (let i = 1; i <= 3; i++) {
    const c = await prisma.cliente.create({
      data: {
        nombreCompleto: `${PREFIX}Cliente_Inact_${i}`,
        correo: `qa_test_client_ina_${i}@example.test`,
        telefono: `8888-8${i.toString().padStart(3, '0')}`,
        cedula: `001-QA-INA-${i.toString().padStart(3, '0')}-0001A`,
        direccion: `Dirección ficticia inactiva ${i}`,
        activo: false
      }
    })
    clientsList.push(c)
  }
  console.log(`- ${clientsList.length} clientes creados.`);

  // ==========================================================================
  // 3. PROVEEDORES
  // ==========================================================================
  console.log('🏢 Creando proveedores...');
  const providersList: any[] = []
  const provNames = [
    'Distribuidora Farmacéutica A',
    'Distribuidora Médica B',
    'Laboratorios Internacionales C',
    'Cuidado y Salud D',
    'Farmaservicios E',
    'Dermosalud F',
    'Ortopedia Central G',
    'Insumos Quirúrgicos H',
    'Nutrición y Deporte I',
    'Logística Farmacéutica J'
  ]
  for (let i = 0; i < provNames.length; i++) {
    const prov = await prisma.proveedor.create({
      data: {
        nombre: `${PREFIX}${provNames[i]}`,
        telefono: `2222-90${i.toString().padStart(2, '0')}`,
        correo: `prov_${i}@example.test`,
        direccion: `Complejo Industrial Bodega ${i + 1}`
      }
    })
    providersList.push(prov)
  }
  console.log(`- ${providersList.length} proveedores creados.`);

  // ==========================================================================
  // 4. CATEGORÍAS
  // ==========================================================================
  console.log('🏷️ Creando categorías...');
  const categoriesList: any[] = []
  const catNames = [
    'Analgésicos', 'Antibióticos', 'Vitaminas', 'Cuidado Personal', 'Higiene',
    'Material Médico', 'Productos Infantiles', 'Dermocosmética', 'Primeros Auxilios', 'Suplementos'
  ]
  for (const name of catNames) {
    const cat = await prisma.categoriaProducto.create({
      data: {
        nombre: `${PREFIX}${name}`,
        descripcion: `Categoría de prueba para ${name}`
      }
    })
    categoriesList.push(cat)
  }
  console.log(`- ${categoriesList.length} categorías creadas.`);

  // ==========================================================================
  // 5. PRODUCTOS (Catálogo inicial con stock = 0)
  // ==========================================================================
  console.log('📦 Creando catálogo de 80 productos de prueba...');
  const productsList: any[] = []

  // Estructura de distribución:
  // - 40 stock normal
  // - 10 stock bajo
  // - 5 stock cero
  // - 5 próximos a vencer
  // - 5 vencidos
  // - 10 múltiples lotes
  // - 5 de alta rotación (concurrencia)

  const normalProds = Array.from({ length: 40 }).map((_, i) => ({
    nombre: `${PREFIX}Paracetamol_${i + 1}`,
    bar: `${PREFIX}BAR_NORM_${i + 1}`,
    min: 10,
    precioV: 15.00,
    precioC: 10.00,
    catIndex: 0 // Analgésicos
  }))

  const lowStockProds = Array.from({ length: 10 }).map((_, i) => ({
    nombre: `${PREFIX}Amoxicilina_${i + 1}`,
    bar: `${PREFIX}BAR_LOW_${i + 1}`,
    min: 20,
    precioV: 35.00,
    precioC: 22.00,
    catIndex: 1 // Antibióticos
  }))

  const zeroStockProds = Array.from({ length: 5 }).map((_, i) => ({
    nombre: `${PREFIX}Vitamina_C_${i + 1}`,
    bar: `${PREFIX}BAR_ZERO_${i + 1}`,
    min: 5,
    precioV: 8.00,
    precioC: 5.00,
    catIndex: 2 // Vitaminas
  }))

  const expiringProds = Array.from({ length: 5 }).map((_, i) => ({
    nombre: `${PREFIX}Jarabe_Tos_${i + 1}`,
    bar: `${PREFIX}BAR_EXP_${i + 1}`,
    min: 8,
    precioV: 24.00,
    precioC: 16.00,
    catIndex: 0 // Analgésicos
  }))

  const expiredProds = Array.from({ length: 5 }).map((_, i) => ({
    nombre: `${PREFIX}Crema_Tópica_${i + 1}`,
    bar: `${PREFIX}BAR_EXPD_${i + 1}`,
    min: 5,
    precioV: 40.00,
    precioC: 28.00,
    catIndex: 7 // Dermocosmética
  }))

  const multiBatchProds = Array.from({ length: 10 }).map((_, i) => ({
    nombre: `${PREFIX}Gasas_Estériles_${i + 1}`,
    bar: `${PREFIX}BAR_MULT_${i + 1}`,
    min: 15,
    precioV: 12.00,
    precioC: 7.00,
    catIndex: 5 // Material Médico
  }))

  const concurrencyProds = Array.from({ length: 5 }).map((_, i) => ({
    nombre: `${PREFIX}Alcohol_Glicerinado_${i + 1}`,
    bar: `${PREFIX}BAR_CONC_${i + 1}`,
    min: 10,
    precioV: 18.00,
    precioC: 12.00,
    catIndex: 4 // Higiene
  }))

  const allProductDefs = [
    ...normalProds,
    ...lowStockProds,
    ...zeroStockProds,
    ...expiringProds,
    ...expiredProds,
    ...multiBatchProds,
    ...concurrencyProds
  ]

  for (const pDef of allProductDefs) {
    const prod = await prisma.producto.create({
      data: {
        nombre: pDef.nombre,
        codigoBarras: pDef.bar,
        descripcion: `Producto de prueba ${pDef.nombre}`,
        idCategoria: categoriesList[pDef.catIndex].id,
        precioCompra: pDef.precioC,
        precioVenta: pDef.precioV,
        precioBlister: pDef.precioV * 0.12, // Precio blíster opcional
        precioCaja: pDef.precioV * 10,       // Precio caja opcional
        unidadesPorBlister: 10,
        unidadesPorCaja: 100,
        stockActual: 0, // Iniciamos en 0, se poblará mediante compras simuladas
        stockMinimo: pDef.min,
        activo: true,
        laboratorio: 'QA Labs Corp',
        concentracion: '500 mg',
        unidadMedida: 'unidad'
      }
    })
    productsList.push(prod)

    // Crear catálogo ProveedorProducto
    await prisma.proveedorProducto.create({
      data: {
        idProveedor: providersList[Math.floor(Math.random() * providersList.length)].id,
        idProducto: prod.id,
        precioCompra: pDef.precioC
      }
    })
  }
  console.log(`- ${productsList.length} productos creados en el catálogo.`);

  // ==========================================================================
  // 6. SIMULACIÓN DE COMPRAS (15 compras para poblar lotes e inventario)
  // ==========================================================================
  console.log('🛒 Simulando 15 facturas de compra...');
  const purchasesList: any[] = []

  // Mapeamos productos para facilitar la asignación
  const normalStockProducts = productsList.filter(p => p.nombre.includes('Paracetamol_'))
  const lowStockProducts = productsList.filter(p => p.nombre.includes('Amoxicilina_'))
  const expiringStockProducts = productsList.filter(p => p.nombre.includes('Jarabe_Tos_'))
  const expiredStockProducts = productsList.filter(p => p.nombre.includes('Crema_Tópica_'))
  const multiBatchProducts = productsList.filter(p => p.nombre.includes('Gasas_Estériles_'))
  const concurrencyStockProducts = productsList.filter(p => p.nombre.includes('Alcohol_Glicerinado_'))

  // 15 compras a realizar:
  // Cada compra agrupará un conjunto de productos para simular facturas reales.
  const purchasePlans: any[] = []

  // Dividimos los productos en 15 lotes de compra
  // Compras 1 a 10: Productos Normales (4 cada uno) + stock bajo (1 cada uno) + multi-lote Lote A (1 cada uno)
  for (let i = 0; i < 10; i++) {
    const items: any[] = []
    // 4 productos normales
    for (let j = 0; j < 4; j++) {
      const prod = normalStockProducts[i * 4 + j]
      items.push({ idProducto: prod.id, cantidad: 50, costo: Number(prod.precioCompra), lote: `QA_LOTE_NORM_${i}_${j}`, diasVence: 365 })
    }
    // 1 stock bajo (compramos 5, mínimo es 20, por tanto quedará bajo)
    const lowProd = lowStockProducts[i]
    items.push({ idProducto: lowProd.id, cantidad: 5, costo: Number(lowProd.precioCompra), lote: `QA_LOTE_LOW_${i}`, diasVence: 200 })

    // 1 producto multi-lote (Primer lote: Lote A)
    const multiProd = multiBatchProducts[i]
    items.push({ idProducto: multiProd.id, cantidad: 20, costo: Number(multiProd.precioCompra), lote: `QA_LOTE_MULT_A_${i}`, diasVence: 60 })

    purchasePlans.push({ providerIndex: i % 10, items })
  }

  // Compras 11 a 13: Próximos a vencer, Vencidos y Concurrencia
  // Compra 11: 5 próximos a vencer
  const itemsC11 = expiringStockProducts.map((p, idx) => ({
    idProducto: p.id,
    cantidad: 20,
    costo: Number(p.precioCompra),
    lote: `QA_LOTE_EXP_${idx}`,
    diasVence: 15 // Próximos a vencer en 15 días
  }))
  purchasePlans.push({ providerIndex: 0, items: itemsC11 })

  // Compra 12: 5 vencidos
  const itemsC12 = expiredStockProducts.map((p, idx) => ({
    idProducto: p.id,
    cantidad: 15,
    costo: Number(p.precioCompra),
    lote: `QA_LOTE_EXPD_${idx}`,
    diasVence: -10 // Vencidos hace 10 días
  }))
  purchasePlans.push({ providerIndex: 1, items: itemsC12 })

  // Compra 13: 5 productos de alta rotación (concurrencia)
  const itemsC13 = concurrencyStockProducts.map((p, idx) => ({
    idProducto: p.id,
    cantidad: 100,
    costo: Number(p.precioCompra),
    lote: `QA_LOTE_CONC_${idx}`,
    diasVence: 180
  }))
  purchasePlans.push({ providerIndex: 2, items: itemsC13 })

  // Compra 14 y 15: Multi-lotes (Lote B para los 10 productos multi-lote)
  const itemsC14: any[] = []
  const itemsC15: any[] = []
  for (let i = 0; i < 5; i++) {
    const p1 = multiBatchProducts[i]
    const p2 = multiBatchProducts[i + 5]
    itemsC14.push({ idProducto: p1.id, cantidad: 30, costo: Number(p1.precioCompra), lote: `QA_LOTE_MULT_B_${i}`, diasVence: 200 })
    itemsC15.push({ idProducto: p2.id, cantidad: 30, costo: Number(p2.precioCompra), lote: `QA_LOTE_MULT_B_${i + 5}`, diasVence: 200 })
  }
  purchasePlans.push({ providerIndex: 3, items: itemsC14 })
  purchasePlans.push({ providerIndex: 4, items: itemsC15 })

  // Ejecutamos las 15 compras a través del flujo simulado
  let compCount = 1
  for (const plan of purchasePlans) {
    const prov = providersList[plan.providerIndex]
    const totalCompra = plan.items.reduce((acc: number, item: any) => acc + (item.cantidad * item.costo), 0)

    const compra = await prisma.compra.create({
      data: {
        fecha: new Date(Date.now() - (15 - compCount) * 24 * 60 * 60 * 1000), // Fechas escalonadas en el pasado
        fechaCompra: new Date(Date.now() - (15 - compCount) * 24 * 60 * 60 * 1000),
        numeroFactura: `FAC-QA-TEST-${1000 + compCount}`,
        idProveedor: prov.id,
        idUsuario: mainAdminUser.id,
        total: totalCompra,
        detalles: {
          create: plan.items.map((item: any) => ({
            idProducto: item.idProducto,
            cantidad: item.cantidad,
            precioUnitario: item.costo,
            subtotal: item.cantidad * item.costo,
            lote: item.lote,
            fechaVencimiento: new Date(Date.now() + item.diasVence * 24 * 60 * 60 * 1000)
          }))
        }
      },
      include: { detalles: true }
    })
    purchasesList.push(compra)

    // Afectar inventario, lotes y Kardex para cada detalle de compra
    for (const det of compra.detalles) {
      const planItem = plan.items.find((item: any) => item.idProducto === det.idProducto)!
      const fechaVenc = new Date(Date.now() + planItem.diasVence * 24 * 60 * 60 * 1000)

      // Crear/actualizar Lote
      const lote = await prisma.lote.create({
        data: {
          idProducto: det.idProducto,
          codigoLote: det.lote || 'N/A',
          fechaVencimiento: fechaVenc,
          stockInicial: det.cantidad,
          stockActual: det.cantidad,
          costoCompra: det.precioUnitario,
          idDetalleCompra: det.id,
          activo: det.cantidad > 0
        }
      })

      // Actualizar Producto (stock e incrementar precioCompra promedio)
      const prodObj = productsList.find(p => p.id === det.idProducto)!
      const stockAnterior = prodObj.stockActual
      const nuevoStock = stockAnterior + det.cantidad
      prodObj.stockActual = nuevoStock

      await prisma.producto.update({
        where: { id: det.idProducto },
        data: {
          stockActual: nuevoStock,
          precioCompra: det.precioUnitario // Para simplificar, el último costo
        }
      })

      // Crear Kardex (MovimientoInventario)
      await prisma.movimientoInventario.create({
        data: {
          idProducto: det.idProducto,
          idLote: lote.id,
          tipo: 'ENTRADA_COMPRA',
          cantidad: det.cantidad,
          stockResultante: nuevoStock,
          costoUnitario: det.precioUnitario,
          referencia: `Compra #${compra.id} (Fact: ${compra.numeroFactura})`,
          idUsuario: mainAdminUser.id,
          observacion: `Entrada por lote ${lote.codigoLote} en carga de pruebas.`
        }
      })
    }

    compCount++
  }
  console.log(`- 15 compras registradas y procesadas en inventario.`);

  // ==========================================================================
  // 7. SIMULACIÓN DE VENTAS (40 ventas)
  // ==========================================================================
  console.log('💵 Simulando 40 facturas de venta...');
  let ventaCount = 1

  // Para las 40 ventas, usaremos productos normales y multi-lote que tienen stock suficiente
  // Y escalonaremos las fechas en los últimos 10 días para llenar los reportes diarios
  for (let i = 0; i < 40; i++) {
    const cajero = usersList[i % 5] // Rotación de cajero
    const cliente = i % 5 === 0 ? null : clientsList[i % clientsList.length] // Venta con o sin cliente
    const metodoPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'][i % 3]

    // Elegir 1 o 2 productos con stock
    // Para simplificar, tomamos un producto normal del índice i % 40
    const prodNormal = normalStockProducts[i % normalStockProducts.length]
    // Y un producto multilote para probar FEFO
    const prodMulti = multiBatchProducts[i % multiBatchProducts.length]

    const itemsVender = [
      { idProducto: prodNormal.id, cantidad: 2, tipoUnidad: 'UNIDAD' },
      { idProducto: prodMulti.id, cantidad: 3, tipoUnidad: 'UNIDAD' }
    ]

    // Validar stock disponible
    let facturar = true
    for (const item of itemsVender) {
      const prod = productsList.find(p => p.id === item.idProducto)!
      if (prod.stockActual < item.cantidad) {
        facturar = false
      }
    }

    if (!facturar) continue

    // Calcular total de la venta
    let totalVenta = 0
    const detallesVentaData: any[] = []

    for (const item of itemsVender) {
      const prod = productsList.find(p => p.id === item.idProducto)!
      const sub = Number(prod.precioVenta) * item.cantidad
      totalVenta += sub
      detallesVentaData.push({
        idProducto: item.idProducto,
        cantidad: item.cantidad,
        precioUnitario: prod.precioVenta,
        subtotal: sub,
        tipoUnidad: item.tipoUnidad
      })
    }

    // Crear Venta
    const venta = await prisma.venta.create({
      data: {
        fecha: new Date(Date.now() - (10 - Math.floor(i / 4)) * 24 * 60 * 60 * 1000), // Escalonar en los últimos 10 días
        idCliente: cliente ? cliente.id : null,
        total: totalVenta,
        metodoPago,
        idUsuario: cajero.id,
        tipoComprobante: i % 10 === 0 ? 'FACTURA' : 'RECIBO',
        estado: i === 39 ? 'ANULADA' : 'COMPLETADA', // Anulamos la última venta para probar el estado anulado
        montoRecibido: totalVenta + 20,
        cambio: 20
      },
      include: { detalles: true }
    })

    // Crear Detalles de Venta
    for (const det of detallesVentaData) {
      const dv = await prisma.detalleVenta.create({
        data: {
          idVenta: venta.id,
          idProducto: det.idProducto,
          cantidad: det.cantidad,
          precioUnitario: det.precioUnitario,
          subtotal: det.subtotal,
          tipoUnidad: det.tipoUnidad
        }
      })

      const prodObj = productsList.find(p => p.id === det.idProducto)!
      // Deducir stock mediante FEFO si el estado es COMPLETADA
      if (venta.estado === 'COMPLETADA') {
        let pendiente = det.cantidad
        const stockInicialProd = prodObj.stockActual

        // Buscar lotes activos con stock
        const lotes = await prisma.lote.findMany({
          where: { idProducto: det.idProducto, activo: true, stockActual: { gt: 0 } },
          orderBy: [
            { fechaVencimiento: 'asc' },
            { createdAt: 'asc' }
          ]
        })

        for (const lote of lotes) {
          if (pendiente <= 0) break

          const deducir = Math.min(pendiente, lote.stockActual)
          const nuevoLoteStock = lote.stockActual - deducir

          // Actualizar lote
          await prisma.lote.update({
            where: { id: lote.id },
            data: {
              stockActual: nuevoLoteStock,
              activo: nuevoLoteStock > 0
            }
          })

          // Crear Kardex (SALIDA_VENTA)
          console.log(`[Venta debug] idProducto: ${det.idProducto}, idLote: ${lote.id}, loteExiste: ${await prisma.lote.findUnique({ where: { id: lote.id } }) ? 'SI' : 'NO'}`)
          await prisma.movimientoInventario.create({
            data: {
              idProducto: det.idProducto,
              idLote: lote.id,
              tipo: 'SALIDA_VENTA',
              cantidad: deducir,
              stockResultante: prodObj.stockActual - deducir,
              costoUnitario: lote.costoCompra,
              referencia: `Venta #${venta.id}`,
              idUsuario: cajero.id,
              observacion: `Salida de venta. Deducción lote ${lote.codigoLote}.`
            }
          })

          prodObj.stockActual -= deducir
          pendiente -= deducir
        }

        // Actualizar stock del producto
        await prisma.producto.update({
          where: { id: det.idProducto },
          data: { stockActual: prodObj.stockActual }
        })
      } else if (venta.estado === 'ANULADA') {
        // En ventas anuladas no deducimos el stock, pero sí queda registrado el movimiento de anulación en Kardex (si existiera)
        await prisma.movimientoInventario.create({
          data: {
            idProducto: det.idProducto,
            tipo: 'DEVOLUCION',
            cantidad: det.cantidad,
            stockResultante: prodObj.stockActual,
            referencia: `Venta #${venta.id} Anulada`,
            idUsuario: cajero.id,
            observacion: `Venta anulada. No se modificó el inventario físico.`
          }
        })
      }
    }

    ventaCount++
  }
  console.log(`- 40 ventas simuladas (y procesada deducción FEFO de lotes).`);

  // ==========================================================================
  // 8. AUDITORÍA ADICIONAL
  // ==========================================================================
  console.log('📝 Generando logs de auditoría...');
  const auditLogs = [
    { accion: 'CREAR_USUARIO', entidad: 'Usuario', entidadId: mainAdminUser.id, detalles: 'Usuario administrador creado por seed' },
    { accion: 'CREAR_CLIENTE', entidad: 'Cliente', entidadId: clientsList[0].id, detalles: 'Primer cliente de prueba creado por seed' },
    { accion: 'CREAR_PROVEEDOR', entidad: 'Proveedor', entidadId: providersList[0].id, detalles: 'Proveedor inicial creado por seed' },
    { accion: 'AJUSTE_INVENTARIO', entidad: 'Producto', entidadId: productsList[0].id, detalles: 'Ajuste inicial de catálogo cargado en base de datos' },
    { accion: 'INICIO_SESION', entidad: 'Usuario', entidadId: mainAdminUser.id, detalles: 'Ingreso al sistema por QA_TEST_ADMIN desde IP 127.0.0.1' },
    { accion: 'CAMBIO_PRECIO', entidad: 'Producto', entidadId: productsList[0].id, detalles: 'Precio de venta ajustado de 14.00 a 15.00 por el administrador' },
  ]
  for (const log of auditLogs) {
    await prisma.auditoriaLog.create({
      data: {
        accion: log.accion,
        entidad: log.entidad,
        entidadId: log.entidadId,
        detalles: log.detalles,
        idUsuario: mainAdminUser.id
      }
    })
  }
  console.log('- Logs de auditoría de aplicación cargados.');

  console.log('🎉 Carga de datos de prueba finalizada de forma EXITOSA! 🎉')
}

main()
  .catch((e) => {
    console.error('❌ Error catastrófico durante la carga de datos de prueba:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
