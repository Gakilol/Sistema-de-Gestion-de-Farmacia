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
          <View style={[styles.kpiCard, { width: '31%' }]}>
            <Text style={styles.kpiLabel}>Ingresos Netos Totales</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalVentas)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '31%' }]}>
            <Text style={styles.kpiLabel}>Costo de Mercancía Vendida (COGS)</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalCogs)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '31%' }]}>
            <Text style={styles.kpiLabel}>Utilidad Bruta (Margen: {Number(resumen.margenPct || 0).toFixed(1)}%)</Text>
            <Text style={styles.kpiValue}>{formatCordobas(resumen.totalUtilidad)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Listado de Facturas y Ventas</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableColHeader, { width: '8%' }]}>ID Venta</Text>
            <Text style={[styles.tableColHeader, { width: '17%' }]}>Fecha</Text>
            <Text style={[styles.tableColHeader, { width: '25%' }]}>Cliente</Text>
            <Text style={[styles.tableColHeader, { width: '16%', textAlign: 'right' }]}>Total Neto</Text>
            <Text style={[styles.tableColHeader, { width: '16%', textAlign: 'right' }]}>COGS (Costo)</Text>
            <Text style={[styles.tableColHeader, { width: '18%', textAlign: 'right' }]}>Utilidad Bruta</Text>
          </View>

          {ventas.map((v: any) => (
            <View style={styles.tableRow} key={v.id}>
              <Text style={[styles.tableCol, { width: '8%' }]}>#{v.id}</Text>
              <Text style={[styles.tableCol, { width: '17%' }]}>{new Date(v.fecha).toLocaleString('es-NI')}</Text>
              <Text style={[styles.tableCol, { width: '25%' }]}>{v.cliente}</Text>
              <Text style={[styles.tableCol, { width: '16%', textAlign: 'right' }]}>{formatCordobas(v.total)}</Text>
              <Text style={[styles.tableCol, { width: '16%', textAlign: 'right' }]}>{formatCordobas(v.cogs)}</Text>
              <Text style={[styles.tableCol, { width: '18%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{formatCordobas(v.utilidad)}</Text>
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
          <View style={[styles.kpiCard, { width: '31%' }]}>
            <Text style={styles.kpiLabel}>Ingresos Comerciales</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalVentas)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '31%' }]}>
            <Text style={styles.kpiLabel}>Costo Total Comercial (COGS)</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalCogs)}</Text>
          </View>
          <View style={[styles.kpiCard, { width: '31%' }]}>
            <Text style={styles.kpiLabel}>Utilidad Comercial (Margen: {margenGeneral.toFixed(1)}%)</Text>
            <Text style={styles.kpiValue}>{formatCordobas(totalUtilidad)}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Rentabilidad Desglosada por Producto</Text>
        <View style={styles.table}>
          <View style={[styles.tableRow, styles.tableHeader]}>
            <Text style={[styles.tableColHeader, { width: '22%' }]}>Producto</Text>
            <Text style={[styles.tableColHeader, { width: '13%' }]}>Categoría</Text>
            <Text style={[styles.tableColHeader, { width: '13%' }]}>Laboratorio</Text>
            <Text style={[styles.tableColHeader, { width: '10%', textAlign: 'center' }]}>Cant. Vendida</Text>
            <Text style={[styles.tableColHeader, { width: '14%', textAlign: 'right' }]}>Ventas Netas</Text>
            <Text style={[styles.tableColHeader, { width: '14%', textAlign: 'right' }]}>Costo Total</Text>
            <Text style={[styles.tableColHeader, { width: '14%', textAlign: 'right' }]}>Utilidad</Text>
          </View>

          {data.map((p: any) => (
            <View style={styles.tableRow} key={p.id}>
              <Text style={[styles.tableCol, { width: '22%' }]}>{p.nombre}</Text>
              <Text style={[styles.tableCol, { width: '13%' }]}>{p.categoria}</Text>
              <Text style={[styles.tableCol, { width: '13%' }]}>{p.laboratorio}</Text>
              <Text style={[styles.tableCol, { width: '10%', textAlign: 'center' }]}>{p.cantidadVendida} und</Text>
              <Text style={[styles.tableCol, { width: '14%', textAlign: 'right' }]}>{formatCordobas(p.ingresosTotales)}</Text>
              <Text style={[styles.tableCol, { width: '14%', textAlign: 'right' }]}>{formatCordobas(p.cogs)}</Text>
              <Text style={[styles.tableCol, { width: '14%', textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>{formatCordobas(p.utilidad)}</Text>
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
