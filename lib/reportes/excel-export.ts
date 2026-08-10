import * as XLSX from "xlsx-js-style"

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
  const navy = "123047"
  const emerald = "0F766E"
  const emeraldLight = "E6F4F1"
  const slate = "475569"
  const lightBorder = "CBD5E1"
  const alternateRow = "F8FAFC"
  const headerRow = columns.map((column) => column.header)
  const dataRows = rows.map((row) => columns.map((column) => column.value(row)))
  const worksheet = XLSX.utils.aoa_to_sheet([
    [title],
    [`Período: ${period}`],
    [`Generado: ${new Intl.DateTimeFormat("es-NI", { dateStyle: "long", timeStyle: "short" }).format(new Date())}`],
    columns.map(() => ""),
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
  ;(worksheet as XLSX.WorkSheet & { "!pageSetup"?: unknown })["!pageSetup"] = {
    orientation: columns.length > 6 ? "landscape" : "portrait",
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
  }
  ;(worksheet as XLSX.WorkSheet & { "!headerFooter"?: unknown })["!headerFooter"] = {
    oddFooter: "&LFarmaPOS&C&P de &N&RReporte confidencial",
  }

  const titleCell = worksheet.A1
  if (titleCell) titleCell.s = {
    font: { name: "Aptos Display", sz: 18, bold: true, color: { rgb: "FFFFFF" } },
    fill: { patternType: "solid", fgColor: { rgb: navy } },
    alignment: { vertical: "center", horizontal: "left" },
  }
  ;["A2", "A3"].forEach((address) => {
    const cell = worksheet[address]
    if (!cell) return
    cell.s = {
      font: { name: "Aptos", sz: address === "A2" ? 11 : 10, bold: address === "A2", color: { rgb: address === "A2" ? emerald : slate } },
      fill: { patternType: "solid", fgColor: { rgb: address === "A2" ? emeraldLight : "F1F5F9" } },
      alignment: { vertical: "center", horizontal: "left" },
    }
  })
  columns.forEach((_, columnIndex) => {
    const spacerCell = worksheet[XLSX.utils.encode_cell({ r: 3, c: columnIndex })]
    if (spacerCell) spacerCell.s = {
      fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
      font: { color: { rgb: "FFFFFF" } },
    }
  })

  columns.forEach((column, columnIndex) => {
    const headerAddress = XLSX.utils.encode_cell({ r: 4, c: columnIndex })
    const headerCell = worksheet[headerAddress]
    if (headerCell) headerCell.s = {
      font: { name: "Aptos", sz: 10, bold: true, color: { rgb: "FFFFFF" } },
      fill: { patternType: "solid", fgColor: { rgb: emerald } },
      alignment: { vertical: "center", horizontal: "left", wrapText: true },
      border: {
        bottom: { style: "medium", color: { rgb: navy } },
      },
    }
  })

  columns.forEach((column, columnIndex) => {
    rows.forEach((_, rowIndex) => {
      const address = XLSX.utils.encode_cell({ r: rowIndex + 5, c: columnIndex })
      const cell = worksheet[address]
      if (!cell) return
      if (column.numberFormat) cell.z = column.numberFormat
      cell.s = {
        font: { name: "Aptos", sz: 10, color: { rgb: typeof cell.v === "number" && cell.v < 0 ? "B91C1C" : "1E293B" } },
        fill: { patternType: "solid", fgColor: { rgb: rowIndex % 2 === 0 ? "FFFFFF" : alternateRow } },
        alignment: {
          vertical: "center",
          horizontal: column.numberFormat || typeof cell.v === "number" ? "right" : "left",
          wrapText: typeof cell.v === "string" && cell.v.length > 45,
        },
        border: { bottom: { style: "thin", color: { rgb: lightBorder } } },
        numFmt: column.numberFormat,
      }
    })
  })

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31))
}

export function createReportWorkbook() {
  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: "Reporte FarmaPOS",
    Subject: "Reporte operativo y financiero en español",
    Author: "FarmaPOS",
    Company: "FarmaPOS",
    CreatedDate: new Date(),
  }
  return workbook
}
