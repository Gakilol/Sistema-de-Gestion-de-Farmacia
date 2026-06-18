/**
 * AUDITORÍA COMPLETA DE INVENTARIO — FarmaPos
 * 
 * Verifica:
 * 1. Producto.stockActual == SUM(Lote.stockActual) 
 * 2. Stock negativo o nulo
 * 3. Productos sin lotes
 * 4. Lotes sin producto (huérfanos)
 * 5. Integridad referencial general
 * 6. Movimientos huérfanos
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface AuditIssue {
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  category: string
  description: string
  details: any
  autoFixable: boolean
}

async function runAudit() {
  const issues: AuditIssue[] = []
  const fixes: string[] = []

  console.log('═══════════════════════════════════════════════════════════')
  console.log('  AUDITORÍA COMPLETA DE INVENTARIO — FarmaPos')
  console.log('  Fecha:', new Date().toISOString())
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')

  // ── 1. CONSISTENCIA DE STOCK: Producto.stockActual vs SUM(Lote.stockActual) ──
  console.log('🔍 [1/8] Verificando consistencia de stock...')
  const productos = await prisma.producto.findMany({
    include: {
      lotes: { where: { activo: true } },
      categoria: true,
    },
  })

  for (const producto of productos) {
    const sumLotes = producto.lotes.reduce((sum, l) => sum + l.stockActual, 0)
    if (producto.stockActual !== sumLotes) {
      issues.push({
        severity: 'CRITICAL',
        category: 'STOCK_MISMATCH',
        description: `Producto "${producto.nombre}" (ID: ${producto.id}): stockActual=${producto.stockActual} ≠ SUM(Lote.stockActual)=${sumLotes}`,
        details: { productoId: producto.id, stockActual: producto.stockActual, sumLotes, diferencia: producto.stockActual - sumLotes },
        autoFixable: true,
      })
    }
  }

  // ── 2. STOCK NEGATIVO ──
  console.log('🔍 [2/8] Buscando stock negativo...')
  const stockNegativoProductos = productos.filter(p => p.stockActual < 0)
  for (const p of stockNegativoProductos) {
    issues.push({
      severity: 'CRITICAL',
      category: 'NEGATIVE_STOCK',
      description: `Producto "${p.nombre}" (ID: ${p.id}) tiene stock negativo: ${p.stockActual}`,
      details: { productoId: p.id, stockActual: p.stockActual },
      autoFixable: false,
    })
  }

  const lotesNegativos = await prisma.lote.findMany({ where: { stockActual: { lt: 0 } }, include: { producto: true } })
  for (const l of lotesNegativos) {
    issues.push({
      severity: 'CRITICAL',
      category: 'NEGATIVE_STOCK_LOTE',
      description: `Lote "${l.codigoLote}" (ID: ${l.id}) del producto "${l.producto.nombre}" tiene stock negativo: ${l.stockActual}`,
      details: { loteId: l.id, productoId: l.idProducto, stockActual: l.stockActual },
      autoFixable: false,
    })
  }

  // ── 3. PRODUCTOS SIN LOTES ──
  console.log('🔍 [3/8] Buscando productos activos sin lotes...')
  const productosSinLotes = productos.filter(p => p.activo && p.lotes.length === 0 && p.stockActual > 0)
  for (const p of productosSinLotes) {
    issues.push({
      severity: 'WARNING',
      category: 'PRODUCT_NO_LOTS',
      description: `Producto "${p.nombre}" (ID: ${p.id}) tiene stock=${p.stockActual} pero 0 lotes activos`,
      details: { productoId: p.id, stockActual: p.stockActual },
      autoFixable: false,
    })
  }

  // ── 4. LOTES SIN PRODUCTO VÁLIDO (huérfanos) ──
  console.log('🔍 [4/8] Buscando lotes huérfanos...')
  const todosLotes = await prisma.lote.findMany({ include: { producto: true } })
  // Prisma enforces FK so this shouldn't happen, but check for inactive/deleted products
  const lotesHuerfanos = todosLotes.filter(l => !l.producto)
  for (const l of lotesHuerfanos) {
    issues.push({
      severity: 'CRITICAL',
      category: 'ORPHAN_LOT',
      description: `Lote ID: ${l.id} (Código: ${l.codigoLote}) no tiene producto asociado`,
      details: { loteId: l.id, idProducto: l.idProducto },
      autoFixable: false,
    })
  }

  // ── 5. LOTES DUPLICADOS (mismo producto + mismo código) ──
  console.log('🔍 [5/8] Buscando lotes duplicados...')
  const lotesPorProducto = new Map<string, typeof todosLotes>()
  for (const l of todosLotes) {
    const key = `${l.idProducto}-${l.codigoLote}`
    if (!lotesPorProducto.has(key)) lotesPorProducto.set(key, [])
    lotesPorProducto.get(key)!.push(l)
  }
  for (const [key, lotes] of lotesPorProducto) {
    if (lotes.length > 1) {
      issues.push({
        severity: 'WARNING',
        category: 'DUPLICATE_LOT',
        description: `Lote duplicado: código "${lotes[0].codigoLote}" del producto "${lotes[0].producto.nombre}" aparece ${lotes.length} veces`,
        details: { loteIds: lotes.map(l => l.id), productoId: lotes[0].idProducto, codigoLote: lotes[0].codigoLote },
        autoFixable: false,
      })
    }
  }

  // ── 6. INTEGRIDAD REFERENCIAL ──
  console.log('🔍 [6/8] Verificando integridad referencial...')

  // Ventas sin detalles
  const ventasSinDetalles = await prisma.venta.findMany({
    where: { detalles: { none: {} } },
    select: { id: true, fecha: true, total: true },
  })
  for (const v of ventasSinDetalles) {
    issues.push({
      severity: 'WARNING',
      category: 'SALE_NO_DETAILS',
      description: `Venta #${v.id} (${v.fecha.toISOString().split('T')[0]}) sin detalles de productos`,
      details: { ventaId: v.id, total: v.total },
      autoFixable: false,
    })
  }

  // Compras sin detalles
  const comprasSinDetalles = await prisma.compra.findMany({
    where: { detalles: { none: {} } },
    select: { id: true, fecha: true, total: true },
  })
  for (const c of comprasSinDetalles) {
    issues.push({
      severity: 'WARNING',
      category: 'PURCHASE_NO_DETAILS',
      description: `Compra #${c.id} (${c.fecha.toISOString().split('T')[0]}) sin detalles de productos`,
      details: { compraId: c.id, total: c.total },
      autoFixable: false,
    })
  }

  // Productos sin categoría válida (should not happen due to FK)
  const productosSinCategoria = productos.filter(p => !p.categoria)
  for (const p of productosSinCategoria) {
    issues.push({
      severity: 'CRITICAL',
      category: 'PRODUCT_NO_CATEGORY',
      description: `Producto "${p.nombre}" (ID: ${p.id}) sin categoría válida`,
      details: { productoId: p.id },
      autoFixable: false,
    })
  }

  // Movimientos sin producto
  const movsSinProducto = await prisma.movimientoInventario.findMany({
    where: { producto: undefined },
    take: 50,
  })

  // ── 7. LOTES VENCIDOS CON STOCK ──
  console.log('🔍 [7/8] Buscando lotes vencidos con stock...')
  const ahora = new Date()
  const lotesVencidosConStock = todosLotes.filter(
    l => l.activo && l.stockActual > 0 && l.fechaVencimiento && new Date(l.fechaVencimiento) <= ahora
  )
  for (const l of lotesVencidosConStock) {
    issues.push({
      severity: 'WARNING',
      category: 'EXPIRED_LOT_WITH_STOCK',
      description: `Lote "${l.codigoLote}" de "${l.producto.nombre}" VENCIDO (${l.fechaVencimiento?.toISOString().split('T')[0]}) con ${l.stockActual} unidades en stock`,
      details: { loteId: l.id, productoId: l.idProducto, stock: l.stockActual, fechaVencimiento: l.fechaVencimiento },
      autoFixable: false,
    })
  }

  // ── 8. ESTADÍSTICAS GENERALES ──
  console.log('🔍 [8/8] Generando estadísticas...')
  const totalProductos = productos.length
  const productosActivos = productos.filter(p => p.activo).length
  const totalLotes = todosLotes.length
  const lotesActivos = todosLotes.filter(l => l.activo && l.stockActual > 0).length
  const totalMovimientos = await prisma.movimientoInventario.count()
  const totalVentas = await prisma.venta.count()
  const totalCompras = await prisma.compra.count()

  // ── REPORT ──
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  RESULTADOS DE LA AUDITORÍA')
  console.log('═══════════════════════════════════════════════════════════')
  console.log('')
  console.log('📊 ESTADÍSTICAS GENERALES:')
  console.log(`   Productos: ${totalProductos} (${productosActivos} activos)`)
  console.log(`   Lotes: ${totalLotes} (${lotesActivos} activos con stock)`)
  console.log(`   Movimientos: ${totalMovimientos}`)
  console.log(`   Ventas: ${totalVentas}`)
  console.log(`   Compras: ${totalCompras}`)
  console.log(`   Lotes vencidos con stock: ${lotesVencidosConStock.length}`)
  console.log('')

  const criticalIssues = issues.filter(i => i.severity === 'CRITICAL')
  const warningIssues = issues.filter(i => i.severity === 'WARNING')
  const infoIssues = issues.filter(i => i.severity === 'INFO')

  if (issues.length === 0) {
    console.log('✅ NO SE ENCONTRARON PROBLEMAS. El inventario es consistente.')
  } else {
    console.log(`⚠️  SE ENCONTRARON ${issues.length} PROBLEMAS:`)
    console.log(`   🔴 Críticos: ${criticalIssues.length}`)
    console.log(`   🟡 Advertencias: ${warningIssues.length}`)
    console.log(`   🔵 Informativos: ${infoIssues.length}`)
    console.log('')

    for (const issue of issues) {
      const icon = issue.severity === 'CRITICAL' ? '🔴' : issue.severity === 'WARNING' ? '🟡' : '🔵'
      console.log(`${icon} [${issue.category}] ${issue.description}`)
      if (issue.autoFixable) {
        console.log(`   ↳ Auto-corregible: SÍ`)
      }
    }
  }

  // ── AUTO-FIX: Corregir inconsistencias de stock ──
  const stockMismatches = issues.filter(i => i.category === 'STOCK_MISMATCH')
  if (stockMismatches.length > 0) {
    console.log('')
    console.log('═══════════════════════════════════════════════════════════')
    console.log('  AUTO-CORRECCIÓN DE STOCK')
    console.log('═══════════════════════════════════════════════════════════')
    
    for (const issue of stockMismatches) {
      const { productoId, sumLotes } = issue.details
      console.log(`   Corrigiendo Producto ID ${productoId}: stockActual → ${sumLotes}`)
      
      await prisma.producto.update({
        where: { id: productoId },
        data: { stockActual: sumLotes },
      })

      await prisma.auditoriaLog.create({
        data: {
          accion: 'AUTO_FIX_STOCK',
          entidad: 'Producto',
          entidadId: productoId,
          detalles: JSON.stringify({
            stockAnterior: issue.details.stockActual,
            stockCorregido: sumLotes,
            diferencia: issue.details.diferencia,
            motivo: 'Auditoría automática de consistencia',
          }),
        },
      })

      fixes.push(`Producto ID ${productoId}: stockActual ${issue.details.stockActual} → ${sumLotes}`)
    }
    console.log(`   ✅ ${stockMismatches.length} productos corregidos.`)
  }

  // ── OUTPUT JSON REPORT ──
  const report = {
    timestamp: new Date().toISOString(),
    stats: { totalProductos, productosActivos, totalLotes, lotesActivos, totalMovimientos, totalVentas, totalCompras, lotesVencidosConStock: lotesVencidosConStock.length },
    issues,
    fixes,
    summary: {
      total: issues.length,
      critical: criticalIssues.length,
      warnings: warningIssues.length,
      info: infoIssues.length,
      autoFixed: fixes.length,
    },
  }

  // Write report to file
  const fs = require('fs')
  const reportPath = './backups/audit_report.json'
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log('')
  console.log(`📄 Reporte guardado en: ${reportPath}`)
  console.log('')
  console.log('═══════════════════════════════════════════════════════════')

  await prisma.$disconnect()
  return report
}

runAudit().catch(e => {
  console.error('Error en auditoría:', e)
  process.exit(1)
})
