import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { productoCreateSchema } from "@/lib/validations"
import {
  analyzeImportRows,
  applyImportAnswer,
  formatImportAnalysis,
  isImportCancellation,
  isImportConfirmation,
  type ImportProductRow,
} from "@/lib/ia/product-import"

const AnswerSchema = z.object({ respuesta: z.string().trim().min(1).max(5000) })
const nullableText = (value: string | undefined) => value?.trim() || null

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (user.rolNombre !== "ADMIN") return NextResponse.json({ error: "Solo administración puede importar productos" }, { status: 403 })
  const { id } = await context.params
  const parsed = AnswerSchema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Respuesta inválida" }, { status: 400 })

  const importacion = await prisma.iAImportacionProducto.findFirst({ where: { id, idUsuario: user.id } })
  if (!importacion) return NextResponse.json({ error: "Importación no encontrada" }, { status: 404 })
  if (importacion.estado !== "BORRADOR") return NextResponse.json({ error: "Esta importación ya fue cerrada" }, { status: 409 })

  if (isImportCancellation(parsed.data.respuesta)) {
    await prisma.iAImportacionProducto.update({ where: { id }, data: { estado: "CANCELADA" } })
    return NextResponse.json({ finalizada: true, cancelada: true, text: "Importación cancelada. No se creó ningún producto." })
  }

  const currentRows = importacion.filas as unknown as ImportProductRow[]
  if (isImportConfirmation(parsed.data.respuesta)) {
    const analysis = await analyzeImportRows(currentRows)
    if (!analysis.listo) {
      return NextResponse.json({ text: formatImportAnalysis(analysis, importacion.archivo), listo: false })
    }

    const validatedRows = analysis.filas.map((row) => {
      const result = productoCreateSchema.safeParse({
        nombre: row.nombre,
        codigoBarras: row.codigoBarras,
        descripcion: row.descripcion,
        idCategoria: row.idCategoria,
        idLaboratorio: row.idLaboratorio,
        laboratorio: typeof row.laboratorio === "string" ? row.laboratorio : undefined,
        concentracion: row.concentracion,
        formaPresentacion: row.formaPresentacion,
        idFormaFarmaceutica: row.idFormaFarmaceutica,
        unidadMedida: row.unidadMedida,
        precioCompra: row.precioCompra ?? 0,
        precioVenta: row.precioVenta ?? 0,
        precioBlister: row.precioBlister,
        precioCaja: row.precioCaja,
        unidadesPorBlister: row.unidadesPorBlister,
        unidadesPorCaja: row.unidadesPorCaja,
        blísteresPorCaja: row.blisteresPorCaja,
        margenUtilidad: row.margenUtilidad,
        stockMinimo: row.stockMinimo,
        stockInicial: row.stockInicial ?? 0,
        loteInicial: row.loteInicial,
        fechaVencimientoInicial: row.fechaVencimientoInicial,
        esServicio: row.esServicio ?? false,
        activo: row.activo ?? true,
      })
      if (!result.success) throw new Error(`Fila ${row.filaExcel}: ${result.error.issues.map((issue) => issue.message).join(", ")}`)
      return { row, data: result.data }
    })

    const created = await prisma.$transaction(async (tx) => {
      const products: Array<{ id: number; nombre: string }> = []
      for (const { row, data } of validatedRows) {
        const product = await tx.producto.create({
          data: {
            nombre: data.nombre.trim(),
            codigoBarras: nullableText(data.codigoBarras ?? undefined),
            descripcion: nullableText(data.descripcion ?? undefined),
            idCategoria: data.idCategoria,
            idLaboratorio: data.idLaboratorio,
            laboratorio: nullableText(data.laboratorio ?? undefined),
            concentracion: nullableText(data.concentracion ?? undefined),
            formaPresentacion: nullableText(data.formaPresentacion ?? undefined),
            idFormaFarmaceutica: data.idFormaFarmaceutica,
            unidadMedida: nullableText(data.unidadMedida ?? undefined),
            precioCompra: data.precioCompra ?? 0,
            precioVenta: data.precioVenta,
            precioBlister: data.precioBlister,
            precioCaja: data.precioCaja,
            unidadesPorBlister: data.unidadesPorBlister,
            unidadesPorCaja: data.unidadesPorCaja,
            blísteresPorCaja: data.blísteresPorCaja,
            margenUtilidad: data.margenUtilidad,
            stockActual: data.stockInicial,
            stockMinimo: data.stockMinimo,
            esServicio: data.esServicio,
            activo: data.activo,
          },
        })

        if (data.stockInicial > 0) {
          const lote = await tx.lote.create({
            data: {
              idProducto: product.id,
              codigoLote: data.loteInicial!,
              fechaVencimiento: new Date(`${data.fechaVencimientoInicial}T12:00:00`),
              stockInicial: data.stockInicial,
              stockActual: data.stockInicial,
              costoCompra: product.precioCompra,
              activo: true,
            },
          })
          await tx.movimientoInventario.create({
            data: {
              idProducto: product.id,
              idLote: lote.id,
              tipo: "AJUSTE_POSITIVO",
              cantidad: data.stockInicial,
              stockResultante: data.stockInicial,
              costoUnitario: product.precioCompra,
              referencia: `Importación IA: ${importacion.archivo}`,
              observacion: `Fila ${row.filaExcel} del archivo`,
              idUsuario: user.id,
            },
          })
        }

        await tx.auditoriaLog.create({
          data: {
            accion: "CREAR_PRODUCTO_EXCEL_IA",
            entidad: "Producto",
            entidadId: product.id,
            idUsuario: user.id,
            detalles: JSON.stringify({ archivo: importacion.archivo, filaExcel: row.filaExcel, nombre: product.nombre }),
          },
        })
        products.push({ id: product.id, nombre: product.nombre })
      }

      await tx.iAImportacionProducto.update({
        where: { id },
        data: {
          estado: "IMPORTADA",
          resumen: { total: products.length, creados: products.length, productos: products } as Prisma.InputJsonValue,
        },
      })
      return products
    }, { maxWait: 10000, timeout: 30000 })

    return NextResponse.json({
      finalizada: true,
      importada: true,
      productosCreados: created.length,
      text: `### Importación completada\n\nCreé **${created.length} producto${created.length === 1 ? "" : "s"}** correctamente desde \`${importacion.archivo}\`. El alta quedó registrada en auditoría.`,
    })
  }

  const applied = applyImportAnswer(currentRows, parsed.data.respuesta)
  if (applied.recognized === 0) {
    const analysis = await analyzeImportRows(currentRows)
    return NextResponse.json({
      text: `${formatImportAnalysis(analysis, importacion.archivo)}\n\nNo pude reconocer datos en tu última respuesta. Usa el formato \`campo=valor\` separado por punto y coma.`,
      listo: analysis.listo,
    })
  }

  const analysis = await analyzeImportRows(applied.rows)
  await prisma.iAImportacionProducto.update({
    where: { id },
    data: {
      filas: applied.rows as unknown as Prisma.InputJsonValue,
      resumen: { total: analysis.total, filasConProblemas: analysis.filasConProblemas, listo: analysis.listo },
    },
  })

  return NextResponse.json({ text: formatImportAnalysis(analysis, importacion.archivo), listo: analysis.listo })
}
