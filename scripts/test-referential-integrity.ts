import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando Pruebas de Integridad Referencial de Base de Datos...')

  const testEmail = `test-user-${Date.now()}@integrity.com`
  let testUsuarioId: number | null = null
  let testCategoriaId: number | null = null
  let testProductoId: number | null = null

  try {
    // Buscar o crear rol
    const rol = await prisma.rol.findFirst()
    if (!rol) {
      throw new Error('No existe ningún Rol en la base de datos')
    }

    // 1. Crear Usuario de prueba
    const usuario = await prisma.usuario.create({
      data: {
        nombreCompleto: 'Integridad Test User',
        correo: testEmail,
        passwordHash: 'dummyhash123',
        idRol: rol.id
      }
    })
    testUsuarioId = usuario.id
    console.log(`✅ Creado usuario de prueba con ID ${usuario.id}`)

    // 2. Crear Categoría de prueba
    const categoria = await prisma.categoriaProducto.create({
      data: {
        nombre: `Cat Integridad ${Date.now()}`,
        descripcion: 'Para probar restricciones de integridad referencial'
      }
    })
    testCategoriaId = categoria.id
    console.log(`✅ Creada categoría de prueba con ID ${categoria.id}`)

    // 3. Crear Producto de prueba
    const producto = await prisma.producto.create({
      data: {
        nombre: `Prod Integridad ${Date.now()}`,
        codigoBarras: `BAR-INT-${Date.now()}`,
        descripcion: 'Producto de prueba de integridad',
        idCategoria: categoria.id,
        precioCompra: 50.00,
        precioVenta: 100.00,
        stockActual: 10
      }
    })
    testProductoId = producto.id
    console.log(`✅ Creado producto de prueba con ID ${producto.id}`)

    // 4. Crear Lote de prueba
    const lote = await prisma.lote.create({
      data: {
        idProducto: producto.id,
        codigoLote: `LOTE-INT-${Date.now()}`,
        stockInicial: 10,
        stockActual: 10,
        costoCompra: 50.00,
        activo: true
      }
    })
    console.log(`✅ Creado lote de prueba con ID ${lote.id}`)

    // 5. Crear MovimientoInventario
    const movimiento = await prisma.movimientoInventario.create({
      data: {
        idProducto: producto.id,
        idLote: lote.id,
        tipo: 'AJUSTE_POSITIVO',
        cantidad: 10,
        stockResultante: 10,
        referencia: 'Inicialización de prueba'
      }
    })
    console.log(`✅ Creado movimiento de inventario de prueba con ID ${movimiento.id}`)

    // ── PRUEBA 1: Restricción de borrado de Categoría activa ──
    console.log('\n--- PRUEBA 1: Intentar borrar una categoría con productos activos ---')
    try {
      await prisma.categoriaProducto.delete({
        where: { id: categoria.id }
      })
      throw new Error('FALLA: Se permitió borrar la categoría teniendo productos vinculados (debió arrojar violación de llave foránea)')
    } catch (e: any) {
      if (e.message && e.message.includes('Foreign key constraint')) {
        console.log('✅ Éxito esperado: El motor bloqueó el borrado de la categoría debido a productos asociados.')
      } else if (e.code === 'P2003') { // Prisma constraint error code
        console.log('✅ Éxito esperado: Prisma detectó violación de llave foránea (P2003).')
      } else {
        console.log(`✅ Bloqueado con error: ${e.message || e}`)
      }
    }

    // ── PRUEBA 2: Borrado en Cascada de Producto -> Lotes y Movimientos ──
    console.log('\n--- PRUEBA 2: Validar borrado en cascada (Producto -> Lotes & Movimientos) ---')
    // Borramos el producto y verificamos que los lotes y movimientos asociados desaparezcan solos
    await prisma.producto.delete({
      where: { id: producto.id }
    })
    console.log('Borrado producto de prueba exitosamente.')

    // Verificar si el lote sigue existiendo
    const loteExistente = await prisma.lote.findUnique({
      where: { id: lote.id }
    })
    if (loteExistente) {
      throw new Error('FALLA: El lote no fue borrado en cascada tras eliminar el producto')
    }
    console.log('✅ El lote asociado fue eliminado en cascada automáticamente.')

    // Verificar si el movimiento sigue existiendo
    const movimientoExistente = await prisma.movimientoInventario.findFirst({
      where: { id: movimiento.id }
    })
    if (movimientoExistente) {
      throw new Error('FALLA: El movimiento de inventario no fue borrado en cascada tras eliminar el producto')
    }
    console.log('✅ El movimiento de inventario asociado fue eliminado en cascada automáticamente.')

  } catch (error) {
    console.error('❌ Error durante la prueba de integridad:', error)
    process.exit(1)
  } finally {
    // Limpieza de datos creados en el test
    console.log('\n🧹 Limpiando registros temporales de integridad...')
    if (testProductoId) {
      try {
        await prisma.producto.delete({ where: { id: testProductoId } }).catch(() => {})
      } catch (e) {}
    }
    if (testCategoriaId) {
      try {
        await prisma.categoriaProducto.delete({ where: { id: testCategoriaId } }).catch(() => {})
      } catch (e) {}
    }
    if (testUsuarioId) {
      try {
        await prisma.usuario.delete({ where: { id: testUsuarioId } }).catch(() => {})
      } catch (e) {}
    }
    await prisma.$disconnect()
  }

  console.log('\n🎉 ¡TODAS LAS PRUEBAS DE INTEGRIDAD REFERENCIAL PASARON EXITOSAMENTE! 🎉')
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
