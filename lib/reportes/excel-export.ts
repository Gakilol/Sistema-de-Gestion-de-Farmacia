import * as XLSX from "xlsx"

export type ExcelReportColumn<T> = {
  header: string
  width: number
  value: (row: T) => string | number | null
  numberFormat?: string
}

type AppendReportSheetOptions<T> = {
  workbook: XLSX.WorkBook
  sheetName: string
  title: string
  period: string
  columns: ExcelReportColumn<T>[]
  rows: T[]
}

export function appendReportSheet<T>({ workbook, sheetName, title, period, columns, rows }: AppendReportSheetOptions<T>) {
  const headerRow = columns.map((column) => column.header)
  const dataRows = rows.map((row) => columns.map((column) => column.value(row)))
  const worksheet = XLSX.utils.aoa_to_sheet([
    [title],
    [`Período: ${period}`],
    [`Generado: ${new Intl.DateTimeFormat("es-NI", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`],
    [],
    headerRow,
    ...dataRows,
  ])

  worksheet["!cols"] = columns.map((column) => ({ wch: column.width }))
  worksheet["!rows"] = [
    { hpt: 26 },
    { hpt: 20 },
    { hpt: 20 },
    { hpt: 10 },
    { hpt: 24 },
    ...rows.map(() => ({ hpt: 21 })),
  ]
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(columns.length - 1, 0) } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(columns.length - 1, 0) } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: Math.max(columns.length - 1, 0) } },
  ]
  worksheet["!autofilter"] = { ref: `A5:${XLSX.utils.encode_col(Math.max(columns.length - 1, 0))}${Math.max(rows.length + 5, 5)}` }
  ;(worksheet as XLSX.WorkSheet & { "!freeze"?: unknown })["!freeze"] = {
    xSplit: 0,
    ySplit: 5,
    topLeftCell: "A6",
    activePane: "bottomLeft",
    state: "frozen",
  }
  worksheet["!margins"] = { left: 0.35, right: 0.35, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }

  columns.forEach((column, columnIndex) => {
    if (!column.numberFormat) return
    rows.forEach((_, rowIndex) => {
      const address = XLSX.utils.encode_cell({ r: rowIndex + 5, c: columnIndex })
      if (worksheet[address]) worksheet[address].z = column.numberFormat
    })
  })

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
}

export function createReportWorkbook() {
  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: "Reporte FarmaPOS",
    Subject: "Reporte operativo y financiero",
    Author: "FarmaPOS",
    Company: "FarmaPOS",
    CreatedDate: new Date(),
  }
  return workbook
}
