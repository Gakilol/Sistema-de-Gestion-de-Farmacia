import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"
import { execSync } from "child_process"
import { registrarLog } from "@/lib/audit"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Contar registros marcados como datos de prueba
    const counts = {
      usuarios: await prisma.usuario.count({ where: { esDatoPrueba: true } }),
      clientes: await prisma.cliente.count({ where: { esDatoPrueba: true } }),
      categorias: await prisma.categoriaProducto.count({ where: { esDatoPrueba: true } }),
      productos: await prisma.producto.count({ where: { esDatoPrueba: true } }),
      lotes: await prisma.lote.count({ where: { producto: { esDatoPrueba: true } } }),
      devoluciones: await prisma.devolucionProveedor.count({ where: { esDatoPrueba: true } }),
      citas: await prisma.cita.count({ where: { esDatoPrueba: true } }),
      atenciones: await prisma.atencionPodologica.count({ where: { esDatoPrueba: true } }),
      recetas: await prisma.receta.count({ where: { esDatoPrueba: true } }),
    }

    return NextResponse.json({ success: true, counts })
  } catch (error) {
    console.error("Error previewing data cleanup:", error)
    return NextResponse.json({ error: "Error al obtener la vista previa de limpieza" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const usuarioDb = await prisma.usuario.findUnique({
      where: { id: user.id },
      include: { rol: true },
    })
    if (usuarioDb?.rol.nombre !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { confirmText } = await request.json()
    if (confirmText !== "ELIMINAR_DATOS_PRUEBA") {
      return NextResponse.json({ error: "Confirmación de texto inválida" }, { status: 400 })
    }

    // 1. Ejecutar respaldo automático
    console.log("[Limpieza] Iniciando respaldo automático antes de la limpieza...")
    try {
      execSync("npm run db:backup", { stdio: "pipe" })
      console.log("[Limpieza] Respaldo automático completado con éxito.")
    } catch (backupError) {
      console.error("[Limpieza] Error crítico: El respaldo de base de datos falló. Abortando limpieza.", backupError)
      return NextResponse.json({ 
        error: "No se pudo realizar la copia de seguridad previa. La limpieza ha sido cancelada por seguridad." 
      }, { status: 500 })
    }

    // 2. Ejecutar limpieza de datos de prueba en orden referencial para evitar errores de llave foránea
    await prisma.$transaction(async (tx) => {
      // Obtener IDs de entidades de prueba para depurar dependencias
      const testUserIds = (await tx.usuario.findMany({ where: { esDatoPrueba: true }, select: { id: true } })).map(u => u.id)
      const testClientIds = (await tx.cliente.findMany({ where: { esDatoPrueba: true }, select: { id: true } })).map(c => c.id)
      const testProductIds = (await tx.producto.findMany({ where: { esDatoPrueba: true }, select: { id: true } })).map(p => p.id)
      const testLoteIds = (await tx.lote.findMany({ where: { producto: { esDatoPrueba: true } }, select: { id: true } })).map(l => l.id)

      // 2.1. Eliminar DetalleVentaLote
      await tx.detalleVentaLote.deleteMany({
        where: {
          OR: [
            { lote: { producto: { esDatoPrueba: true } } },
            { lote: { idProducto: { in: testProductIds } } },
            { detalleVenta: { idProducto: { in: testProductIds } } },
            { detalleVenta: { venta: { idCliente: { in: testClientIds } } } },
            { detalleVenta: { venta: { idUsuario: { in: testUserIds } } } }
          ]
        }
      })

      // 2.2. Eliminar DetalleVenta
      await tx.detalleVenta.deleteMany({
        where: {
          OR: [
            { idProducto: { in: testProductIds } },
            { venta: { idCliente: { in: testClientIds } } },
            { venta: { idUsuario: { in: testUserIds } } }
          ]
        }
      })

      // 2.3. Eliminar Venta
      await tx.venta.deleteMany({
        where: {
          OR: [
            { idCliente: { in: testClientIds } },
            { idUsuario: { in: testUserIds } }
          ]
        }
      })

      // 2.4. Eliminar DetalleCompra
      await tx.detalleCompra.deleteMany({
        where: {
          OR: [
            { idProducto: { in: testProductIds } },
            { compra: { idUsuario: { in: testUserIds } } }
          ]
        }
      })

      // 2.5. Eliminar Compra
      await tx.compra.deleteMany({
        where: {
          idUsuario: { in: testUserIds }
        }
      })

      // 2.6. Eliminar DevolucionProveedor
      await tx.devolucionProveedor.deleteMany({
        where: {
          OR: [
            { esDatoPrueba: true },
            { idProducto: { in: testProductIds } },
            { idLote: { in: testLoteIds } },
            { idUsuario: { in: testUserIds } }
          ]
        }
      })

      // 2.7. Eliminar MovimientoInventario
      await tx.movimientoInventario.deleteMany({
        where: {
          OR: [
            { idProducto: { in: testProductIds } },
            { idLote: { in: testLoteIds } },
            { idUsuario: { in: testUserIds } }
          ]
        }
      })

      // 2.8. Eliminar Lote
      await tx.lote.deleteMany({
        where: {
          OR: [
            { producto: { esDatoPrueba: true } },
            { idProducto: { in: testProductIds } }
          ]
        }
      })

      // 2.9. Eliminar DetalleReceta
      await tx.detalleReceta.deleteMany({
        where: {
          OR: [
            { idProducto: { in: testProductIds } },
            { receta: { esDatoPrueba: true } },
            { receta: { idCliente: { in: testClientIds } } },
            { receta: { idUsuario: { in: testUserIds } } }
          ]
        }
      })

      // 2.10. Eliminar Receta
      await tx.receta.deleteMany({
        where: {
          OR: [
            { esDatoPrueba: true },
            { idCliente: { in: testClientIds } },
            { idUsuario: { in: testUserIds } }
          ]
        }
      })

      // 2.11. Eliminar AtencionPodologica
      await tx.atencionPodologica.deleteMany({
        where: {
          OR: [
            { esDatoPrueba: true },
            { idCliente: { in: testClientIds } },
            { idUsuario: { in: testUserIds } }
          ]
        }
      })

      // 2.12. Eliminar Cita
      await tx.cita.deleteMany({
        where: {
          OR: [
            { esDatoPrueba: true },
            { idCliente: { in: testClientIds } }
          ]
        }
      })

      // 2.13. Eliminar Producto
      await tx.producto.deleteMany({
        where: { esDatoPrueba: true }
      })

      // 2.14. Eliminar CategoriaProducto
      await tx.categoriaProducto.deleteMany({
        where: { esDatoPrueba: true }
      })

      // 2.15. Eliminar Cliente
      await tx.cliente.deleteMany({
        where: { esDatoPrueba: true }
      })

      // 2.16. Eliminar Usuario
      await tx.usuario.deleteMany({
        where: { esDatoPrueba: true }
      })
    }, {
      maxWait: 15000,
      timeout: 30000,
    })

    // 3. Recalcular stocks para todos los productos restantes
    console.log("[Limpieza] Recalculando stockActual de productos...")
    const productosRestantes = await prisma.producto.findMany({
      select: { id: true }
    })

    for (const prod of productosRestantes) {
      const lotesActivos = await prisma.lote.findMany({
        where: { idProducto: prod.id, activo: true },
        select: { stockActual: true }
      })
      const stockCalculado = lotesActivos.reduce((sum, l) => sum + l.stockActual, 0)
      
      await prisma.producto.update({
        where: { id: prod.id },
        data: { stockActual: stockCalculado }
      })
    }
    console.log("[Limpieza] Recálculo de stock completado.")

    registrarLog({
      accion: "LIMPIEZA_DATOS_PRUEBA",
      entidad: "Sistema",
      idUsuario: user.id,
      detalles: { confirmText, nota: "Se realizó una copia de seguridad y se eliminaron los registros de prueba." }
    })

    return NextResponse.json({ success: true, message: "Datos de prueba eliminados y stocks recalculados exitosamente." })
  } catch (error: any) {
    console.error("Error cleaning test data:", error)
    return NextResponse.json({ error: error.message || "Error al realizar la limpieza de datos" }, { status: 500 })
  }
}
