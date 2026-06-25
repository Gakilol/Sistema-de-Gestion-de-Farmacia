import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

export function formatCordobas(amount: number | string | any): string {
  const num = Number(amount || 0);
  return `C$ ${num.toLocaleString('es-NI', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#333333',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#cccccc',
    paddingBottom: 10,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#1e293b',
    marginTop: 15,
    marginBottom: 10,
  },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 15,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
    height: 24,
  },
  tableHeader: {
    backgroundColor: '#f8fafc',
    fontFamily: 'Helvetica-Bold',
  },
  tableColHeader: {
    padding: 4,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
  },
  tableCol: {
    padding: 4,
    fontSize: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    color: '#94a3b8',
    fontSize: 8,
  },
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiCard: {
    width: '23%',
    padding: 10,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
  },
  kpiLabel: {
    fontSize: 8,
    color: '#64748b',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
  },
});

// KPI Report Document
export const ReporteKpisDocument = ({ data, start, end }: { data: any, start: string, end: string }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>FarmaPos - Reporte General de KPIs</Text>
        <Text style={styles.subtitle}>Período: {start || 'Inicio'} al {end || 'Fin'}</Text>
      </View>

      <Text style={styles.sectionTitle}>Indicadores Clave de Rendimiento</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Ventas Totales</Text>
          <Text style={styles.kpiValue}>{formatCordobas(data.totalVentas)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Costo de Ventas (COGS)</Text>
          <Text style={styles.kpiValue}>{formatCordobas(data.cogs)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Margen Bruto</Text>
          <Text style={styles.kpiValue}>{formatCordobas(data.margenBruto)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Compras Totales</Text>
          <Text style={styles.kpiValue}>{formatCordobas(data.totalCompras)}</Text>
        </View>
      </View>

      <View style={{ marginTop: 20 }}>
        <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>Resumen Operativo:</Text>
        <Text style={{ marginTop: 5 }}>• Número de transacciones registradas: {data.transaccionesCount}</Text>
        <Text style={{ marginTop: 5 }}>• Productos con stock crítico: {data.stockBajo}</Text>
        <Text style={{ marginTop: 5 }}>• Ventas del día de hoy: {formatCordobas(data.ventasHoy?.total)} ({data.ventasHoy?.count} und)</Text>
        <Text style={{ marginTop: 5 }}>• Ventas acumuladas del mes: {formatCordobas(data.ventasMes?.total)} ({data.ventasMes?.count} und)</Text>
      </View>

      <View style={styles.footer} fixed>
        <Text>FarmaPos Sistema de Gestión Integrada</Text>
        <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
      </View>
    </Page>
  </Document>
);

// Utilidad Bruta Report Document (Landscape)
export const ReporteUtilidadBrutaDocument = ({ data, start, end }: { data: any, start: string, end: string }) => {
  const { ventas = [], resumen = {} } = data;
  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FarmaPos - Reporte Detallado de Utilidad Bruta</Text>
          <Text style={styles.subtitle}>Período: {start || 'Inicio'} al {end || 'Fin'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Resumen Financiero</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Ingresos Brutos</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalVentasBrutas)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Descuentos Totales</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalDescuentos)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Ingresos Netos</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalVentas)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Costo COGS</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalCogs)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Utilidad (Margen: {Number(resumen.margenPct || 0).toFixed(1)}%)</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalUtilidad)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Listado de Facturas y Ventas</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableColHeader, { width: '5%' }]}>ID</Text>
            <Text style={[styles.tableColHeader, { width: '9%' }]}>Fecha</Text>
            <Text style={[styles.tableColHeader, { width: '14%' }]}>Cliente</Text>
            <Text style={[styles.tableColHeader, { width: '14%' }]}>Descuento Aplicado</Text>
            <Text style={[styles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Total Bruto</Text>
            <Text style={[styles.tableColHeader, { width: '8%', textAlign: 'right' }]}>Desc. Línea</Text>
            <Text style={[styles.tableColHeader, { width: '8%', textAlign: 'right' }]}>Desc. Gral</Text>
            <Text style={[styles.tableColHeader, { width: '11%', textAlign: 'right' }]}>Total Neto</Text>
            <Text style={[styles.tableColHeader, { width: '11%', textAlign: 'right' }]}>COGS (Costo)</Text>
            <Text style={[styles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Utilidad</Text>
          </View>

          {ventas.map((v: any) => (
            <View style={styles.tableRow} key={v.id}>
              <Text style={[styles.tableCol, { width: '5%' }]}>#{v.id}</Text>
              <Text style={[styles.tableCol, { width: '9%' }]}>{new Date(v.fecha).toLocaleDateString('es-NI')}</Text>
              <Text style={[styles.tableCol, { width: '14%' }]}>{v.cliente}</Text>
              <Text style={[styles.tableCol, { width: '14%', color: v.descuentoNombre ? '#7c3aed' : '#94a3b8', fontFamily: v.descuentoNombre ? 'Helvetica-Bold' : 'Helvetica' }]}>{v.descuentoNombre || '—'}</Text>
              <Text style={[styles.tableCol, { width: '10%', textAlign: 'right' }]}>{formatCordobas(v.totalBruto)}</Text>
              <Text style={[styles.tableCol, { width: '8%', textAlign: 'right' }]}>{formatCordobas(v.descuentoLineas)}</Text>
              <Text style={[styles.tableCol, { width: '8%', textAlign: 'right' }]}>{formatCordobas(v.descuentoGeneral)}</Text>
              <Text style={[styles.tableCol, { width: '11%', textAlign: 'right' }]}>{formatCordobas(v.total)}</Text>
              <Text style={[styles.tableCol, { width: '11%', textAlign: 'right' }]}>{formatCordobas(v.cogs)}</Text>
              <Text style={[styles.tableCol, { width: '10%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{formatCordobas(v.utilidad)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>FarmaPos Sistema de Gestión Integrada</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};


// Utilidad por Producto Report Document (Landscape)
export const ReporteUtilidadProductoDocument = ({ data, start, end }: { data: any[], start: string, end: string }) => {
  const totalBruto = data.reduce((sum, item) => sum + item.ingresosBrutos, 0);
  const totalDescuentos = data.reduce((sum, item) => sum + item.descuentoLinea + item.descuentoGeneralProrrateado, 0);
  const totalVentas = data.reduce((sum, item) => sum + item.ingresosTotales, 0);
  const totalCogs = data.reduce((sum, item) => sum + item.cogs, 0);
  const totalUtilidad = totalVentas - totalCogs;
  const margenGeneral = totalVentas > 0 ? (totalUtilidad / totalVentas) * 100 : 0;

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FarmaPos - Reporte de Rentabilidad por Producto</Text>
          <Text style={styles.subtitle}>Período: {start || 'Inicio'} al {end || 'Fin'}</Text>
        </View>

        <Text style={styles.sectionTitle}>Rentabilidad Acumulada</Text>
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Ingresos Brutos</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalBruto)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Descuentos Totales</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalDescuentos)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Ingresos Netos</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalVentas)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Costo COGS</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalCogs)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '18%' }]}>
            <Text style={styles.kpiLabel}>Utilidad (Margen: {margenGeneral.toFixed(1)}%)</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalUtilidad)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rentabilidad Desglosada por Producto</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableColHeader, { width: '17%' }]}>Producto</Text>
            <Text style={[styles.tableColHeader, { width: '10%' }]}>Categoría</Text>
            <Text style={[styles.tableColHeader, { width: '10%' }]}>Laboratorio</Text>
            <Text style={[styles.tableColHeader, { width: '7%', textAlign: 'center' }]}>Cant. Vend.</Text>
            <Text style={[styles.tableColHeader, { width: '11%', textAlign: 'right' }]}>Total Bruto</Text>
            <Text style={[styles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Desc. Línea</Text>
            <Text style={[styles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Desc. Gral</Text>
            <Text style={[styles.tableColHeader, { width: '11%', textAlign: 'right' }]}>Total Neto</Text>
            <Text style={[styles.tableColHeader, { width: '10%', textAlign: 'right' }]}>Costo Total</Text>
            <Text style={[styles.tableColHeader, { width: '11%', textAlign: 'right' }]}>Utilidad</Text>
          </View>

          {data.map((p: any) => (
            <View style={styles.tableRow} key={p.id}>
              <Text style={[styles.tableCol, { width: '17%' }]}>{p.nombre}</Text>
              <Text style={[styles.tableCol, { width: '10%' }]}>{p.categoria}</Text>
              <Text style={[styles.tableCol, { width: '10%' }]}>{p.laboratorio}</Text>
              <Text style={[styles.tableCol, { width: '7%', textAlign: 'center' }]}>{p.cantidadVendida} und</Text>
              <Text style={[styles.tableCol, { width: '11%', textAlign: 'right' }]}>{formatCordobas(p.ingresosBrutos)}</Text>
              <Text style={[styles.tableCol, { width: '10%', textAlign: 'right' }]}>{formatCordobas(p.descuentoLinea)}</Text>
              <Text style={[styles.tableCol, { width: '10%', textAlign: 'right' }]}>{formatCordobas(p.descuentoGeneralProrrateado)}</Text>
              <Text style={[styles.tableCol, { width: '11%', textAlign: 'right' }]}>{formatCordobas(p.ingresosTotales)}</Text>
              <Text style={[styles.tableCol, { width: '10%', textAlign: 'right' }]}>{formatCordobas(p.cogs)}</Text>
              <Text style={[styles.tableCol, { width: '11%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{formatCordobas(p.utilidad)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>FarmaPos Sistema de Gestión Integrada</Text>
          <Text render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};
