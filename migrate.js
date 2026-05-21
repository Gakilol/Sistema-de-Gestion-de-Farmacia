const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  try {
    // 1. Add fields to Producto
    await prisma.$executeRawUnsafe(`ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "descripcionCorta" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "descripcionDetallada" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "observaciones" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Producto" ADD COLUMN IF NOT EXISTS "fechaVencimiento" TIMESTAMP(3)`);
    console.log("Producto table altered.");

    // 2. Create ProveedorProducto
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ProveedorProducto" (
          "id" SERIAL NOT NULL,
          "idProveedor" INTEGER NOT NULL,
          "idProducto" INTEGER NOT NULL,
          "precioCompra" DECIMAL(10,2),
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "ProveedorProducto_pkey" PRIMARY KEY ("id")
      );
    `);
    
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_idProveedor_fkey" FOREIGN KEY ("idProveedor") REFERENCES "Proveedor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ProveedorProducto" ADD CONSTRAINT "ProveedorProducto_idProducto_fkey" FOREIGN KEY ("idProducto") REFERENCES "Producto"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX "ProveedorProducto_idProveedor_idProducto_key" ON "ProveedorProducto"("idProveedor", "idProducto");
      `);
    } catch(e) { console.log("Keys might already exist"); }
    console.log("ProveedorProducto table created.");

    // 3. Add UNIQUE to Cliente (catch if exists)
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_telefono_key" UNIQUE ("telefono")`);
    } catch(e) { console.log("Cliente_telefono_key might exist or duplicate data"); }
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE "Cliente" ADD CONSTRAINT "Cliente_correo_key" UNIQUE ("correo")`);
    } catch(e) { console.log("Cliente_correo_key might exist or duplicate data"); }
    console.log("Cliente constraints added.");
  } catch(e) {
    console.error(e);
  }
}
main().finally(() => prisma.$disconnect());
