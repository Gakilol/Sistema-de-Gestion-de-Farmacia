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

  console.log("🎉 Seed completado exitosamente!")
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
