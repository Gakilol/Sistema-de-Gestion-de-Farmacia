import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Iniciando seed de base de datos...")

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

  console.log("✅ Roles creados:", rolAdmin, rolEmpleado)

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

  console.log("✅ Usuario admin creado:", adminUser)

  // Crear categorías de productos
  const categorias = [
    { nombre: "Medicamentos", descripcion: "Medicamentos recetados" },
    {
      nombre: "Plantillas Ortopédicas",
      descripcion: "Plantillas personalizadas",
    },
    { nombre: "Cremas y Ungüentos", descripcion: "Cremas tópicas" },
    { nombre: "Vendajes", descripcion: "Vendajes y apósitos" },
    { nombre: "Otros", descripcion: "Otros productos" },
  ]

  for (const cat of categorias) {
    await prisma.categoriaProducto.upsert({
      where: { nombre: cat.nombre },
      update: {},
      create: cat,
    })
  }

  console.log("✅ Categorías creadas")

  // Crear proveedor de ejemplo
  const proveedor = await prisma.proveedor.upsert({
    where: { nombre: "Proveedor General" },
    update: {},
    create: {
      nombre: "Proveedor General",
      telefono: "+34-900-000-000",
      correo: "contacto@proveedor.com",
      direccion: "Calle Principal 123",
    },
  })

  console.log("✅ Proveedor creado")

  // Crear productos de ejemplo
  const catMedicamentos = await prisma.categoriaProducto.findFirst({
    where: { nombre: "Medicamentos" },
  })

  if (catMedicamentos) {
    await prisma.producto.upsert({
      where: { nombre: "Ibuprofeno 400mg" },
      update: {},
      create: {
        nombre: "Ibuprofeno 400mg",
        descripcion: "Caja de 20 tabletas",
        idCategoria: catMedicamentos.id,
        precioCompra: 2.5,
        precioVenta: 5.99,
        stockActual: 100,
        stockMinimo: 10,
        activo: true,
      },
    })
  }

  console.log("✅ Productos de ejemplo creados")

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
