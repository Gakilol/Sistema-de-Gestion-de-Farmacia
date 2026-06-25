const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const diagnosticos = [
    { nombre: 'Onicomicosis', codigo: 'B35.1', descripcion: 'Infección fúngica de las uñas' },
    { nombre: 'Pie diabético', codigo: 'E11.52', descripcion: 'Complicación podológica de la diabetes mellitus tipo 2' },
    { nombre: 'Hallux Valgus', codigo: 'M20.1', descripcion: 'Juanete - desviación del dedo gordo del pie' },
    { nombre: 'Heloma duro', codigo: 'L84', descripcion: 'Callo o clavos en el pie' },
    { nombre: 'Verruca plantar', codigo: 'B07.0', descripcion: 'Verruga plantar causada por VPH' },
    { nombre: 'Pie plano', codigo: 'M21.4', descripcion: 'Pie plano adquirido' },
    { nombre: 'Fascitis plantar', codigo: 'M72.2', descripcion: 'Inflamación de la fascia plantar' },
    { nombre: 'Hiperhidrosis plantar', codigo: 'L74.510', descripcion: 'Sudoración excesiva en la planta del pie' },
    { nombre: 'Uña encarnada', codigo: 'L60.0', descripcion: 'Onicocriptosis - uña incrustada en el tejido' },
    { nombre: 'Dermatitis por contacto', codigo: 'L25.9', descripcion: 'Irritación cutánea de los pies' },
  ];

  const tratamientos = [
    { nombre: 'Fresado de onicomicosis', descripcion: 'Tratamiento mecánico de hongos en uñas con fresadora podológica' },
    { nombre: 'Quiropodia completa', descripcion: 'Tratamiento integral de los pies: callos, durezas, uñas' },
    { nombre: 'Infiltración local', descripcion: 'Aplicación de anestésico o medicamento local en el pie' },
    { nombre: 'Vendaje funcional', descripcion: 'Vendaje corrector o protector del pie' },
    { nombre: 'Crioterapia verruga', descripcion: 'Congelación de verrugas plantares con nitrógeno líquido' },
    { nombre: 'Resección uña encarnada', descripcion: 'Cirugía menor para corrección de onicocriptosis' },
    { nombre: 'Plantilla ortopédica', descripcion: 'Fabricación o adaptación de plantilla podológica personalizada' },
    { nombre: 'Cuidado pie diabético', descripcion: 'Protocolo completo de atención y prevención para pie diabético' },
    { nombre: 'Aplicación antifúngico', descripcion: 'Tratamiento tópico o sistémico contra hongos en pies/uñas' },
    { nombre: 'Electrocirugía', descripcion: 'Tratamiento eléctrico de verrugas y tejidos anómalos' },
  ];

  for (const d of diagnosticos) {
    await prisma.diagnostico.upsert({ where: { nombre: d.nombre }, update: {}, create: d });
  }
  console.log('Diagnosticos insertados:', diagnosticos.length);

  for (const t of tratamientos) {
    await prisma.tratamiento.upsert({ where: { nombre: t.nombre }, update: {}, create: t });
  }
  console.log('Tratamientos insertados:', tratamientos.length);
  console.log('Seed clínico completado exitosamente.');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error('Error en seed clínico:', e);
    prisma.$disconnect();
    process.exit(1);
  });
