import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Helper functions for localized unique values
function generateRandomPhone() {
  return `8${Math.floor(1000000 + Math.random() * 9000000)}`
}

function generateRandomCedula() {
  const d1 = Math.floor(100 + Math.random() * 900)
  const d2 = Math.floor(100000 + Math.random() * 900000)
  const d3 = Math.floor(1000 + Math.random() * 9000)
  const letter = "ABCDEFGHJKLMNOPQRSTUVWXYZ"[Math.floor(Math.random() * 25)]
  return `${d1.toString().padStart(3, '0')}-${d2.toString().padStart(6, '0')}-${d3.toString().padStart(4, '0')}${letter}`
}

function generateRandomEmail(name: string) {
  const clean = name.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, '.')
  const rand = Math.floor(1000 + Math.random() * 9000)
  return `${clean}.${rand}@gmail.com`
}

async function main() {
  console.log('🌱 Iniciando carga de datos de prueba localizados de Nicaragua en la base de datos...')

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
    where: { esDatoPrueba: false }
  })

  // Si hay más de 50 clientes que no son datos de prueba, asumimos que podría ser producción
  if (realClientsCount > 50) {
    console.error(`❌ ERROR CRÍTICO: Se detectaron ${realClientsCount} clientes reales en la base de datos. Operación abortada por seguridad.`)
    process.exit(1)
  }

  console.log('🔒 Verificación de seguridad aprobada. Procediendo a limpiar datos previos de pruebas...')

  // ==========================================================================
  // Limpieza selectiva de datos de prueba previos (idempotencia)
  // ==========================================================================
  // 1. Identificar por flag esDatoPrueba
  const testUsers = await prisma.usuario.findMany({ where: { esDatoPrueba: true }, select: { id: true, correo: true } })
  const testUserIds = testUsers.map(u => u.id)
  const testUserEmails = testUsers.map(u => u.correo)

  // 2. Identificar por conflicto de correos de usuarios a registrar
  const seedEmails = [
    'carlos.mendoza@gmail.com',
    'diana.castillo@gmail.com',
    'jorge.castro@gmail.com',
    'karla.mendez@gmail.com',
    'luis.fuentes@gmail.com'
  ]
  const conflictingUsers = await prisma.usuario.findMany({
    where: { correo: { in: seedEmails } },
    select: { id: true, correo: true }
  })
  for (const u of conflictingUsers) {
    if (!testUserIds.includes(u.id)) {
      testUserIds.push(u.id)
      testUserEmails.push(u.correo)
    }
  }

  const testClients = await prisma.cliente.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testClientIds = testClients.map(c => c.id)

  const testProviders = await prisma.proveedor.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testProviderIds = testProviders.map(p => p.id)

  const testProducts = await prisma.producto.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testProductIds = testProducts.map(p => p.id)

  const testCategories = await prisma.categoriaProducto.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testCategoryIds = testCategories.map(c => c.id)

  const testCitas = await prisma.cita.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testCitaIds = testCitas.map(c => c.id)

  const testAtenciones = await prisma.atencionPodologica.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testAtencionIds = testAtenciones.map(a => a.id)

  const testRecetas = await prisma.receta.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testRecetaIds = testRecetas.map(r => r.id)

  const testDevoluciones = await prisma.devolucionProveedor.findMany({ where: { esDatoPrueba: true }, select: { id: true } })
  const testDevolucionIds = testDevoluciones.map(d => d.id)

  console.log('🧹 Borrando registros de prueba previos...');
  
  if (testDevolucionIds.length > 0) {
    await prisma.devolucionProveedor.deleteMany({ where: { id: { in: testDevolucionIds } } })
  }
  if (testRecetaIds.length > 0) {
    await prisma.detalleReceta.deleteMany({ where: { idReceta: { in: testRecetaIds } } })
    await prisma.receta.deleteMany({ where: { id: { in: testRecetaIds } } })
  }
  if (testAtencionIds.length > 0) {
    await prisma.atencionPodologica.deleteMany({ where: { id: { in: testAtencionIds } } })
  }
  if (testCitaIds.length > 0) {
    await prisma.cita.deleteMany({ where: { id: { in: testCitaIds } } })
  }

  if (testProductIds.length > 0) {
    await prisma.detalleVentaLote.deleteMany({ where: { lote: { idProducto: { in: testProductIds } } } })
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

  if (testUserEmails.length > 0) {
    await prisma.$executeRawUnsafe(`
      DELETE FROM "Auditoria" 
      WHERE usuario IN (${testUserEmails.map(e => `'${e}'`).join(',')})
    `)
  }

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

  let doctorRol = await prisma.rol.findUnique({ where: { nombre: 'DOCTOR' } })
  if (!doctorRol) doctorRol = await prisma.rol.create({ data: { nombre: 'DOCTOR' } })

  const passwordHash = await bcrypt.hash('QA_password123!', 10)

  const rolesAsignados = [
    { nombreCompleto: 'Carlos Mendoza', correo: 'carlos.mendoza@gmail.com', passwordHash, idRol: adminRol.id, activo: true, esDatoPrueba: true },
    { nombreCompleto: 'Diana Castillo', correo: 'diana.castillo@gmail.com', passwordHash, idRol: empleadoRol.id, activo: true, esDatoPrueba: true },
    { nombreCompleto: 'Jorge Castro', correo: 'jorge.castro@gmail.com', passwordHash, idRol: empleadoRol.id, activo: true, esDatoPrueba: true },
    { nombreCompleto: 'Karla Méndez', correo: 'karla.mendez@gmail.com', passwordHash, idRol: doctorRol.id, activo: true, esDatoPrueba: true },
    { nombreCompleto: 'Luis Fuentes', correo: 'luis.fuentes@gmail.com', passwordHash, idRol: adminRol.id, activo: true, esDatoPrueba: true },
  ]

  const usersList: any[] = []
  for (const rData of rolesAsignados) {
    const user = await prisma.usuario.create({ data: rData })
    usersList.push(user)
  }
  const mainAdminUser = usersList.find(u => u.nombreCompleto === 'Carlos Mendoza')!
  const doctorUser = usersList.find(u => u.nombreCompleto === 'Karla Méndez')!
  console.log(`- 5 usuarios creados con éxito (ADMIN, CAJERO, DOCTOR/PODÓLOGO, etc.).`);

  // ==========================================================================
  // 2. CLIENTES (Nombres, Cédulas, Teléfonos y Direcciones Nicaragüenses Reales)
  // ==========================================================================
  console.log('👥 Creando clientes localizados en Nicaragua...');
  const clientsList: any[] = []

  const REAL_NAMES = [
    'Juan Carlos Pérez Ortiz', 'María Alejandra Gómez Brenes', 'Carlos Eduardo Mendoza Chaves', 'Diana Patricia Castillo Solano',
    'Eduardo José Vargas Vargas', 'Gabriela Sofía Flores Rojas', 'Hugo Alberto Ortiz Delgado', 'Isabel Cristina Ramírez Segura',
    'Jorge Luis Castro Salazar', 'Karla Valeria Méndez Romero', 'Luis Fernando Fuentes Vega', 'Mónica Beatriz Salazar Romero',
    'Néstor Raúl Delgado Alvarez', 'Olga Marina Romero Silva', 'Pedro Alfonso Álvarez Benítez', 'Patricia Elena Guzmán Peña',
    'Ricardo Augusto Silva Duarte', 'Silvia Carolina Duarte Cárdenas', 'Tomás Ignacio Benítez Reyes', 'Valeria Nicole Peña Miranda',
    'Walter Antonio Cárdenas Soto', 'Yolanda Margarita Reyes Villalobos', 'Adrián Francisco Soto Guerrero', 'Camila Valentina Miranda Vega',
    'Esteban Leonel Rojas Rivas', 'Fernanda Victoria Villalobos Marin', 'Gonzalo Mauricio Vega Aguilar', 'Irene Natalia Guerrero Quesada',
    'Mauricio Andrés Soto Cascante', 'Natalia Carolina Rivas Bolaños', 'Oscar Daniel Marín Brenes', 'Paola Andreína Barquero Solano',
    'Roberto Carlos Aguilar Zamora', 'Sofía Elena Quesada Araya', 'Víctor Manuel Cascante Campos', 'Andrés Felipe Chaves Brenes',
    'Elena Beatriz Bolaños Esquivel', 'Felipe Leonel Calderón Solano', 'Gloria Patricia Esquivel Brenes', 'Héctor Manuel Brenes Solano',
    'Julia Carolina Solano Brenes', 'Lorena María Segura Segura', 'Manuel Eduardo Zamora Zamora', 'Olga Patricia Araya Araya',
    'Pablo Alberto Campos Campos', 'Gabriela María Ortiz Rojas', 'Hugo Francisco Ramírez Castro', 'Isabel Elena Delgado Silva',
    'Jorge Alberto Silva Ortiz', 'Karla Beatriz Romero Silva'
  ]

  const DEPTOS = ['Managua', 'Masaya', 'Granada', 'León', 'Estelí', 'Matagalpa', 'Chinandega', 'Carazo', 'Rivas']

  // 30 clientes activos
  for (let i = 1; i <= 30; i++) {
    const realName = REAL_NAMES[i - 1]
    const depto = DEPTOS[i % DEPTOS.length]
    clientsList.push(await prisma.cliente.create({
      data: {
        nombreCompleto: realName,
        correo: generateRandomEmail(realName),
        telefono: generateRandomPhone(),
        cedula: generateRandomCedula(),
        direccion: `Bo. San Juan, del Parque Central 2c al este, ${depto}`,
        activo: true,
        esDatoPrueba: true
      }
    }))
  }

  // 5 clientes con datos mínimos
  for (let i = 1; i <= 5; i++) {
    const realName = REAL_NAMES[30 + i - 1]
    clientsList.push(await prisma.cliente.create({
      data: {
        nombreCompleto: realName,
        cedula: generateRandomCedula(),
        activo: true,
        esDatoPrueba: true
      }
    }))
  }

  // 5 clientes para pruebas de búsqueda
  const similares = [
    { nombre: 'Juan Pérez' },
    { nombre: 'Juan Pérez Gómez' },
    { nombre: 'Juan Carlos Pérez' },
    { nombre: 'Juana Pérez' },
    { nombre: 'Juan Pérez Ortiz' },
  ]
  for (const sim of similares) {
    clientsList.push(await prisma.cliente.create({
      data: {
        nombreCompleto: sim.nombre,
        correo: generateRandomEmail(sim.nombre),
        telefono: generateRandomPhone(),
        cedula: generateRandomCedula(),
        activo: true,
        esDatoPrueba: true
      }
    }))
  }

  // 3 clientes inactivos
  for (let i = 1; i <= 3; i++) {
    const realName = REAL_NAMES[35 + i - 1]
    const depto = DEPTOS[i % DEPTOS.length]
    clientsList.push(await prisma.cliente.create({
      data: {
        nombreCompleto: realName,
        correo: generateRandomEmail(realName),
        telefono: generateRandomPhone(),
        cedula: generateRandomCedula(),
        direccion: `Colonia Centroamérica, del Colegio Salvador Mendieta 1c al oeste, ${depto}`,
        activo: false,
        esDatoPrueba: true
      }
    }))
  }
  console.log(`- ${clientsList.length} clientes localizados creados.`);

  // ==========================================================================
  // 3. PROVEEDORES
  // ==========================================================================
  console.log('🏢 Creando laboratorios/proveedores de Nicaragua...');
  const providersList: any[] = []
  const provNames = [
    'Distribuidora Farmacéutica del Norte (DIFARNOSA)',
    'FarmaServicios de Nicaragua S.A.',
    'Laboratorios Medigen Centroamérica',
    'Corporación Medisalud Managua',
    'Insumos Médicos de Occidente',
    'Dermacare de Nicaragua S.A.',
    'NutriVital S.A. Managua',
    'Logística Sanitaria Express S.A.',
    'Procesos Médicos Alfa S.A.',
    'Alianza Farmacéutica Nicaragüense (ALIFARNIC)'
  ]
  for (let i = 0; i < provNames.length; i++) {
    const cleanName = provNames[i].split(' (')[0].toLowerCase().replace(/[^a-z0-9]/g, "")
    providersList.push(await prisma.proveedor.create({
      data: {
        nombre: provNames[i],
        telefono: `2222-90${i.toString().padStart(2, '0')}`,
        correo: `ventas@${cleanName}.com.ni`,
        direccion: `Km. 7.5 Carretera Norte, Complejo Industrial Bodegas Alfa #${i + 1}, Managua`,
        esDatoPrueba: true
      }
    }))
  }
  console.log(`- ${providersList.length} proveedores locales creados.`);

  // ==========================================================================
  // 4. CATEGORÍAS
  // ==========================================================================
  console.log('🏷️ Creando categorías...');
  const categoriesList: any[] = []
  const catNames = [
    'Analgésicos', 'Antibióticos', 'Vitaminas', 'Cuidado Personal', 'Higiene',
    'Material Médico', 'Servicios de Podología', 'Dermocosmética', 'Primeros Auxilios', 'Suplementos'
  ]
  for (const name of catNames) {
    let cat = await prisma.categoriaProducto.findUnique({ where: { nombre: name } })
    if (!cat) {
      cat = await prisma.categoriaProducto.create({
        data: {
          nombre: name,
          descripcion: `Categoría clínica para ${name}`,
          esDatoPrueba: true
        }
      })
    } else {
      cat = await prisma.categoriaProducto.update({
        where: { id: cat.id },
        data: { esDatoPrueba: true }
      })
    }
    categoriesList.push(cat)
  }
  console.log(`- ${categoriesList.length} categorías creadas/validadas.`);

  // ==========================================================================
  // 5. PRODUCTOS Y SERVICIOS CLÍNICOS
  // ==========================================================================
  console.log('📦 Creando catálogo de productos y servicios clínicos...');
  const productsList: any[] = []

  // ANALGÉSICOS
  const normalProds = [
    'Acetaminofén 500mg Calox (Paracetamol_1)',
    'Panadol Ultra 500mg/65mg (Paracetamol_2)',
    'Novalcina 500mg Sanofi (Paracetamol_3)',
    'Aspirina 500mg Bayer (Paracetamol_4)',
    'Ibuprofeno 400mg MK (Paracetamol_5)',
    'Naproxeno 250mg Genfar (Paracetamol_6)',
    'Diclofenaco Sódico 50mg (Paracetamol_7)',
    'Meloxicam 15mg Calox (Paracetamol_8)',
    'Celebrex 200mg Pfizer (Paracetamol_9)',
    'Voltaren Emulgel 50g (Paracetamol_10)',
    'Buscapina Compositum (Paracetamol_11)',
    'Dolo-Neurobion Inyectable (Paracetamol_12)',
    'Dorival 200mg Liqui-Gels (Paracetamol_13)',
    'Flanax 275mg Bayer (Paracetamol_14)',
    'Winadeine F Tabletas (Paracetamol_15)',
    'Tramadol 50mg Caps MK (Paracetamol_16)',
    'Dolgex 500mg Gelcaps (Paracetamol_17)',
    'Piroxicam 20mg Genfar (Paracetamol_18)',
    'Ketoprofeno 100mg Calox (Paracetamol_19)',
    'Ketorolaco 10mg MK (Paracetamol_20)',
    'Ponstan 500mg Pfizer (Paracetamol_21)',
    'Dual Acetaminofén Cafeína (Paracetamol_22)',
    'Panadol Bebé Gotas (Paracetamol_23)',
    'Tempra Jarabe Infantil (Paracetamol_24)',
    'Tafirol 1g Tabletas (Paracetamol_25)',
    'Acetaminofén 120mg/5ml (Paracetamol_26)',
    'Acetaminofén MK 500mg (Paracetamol_27)',
    'Panadol Niños Jarabe (Paracetamol_28)',
    'Advil Max 400mg Liqui-Gels (Paracetamol_29)',
    'Advil Niños Suspensión (Paracetamol_30)',
    'Naproxeno Sódico 550mg (Paracetamol_31)',
    'Diclofenaco Potásico 50mg (Paracetamol_32)',
    'Voltaren 75mg Ampollas (Paracetamol_33)',
    'Enantyum 25mg Tabletas (Paracetamol_34)',
    'Dexketoprofeno 25mg Genfar (Paracetamol_35)',
    'Aspirina Masticable 100mg (Paracetamol_36)',
    'Alka-Seltzer Efervescente (Paracetamol_37)',
    'Sal de Andrews Polvo (Paracetamol_38)',
    'Dolofin 500mg Tabletas (Paracetamol_39)',
    'Dolex Forte Tabletas (Paracetamol_40)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740112${i.toString().padStart(6, '0')}`,
    min: 10,
    precioV: 15.00,
    precioC: 10.00,
    catIndex: 0,
    esServicio: false
  }))

  // ANTIBIÓTICOS
  const lowStockProds = [
    'Amoxicilina 500mg Genfar (Amoxicilina_1)',
    'Amoxil Suspensión 250mg (Amoxicilina_2)',
    'Trifamox IBL 750mg (Amoxicilina_3)',
    'Clamicil Amoxicilina Clavulánico (Amoxicilina_4)',
    'Augmentin 875mg/125mg (Amoxicilina_5)',
    'Cefalexina 500mg MK (Amoxicilina_6)',
    'Ciprofloxacina 500mg Calox (Amoxicilina_7)',
    'Azitromicina 500mg Genfar (Amoxicilina_8)',
    'Klaricid Claritromicina 500mg (Amoxicilina_9)',
    'Eritromicina 500mg MK (Amoxicilina_10)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740212${i.toString().padStart(6, '0')}`,
    min: 20,
    precioV: 35.00,
    precioC: 22.00,
    catIndex: 1,
    esServicio: false
  }))

  // VITAMINAS
  const zeroStockProds = [
    'Redoxon Vitamina C Efervescente (Vitamina_C_1)',
    'Cebión Gotas Infantiles (Vitamina_C_2)',
    'Cebión Tabletas Masticables (Vitamina_C_3)',
    'Vitamina C Genfar 500mg (Vitamina_C_4)',
    'Cevión Solución Oral (Vitamina_C_5)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740312${i.toString().padStart(6, '0')}`,
    min: 5,
    precioV: 8.00,
    precioC: 5.00,
    catIndex: 2,
    esServicio: false
  }))

  // PRÓXIMOS A VENCER
  const expiringProds = [
    'Jarabe para la Tos Histiacil (Jarabe_Tos_1)',
    'Tukol Jarabe Expectorante (Jarabe_Tos_2)',
    'Abrilar Jarabe Natural (Jarabe_Tos_3)',
    'Mucosolvan Jarabe Adulto (Jarabe_Tos_4)',
    'Broxol Jarabe Pediátrico (Jarabe_Tos_5)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740412${i.toString().padStart(6, '0')}`,
    min: 8,
    precioV: 24.00,
    precioC: 16.00,
    catIndex: 0,
    esServicio: false
  }))

  // VENCIDOS
  const expiredProds = [
    'Clotrimazol Crema Tópica 1% (Crema_Tópica_1)',
    'Hidrocortisona Crema MK 1% (Crema_Tópica_2)',
    'Quadriderm Crema Dérmica (Crema_Tópica_3)',
    'Barmicil Crema Tópica (Crema_Tópica_4)',
    'Baycuten Crema Dérmica (Crema_Tópica_5)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740512${i.toString().padStart(6, '0')}`,
    min: 5,
    precioV: 40.00,
    precioC: 28.00,
    catIndex: 7,
    esServicio: false
  }))

  // MATERIALES Y INSUMOS MÉDICOS (Múltiples Lotes)
  const multiBatchProds = [
    'Gasas Estériles Curativas 3x3 (Gasas_Estériles_1)',
    'Gasas Quirúrgicas Estériles 4x4 (Gasas_Estériles_2)',
    'Compresas de Gasa Estéril (Gasas_Estériles_3)',
    'Vendas Elásticas 3 Pulgadas (Gasas_Estériles_4)',
    'Esparadrapo Micropore 1 Pulgada (Gasas_Estériles_5)',
    'Curitas Adhesivas Band-Aid (Gasas_Estériles_6)',
    'Algodón Planchado 100g (Gasas_Estériles_7)',
    'Guantes de Látex Estériles (Gasas_Estériles_8)',
    'Mascarillas Quirúrgicas 3 Capas (Gasas_Estériles_9)',
    'Jeringas Descartables 5ml (Gasas_Estériles_10)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740612${i.toString().padStart(6, '0')}`,
    min: 15,
    precioV: 12.00,
    precioC: 7.00,
    catIndex: 5,
    esServicio: false
  }))

  // HIGIENE
  const concurrencyProds = [
    'Alcohol Glicerinado 70% (Alcohol_Glicerinado_1)',
    'Gel Antiséptico Glicerinado (Alcohol_Glicerinado_2)',
    'Jabón Líquido Antibacterial (Alcohol_Glicerinado_3)',
    'Toallitas Húmedas Desinfectantes (Alcohol_Glicerinado_4)',
    'Sanitizante de Manos Spray (Alcohol_Glicerinado_5)'
  ].map((fullName, i) => ({
    nombre: fullName,
    bar: `740712${i.toString().padStart(6, '0')}`,
    min: 10,
    precioV: 18.00,
    precioC: 12.00,
    catIndex: 4,
    esServicio: false
  }))

  // SERVICIOS CLÍNICOS DE PODOLOGÍA (Virtuales, esServicio: true)
  const clinicalServices = [
    { nombre: 'Servicio de Quiropodia General', bar: 'SRV-001', min: 0, precioV: 350.00, precioC: 0.00, catIndex: 6, esServicio: true },
    { nombre: 'Tratamiento de Onicomicosis Láser', bar: 'SRV-002', min: 0, precioV: 800.00, precioC: 0.00, catIndex: 6, esServicio: true },
    { nombre: 'Tratamiento Quirúrgico de Uña Encarnada', bar: 'SRV-003', min: 0, precioV: 500.00, precioC: 0.00, catIndex: 6, esServicio: true },
    { nombre: 'Evaluación Podológica Preventiva', bar: 'SRV-004', min: 0, precioV: 200.00, precioC: 0.00, catIndex: 6, esServicio: true },
    { nombre: 'Servicio de Reconstrucción Ungueal', bar: 'SRV-005', min: 0, precioV: 400.00, precioC: 0.00, catIndex: 6, esServicio: true }
  ]

  const allProductDefs = [
    ...normalProds,
    ...lowStockProds,
    ...zeroStockProds,
    ...expiringProds,
    ...expiredProds,
    ...multiBatchProds,
    ...concurrencyProds,
    ...clinicalServices
  ]

  for (const pDef of allProductDefs) {
    let prod = await prisma.producto.findUnique({
      where: { nombre: pDef.nombre }
    })
    if (!prod) {
      prod = await prisma.producto.create({
        data: {
          nombre: pDef.nombre,
          codigoBarras: pDef.bar,
          descripcion: `Producto o servicio de prueba: ${pDef.nombre}`,
          idCategoria: categoriesList[pDef.catIndex].id,
          precioCompra: pDef.precioC,
          precioVenta: pDef.precioV,
          precioBlister: pDef.esServicio ? null : pDef.precioV * 0.12,
          precioCaja: pDef.esServicio ? null : pDef.precioV * 10,
          unidadesPorBlister: pDef.esServicio ? null : 10,
          unidadesPorCaja: pDef.esServicio ? null : 100,
          stockActual: 0,
          stockMinimo: pDef.min,
          activo: true,
          laboratorio: pDef.esServicio ? null : 'Calox de Nicaragua',
          concentracion: pDef.esServicio ? null : '500 mg',
          unidadMedida: pDef.esServicio ? 'servicio' : 'unidad',
          esServicio: pDef.esServicio,
          esDatoPrueba: true
        }
      })
    } else {
      prod = await prisma.producto.update({
        where: { id: prod.id },
        data: { esDatoPrueba: true, esServicio: pDef.esServicio }
      })
    }
    productsList.push(prod)

    if (!pDef.esServicio) {
      await prisma.proveedorProducto.create({
        data: {
          idProveedor: providersList[Math.floor(Math.random() * providersList.length)].id,
          idProducto: prod.id,
          precioCompra: pDef.precioC
        }
      })
    }
  }
  console.log(`- ${productsList.length} productos/servicios creados/validados.`);

  // ==========================================================================
  // 6. SIMULACIÓN DE COMPRAS
  // ==========================================================================
  console.log('🛒 Simulando 15 compras para inventario y lotes...');
  const purchasesList: any[] = []

  const normalStockProducts = productsList.filter(p => p.nombre.includes('Paracetamol_'))
  const lowStockProducts = productsList.filter(p => p.nombre.includes('Amoxicilina_'))
  const expiringStockProducts = productsList.filter(p => p.nombre.includes('Jarabe_Tos_'))
  const expiredStockProducts = productsList.filter(p => p.nombre.includes('Crema_Tópica_'))
  const multiBatchProducts = productsList.filter(p => p.nombre.includes('Gasas_Estériles_'))
  const concurrencyStockProducts = productsList.filter(p => p.nombre.includes('Alcohol_Glicerinado_'))

  const purchasePlans: any[] = []

  for (let i = 0; i < 10; i++) {
    const items: any[] = []
    for (let j = 0; j < 4; j++) {
      const prod = normalStockProducts[i * 4 + j]
      items.push({ idProducto: prod.id, cantidad: 50, costo: Number(prod.precioCompra), lote: `LOTE-2026-NORM-${i}-${j}`, diasVence: 365 })
    }
    const lowProd = lowStockProducts[i]
    items.push({ idProducto: lowProd.id, cantidad: 5, costo: Number(lowProd.precioCompra), lote: `LOTE-2026-LOW-${i}`, diasVence: 200 })

    const multiProd = multiBatchProducts[i]
    items.push({ idProducto: multiProd.id, cantidad: 20, costo: Number(multiProd.precioCompra), lote: `LOTE-2026-MULT-A-${i}`, diasVence: 60 })

    purchasePlans.push({ providerIndex: i % 10, items })
  }

  // Próximos a vencer
  const itemsC11 = expiringStockProducts.map((p, idx) => ({
    idProducto: p.id,
    cantidad: 20,
    costo: Number(p.precioCompra),
    lote: `LOTE-2026-EXP-${idx}`,
    diasVence: 15
  }))
  purchasePlans.push({ providerIndex: 0, items: itemsC11 })

  // Vencidos
  const itemsC12 = expiredStockProducts.map((p, idx) => ({
    idProducto: p.id,
    cantidad: 15,
    costo: Number(p.precioCompra),
    lote: `LOTE-2026-EXPD-${idx}`,
    diasVence: -10
  }))
  purchasePlans.push({ providerIndex: 1, items: itemsC12 })

  // Concurrencia
  const itemsC13 = concurrencyStockProducts.map((p, idx) => ({
    idProducto: p.id,
    cantidad: 100,
    costo: Number(p.precioCompra),
    lote: `LOTE-2026-CONC-${idx}`,
    diasVence: 180
  }))
  purchasePlans.push({ providerIndex: 2, items: itemsC13 })

  // Multi-lotes (Lote B)
  const itemsC14: any[] = []
  const itemsC15: any[] = []
  for (let i = 0; i < 5; i++) {
    const p1 = multiBatchProducts[i]
    const p2 = multiBatchProducts[i + 5]
    itemsC14.push({ idProducto: p1.id, cantidad: 30, costo: Number(p1.precioCompra), lote: `LOTE-2026-MULT-B-${i}`, diasVence: 200 })
    itemsC15.push({ idProducto: p2.id, cantidad: 30, costo: Number(p2.precioCompra), lote: `LOTE-2026-MULT-B-${i + 5}`, diasVence: 200 })
  }
  purchasePlans.push({ providerIndex: 3, items: itemsC14 })
  purchasePlans.push({ providerIndex: 4, items: itemsC15 })

  let compCount = 1
  for (const plan of purchasePlans) {
    const prov = providersList[plan.providerIndex]
    const totalCompra = plan.items.reduce((acc: number, item: any) => acc + (item.cantidad * item.costo), 0)

    const compra = await prisma.compra.create({
      data: {
        fecha: new Date(Date.now() - (15 - compCount) * 24 * 60 * 60 * 1000),
        fechaCompra: new Date(Date.now() - (15 - compCount) * 24 * 60 * 60 * 1000),
        numeroFactura: `FAC-${20260000 + compCount}`,
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

    for (const det of compra.detalles) {
      const planItem = plan.items.find((item: any) => item.idProducto === det.idProducto)!
      const fechaVenc = new Date(Date.now() + planItem.diasVence * 24 * 60 * 60 * 1000)

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

      const prodObj = productsList.find(p => p.id === det.idProducto)!
      const stockAnterior = prodObj.stockActual
      const nuevoStock = stockAnterior + det.cantidad
      prodObj.stockActual = nuevoStock

      await prisma.producto.update({
        where: { id: det.idProducto },
        data: {
          stockActual: nuevoStock,
          precioCompra: det.precioUnitario
        }
      })

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
  console.log(`- 15 compras registradas y procesadas.`);

  // ==========================================================================
  // 7. SIMULACIÓN DE CITAS, ATENCIONES (SOAP) Y RECETAS CLÍNICAS
  // ==========================================================================
  console.log('🩺 Simulando atenciones y expedientes clínicos (SOAP)...');
  
  const cita1 = await prisma.cita.create({
    data: {
      idCliente: clientsList[0].id,
      fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      motivo: 'Dolor y enrojecimiento en el primer artejo del pie derecho.',
      estado: 'COMPLETADA',
      esDatoPrueba: true
    }
  })

  const cita2 = await prisma.cita.create({
    data: {
      idCliente: clientsList[1].id,
      fecha: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
      motivo: 'Control post-operatorio de espiculotomía.',
      estado: 'PENDIENTE',
      esDatoPrueba: true
    }
  })

  const cita3 = await prisma.cita.create({
    data: {
      idCliente: clientsList[2].id,
      fecha: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      motivo: 'Valoración inicial por pie diabético.',
      estado: 'CANCELADA',
      esDatoPrueba: true
    }
  })

  const atencion1 = await prisma.atencionPodologica.create({
    data: {
      idCita: cita1.id,
      idCliente: clientsList[0].id,
      idUsuario: doctorUser.id,
      fecha: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      subjetivo: 'Paciente refiere dolor punzante en primer artejo del pie derecho de 4 días de evolución. Manifiesta autofacilitación ungueal inadecuada.',
      objetivo: 'Inspección visual revela eritema severo, edema localizado y presencia de espícula ungueal penetrando el surco periungueal lateral externo. Presencia de tejido de granulación leve.',
      analisis: 'Onicocriptosis (uña encarnada) bilateral en primer artejo derecho grado 2, con proceso infeccioso activo secundario.',
      plan: 'Se realiza onicocriptotomía (retiro de espícula) bajo técnica aséptica. Lavado con antiséptico y colocación de vendaje oclusivo. Se emite receta médica.',
      esDatoPrueba: true
    }
  })

  const clotrimazol = productsList.find(p => p.nombre.includes('Clotrimazol'))!
  const quiropodia = productsList.find(p => p.nombre.includes('Quiropodia'))!
  
  const receta1 = await prisma.receta.create({
    data: {
      codigoReceta: 'RECETA-20260623-4512',
      idAtencion: atencion1.id,
      idCliente: clientsList[0].id,
      idUsuario: doctorUser.id,
      estado: 'EMITIDA',
      fechaVencimiento: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      observaciones: 'Lavar la zona afectada dos veces al día y secar muy bien antes de aplicar la crema tópica.',
      esDatoPrueba: true,
      detalles: {
        create: [
          {
            idProducto: clotrimazol.id,
            cantidad: 1,
            indicaciones: 'Aplicar una fina capa sobre la zona afectada cada 12 horas por 10 días.'
          },
          {
            idProducto: quiropodia.id,
            cantidad: 1,
            indicaciones: 'Servicio de control clínico en 15 días.'
          }
        ]
      }
    }
  })

  console.log(`- 3 citas, 1 SOAP y 1 receta emitidos.`);

  // ==========================================================================
  // 8. SIMULACIÓN DE VENTAS (40 ventas)
  // ==========================================================================
  console.log('💵 Simular 40 facturas de venta...');
  let ventaCount = 1

  for (let i = 0; i < 40; i++) {
    const userV = usersList[i % 5]
    const cliente = i % 5 === 0 ? null : clientsList[i % clientsList.length]
    const metodoPago = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA'][i % 3]

    const prodNormal = normalStockProducts[i % normalStockProducts.length]
    const prodMulti = multiBatchProducts[i % multiBatchProducts.length]
    const serviceNode = i % 8 === 0 ? quiropodia : null

    const itemsVender = [
      { idProducto: prodNormal.id, cantidad: 2, tipoUnidad: 'UNIDAD', esServicio: false },
      { idProducto: prodMulti.id, cantidad: 3, tipoUnidad: 'UNIDAD', esServicio: false }
    ]
    if (serviceNode) {
      itemsVender.push({ idProducto: serviceNode.id, cantidad: 1, tipoUnidad: 'UNIDAD', esServicio: true })
    }

    let facturar = true
    for (const item of itemsVender) {
      if (item.esServicio) continue
      const prod = productsList.find(p => p.id === item.idProducto)!
      if (prod.stockActual < item.cantidad) {
        facturar = false
      }
    }

    if (!facturar) continue

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
        tipoUnidad: item.tipoUnidad,
        esServicio: item.esServicio
      })
    }

    const venta = await prisma.venta.create({
      data: {
        fecha: new Date(Date.now() - (10 - Math.floor(i / 4)) * 24 * 60 * 60 * 1000),
        idCliente: cliente ? cliente.id : null,
        total: totalVenta,
        metodoPago,
        idUsuario: userV.id,
        tipoComprobante: i % 10 === 0 ? 'FACTURA' : 'RECIBO',
        estado: i === 39 ? 'ANULADA' : 'COMPLETADA',
        montoRecibido: totalVenta + 20,
        cambio: 20
      },
      include: { detalles: true }
    })

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

      if (det.esServicio) {
        await prisma.movimientoInventario.create({
          data: {
            idProducto: det.idProducto,
            tipo: 'SALIDA_VENTA',
            cantidad: det.cantidad,
            stockResultante: 0,
            referencia: `Venta #${venta.id}`,
            idUsuario: userV.id,
            observacion: `Cobro de servicio clínico: ${det.idProducto === quiropodia.id ? quiropodia.nombre : 'Servicio'}`
          }
        })
        continue
      }

      const prodObj = productsList.find(p => p.id === det.idProducto)!
      if (venta.estado === 'COMPLETADA') {
        let pendiente = det.cantidad

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

          await prisma.lote.update({
            where: { id: lote.id },
            data: {
              stockActual: nuevoLoteStock,
              activo: nuevoLoteStock > 0
            }
          })

          await prisma.detalleVentaLote.create({
            data: {
              idDetalleVenta: dv.id,
              idLote: lote.id,
              cantidad: deducir
            }
          })

          await prisma.movimientoInventario.create({
            data: {
              idProducto: det.idProducto,
              idLote: lote.id,
              tipo: 'SALIDA_VENTA',
              cantidad: deducir,
              stockResultante: prodObj.stockActual - deducir,
              costoUnitario: lote.costoCompra,
              referencia: `Venta #${venta.id}`,
              idUsuario: userV.id,
              observacion: `Salida de venta. Lote ${lote.codigoLote}.`
            }
          })

          prodObj.stockActual -= deducir
          pendiente -= deducir
        }

        await prisma.producto.update({
          where: { id: det.idProducto },
          data: { stockActual: prodObj.stockActual }
        })
      } else if (venta.estado === 'ANULADA') {
        await prisma.movimientoInventario.create({
          data: {
            idProducto: det.idProducto,
            tipo: 'DEVOLUCION',
            cantidad: det.cantidad,
            stockResultante: prodObj.stockActual,
            referencia: `Venta #${venta.id} Anulada`,
            idUsuario: userV.id,
            observacion: `Venta anulada. Sin cambios en el inventario físico.`
          }
        })
      }
    }
    ventaCount++
  }
  console.log(`- 40 ventas simuladas.`);

  // ==========================================================================
  // 9. AUDITORÍA ADICIONAL
  // ==========================================================================
  console.log('📝 Generando logs de auditoría...');
  const auditLogs = [
    { accion: 'CREAR_USUARIO', entidad: 'Usuario', entidadId: mainAdminUser.id, detalles: 'Usuario Carlos Mendoza creado por seed' },
    { accion: 'CREAR_CLIENTE', entidad: 'Cliente', entidadId: clientsList[0].id, detalles: 'Primer cliente de prueba nicaragüense creado por seed' },
    { accion: 'CREAR_PROVEEDOR', entidad: 'Proveedor', entidadId: providersList[0].id, detalles: 'Proveedor inicial local creado por seed' },
    { accion: 'AJUSTE_INVENTARIO', entidad: 'Producto', entidadId: productsList[0].id, detalles: 'Ajuste inicial de catálogo cargado en base de datos' },
    { accion: 'INICIO_SESION', entidad: 'Usuario', entidadId: mainAdminUser.id, detalles: 'Ingreso al sistema por Carlos Mendoza desde IP 127.0.0.1' },
    { accion: 'EMISION_RECETA', entidad: 'Receta', entidadId: receta1.id, detalles: `Receta ${receta1.codigoReceta} emitida por podólogo` },
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
