import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed de base de datos de producción/limpia...")

  // Crear roles
  const rolAdmin = await prisma.rol.upsert({
    where: { nombre: "ADMIN" },
    update: {},
    create: { nombre: "ADMIN" },
  })

  const rolEmpleado = await prisma.rol.upsert({
    where: { nombre: "EMPLEADO" },
    update: {},
    create: { nombre: "EMPLEADO" },
  })

  const rolDoctor = await prisma.rol.upsert({
    where: { nombre: "DOCTOR" },
    update: {},
    create: { nombre: "DOCTOR" },
  })

  console.log("✅ Roles creados:", rolAdmin.nombre, rolEmpleado.nombre, rolDoctor.nombre)

  // Crear usuario admin
  const passwordHash = await bcrypt.hash("password123", 10)

  const adminUser = await prisma.usuario.upsert({
    where: { correo: "admin@farmacia.com" },
    update: {},
    create: {
      nombreCompleto: "Administrador Sistema",
      correo: "admin@farmacia.com",
      passwordHash,
      idRol: rolAdmin.id,
      activo: true,
    },
  })

  console.log("✅ Usuario admin creado:", adminUser.correo)

  // Crear usuario doctor
  const doctorUser = await prisma.usuario.upsert({
    where: { correo: "doctor@farmacia.com" },
    update: {},
    create: {
      nombreCompleto: "Doctor Clínica",
      correo: "doctor@farmacia.com",
      passwordHash,
      idRol: rolDoctor.id,
      activo: true,
    },
  })

  console.log("✅ Usuario doctor creado:", doctorUser.correo)
  // Seeding FormaFarmaceutica
  const formas = [
    { nombre: "Tabletas", descripcion: "Forma sólida dosificada de liberación convencional o modificada", orden: 1 },
    { nombre: "Cápsulas", descripcion: "Cuerpo cilíndrico formado por dos mitades que se acoplan", orden: 2 },
    { nombre: "Comprimidos", descripcion: "Obtenidos por compresión de mezclas de polvos", orden: 3 },
    { nombre: "Óvulos y supositorios", descripcion: "Preparaciones sólidas destinadas a cavidad vaginal o rectal", orden: 4 },
    { nombre: "Polvos para reconstruir", descripcion: "Mezcla de polvos secos para disolver en agua", orden: 5 },
    { nombre: "Jarabes", descripcion: "Solución acuosa con alta concentración de azúcares", orden: 6 },
    { nombre: "Suspensiones", descripcion: "Sólidos insolubles suspendidos en un medio líquido", orden: 7 },
    { nombre: "Gotas", descripcion: "Soluciones destinadas a administración oftálmica, ótica, oral, etc.", orden: 8 },
    { nombre: "Cremas", descripcion: "Preparación semisólida bifásica de emulsión agua en aceite o aceite en agua", orden: 9 },
    { nombre: "Ungüentos y pomadas", descripcion: "Base oleosa semisólida de una sola fase", orden: 10 },
    { nombre: "Inhaladores de dosis medida", descripcion: "Dispositivos para inhalación de aerosol dosificado", orden: 11 },
    { nombre: "Soluciones para nebulizar", descripcion: "Líquidos para conversión en aerosol fino", orden: 12 },
    { nombre: "Soluciones", descripcion: "Preparaciones líquidas homogéneas", orden: 13 },
    { nombre: "Ampollas", descripcion: "Inyectables de dosis única", orden: 14 },
    { nombre: "Frascos", descripcion: "Envases de vidrio o plástico para múltiples dosis", orden: 15 },
    { nombre: "Sobres", descripcion: "Dosis individuales de polvo o granulados", orden: 16 },
    { nombre: "Aerosoles", descripcion: "Gases licuados o comprimidos que dispersan principios activos", orden: 17 },
    { nombre: "Gel", descripcion: "Semisólido que se licúa al frotar con la piel", orden: 18 },
    { nombre: "Shampoo medicado", descripcion: "Preparación líquida espumante para el cuero cabelludo", orden: 19 },
    { nombre: "Otra presentación", descripcion: "Presentación no convencional (requiere especificar texto)", orden: 20 },
  ];

  console.log("🌱 Creando formas farmacéuticas...");
  for (const forma of formas) {
    await prisma.formaFarmaceutica.upsert({
      where: { nombre: forma.nombre },
      update: { descripcion: forma.descripcion, orden: forma.orden, activo: true },
      create: { nombre: forma.nombre, descripcion: forma.descripcion, orden: forma.orden, activo: true },
    });
  }
  console.log("✅ Formas farmacéuticas sembradas.");

  // Seeding ServicioPodologia
  const servicios = [
    { nombre: "Quiropodia Básica", descripcion: "Corte y limado de uñas, remoción de durezas y callosidades.", precio: 350.00, duracion: 45, observaciones: "Servicio clínico general preventivo" },
    { nombre: "Quiropodia Clínica Avanzada", descripcion: "Tratamiento profundo de hiperqueratosis, helomas y uñas gruesas.", precio: 500.00, duracion: 60, observaciones: "Recomendado para pacientes de tercera edad o con patologías severas" },
    { nombre: "Tratamiento de Uña Encarnada", descripcion: "Tratamiento local de la onicocriptosis con espiculotomía y curación.", precio: 400.00, duracion: 30, observaciones: "Tratamiento agudo de dolor" },
    { nombre: "Reconstrucción Ungueal Estética", descripcion: "Restauración de lámina ungueal dañada con acrílico terapéutico o gel especializado.", precio: 450.00, duracion: 40, observaciones: "Tratamiento estético y protector" },
    { nombre: "Tratamiento de Micosis Ungueal", descripcion: "Limpieza mecánica profunda y fresado de la uña con hongos para favorecer absorción de medicamentos.", precio: 380.00, duracion: 30, observaciones: "Sesión clínica de onicomicosis" },
    { nombre: "Remoción de Verruga Plantar", descripcion: "Tratamiento físico/químico para la eliminación de papilomas plantares.", precio: 300.00, duracion: 20, observaciones: "Requiere seguimiento semanal" },
    { nombre: "Perfil y Estudio de la Pisada", descripcion: "Evaluación biomecánica computarizada y visual de la pisada para diagnóstico de plantillas.", precio: 600.00, duracion: 45, observaciones: "Recomendado para deportistas o dolor crónico" },
    { nombre: "Tratamiento de Pie Diabético Preventivo", descripcion: "Corte de uñas ultra seguro, remoción suave de durezas, evaluación de sensibilidad con monofilamento y diapasón.", precio: 420.00, duracion: 50, observaciones: "Protocolo especializado de seguridad e higiene" },
    { nombre: "Masaje Podal Relajante y Circulatorio", descripcion: "Masaje terapéutico relajante con loción estimulante de la circulación e hidratación profunda.", precio: 250.00, duracion: 30, observaciones: "Servicio complementario relajante" },
    { nombre: "Ortesis de Silicona Personalizada", descripcion: "Diseño y confección de dispositivos de silicona blanda a la medida para corregir desviaciones digitales.", precio: 450.00, duracion: 30, observaciones: "No incluye citas de control subsiguientes" },
  ];

  console.log("🌱 Creando servicios de podología...");
  for (const servicio of servicios) {
    await prisma.servicioPodologia.upsert({
      where: { nombre: servicio.nombre },
      update: {
        descripcion: servicio.descripcion,
        precio: servicio.precio,
        duracion: servicio.duracion,
        observaciones: servicio.observaciones,
        activo: true
      },
      create: {
        nombre: servicio.nombre,
        descripcion: servicio.descripcion,
        precio: servicio.precio,
        duracion: servicio.duracion,
        observaciones: servicio.observaciones,
        activo: true
      },
    });
  }
  console.log("✅ Servicios de podología sembrados.");

  console.log("🎉 Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
