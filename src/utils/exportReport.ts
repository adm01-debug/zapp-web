import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { log } from '@/lib/logger';

export interface ReportData {
  title: string;
  subtitle?: string;
  generatedAt: Date;
  columns: { header: string; key: string; width?: number }[];
  rows: Record<string, string | number | boolean | null>[];
  summary?: { label: string; value: string | number }[];
}

function generateFileName(data: ReportData, ext: string): string {
  return `${data.title.toLowerCase().replace(/\s+/g, '-')}-${format(data.generatedAt, 'yyyy-MM-dd')}.${ext}`;
}

export const exportToPDF = (data: ReportData): void => {
  try {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text(data.title, pageWidth / 2, 20, { align: 'center' });
  
  if (data.subtitle) {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(data.subtitle, pageWidth / 2, 28, { align: 'center' });
  }
  
  // Generated date
  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Gerado em: ${format(data.generatedAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}`,
    pageWidth / 2,
    36,
    { align: 'center' }
  );

  // Summary section if exists
  let startY = 45;
  if (data.summary && data.summary.length > 0) {
    doc.setFontSize(12);
    doc.setTextColor(40, 40, 40);
    doc.text('Resumo', 14, startY);
    
    startY += 8;
    doc.setFontSize(10);
    data.summary.forEach((item, index) => {
      const yPos = startY + (index * 6);
      doc.setTextColor(100, 100, 100);
      doc.text(`${item.label}:`, 14, yPos);
      doc.setTextColor(40, 40, 40);
      doc.text(String(item.value), 80, yPos);
    });
    
    startY += data.summary.length * 6 + 10;
  }

  // Table
  const tableHeaders = data.columns.map(col => col.header);
  const tableRows = data.rows.map(row => 
    data.columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '-';
      if (typeof value === 'number') {
        return value.toLocaleString('pt-BR');
      }
      return String(value);
    })
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: startY,
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [59, 130, 246],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: data.columns.reduce((acc, col, index) => {
      if (col.width) {
        acc[index] = { cellWidth: col.width };
      }
      return acc;
    }, {} as Record<number, { cellWidth: number }>),
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }

  // Download
  doc.save(generateFileName(data, 'pdf'));
  } catch (error) {
    log.error('Failed to export PDF:', error);
    throw error;
  }
};

export const exportToExcel = (data: ReportData): void => {
  try {
  // Create workbook
  const wb = XLSX.utils.book_new();
  
  // Create summary sheet if exists
  if (data.summary && data.summary.length > 0) {
    const summaryData = [
      ['Relatório:', data.title],
      ['Gerado em:', format(data.generatedAt, "dd/MM/yyyy HH:mm", { locale: ptBR })],
      [''],
      ['Resumo'],
      ...data.summary.map(item => [item.label, item.value]),
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumo');
  }

  // Create data sheet
  const headers = data.columns.map(col => col.header);
  const rows = data.rows.map(row => 
    data.columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      return value;
    })
  );
  
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  
  // Set column widths
  const colWidths = data.columns.map(col => ({ wch: col.width || 15 }));
  ws['!cols'] = colWidths;
  
  XLSX.utils.book_append_sheet(wb, ws, 'Dados');

  // Download
  XLSX.writeFile(wb, generateFileName(data, 'xlsx'));
  } catch (error) {
    log.error('Failed to export Excel:', error);
    throw error;
  }
};

export const exportToCSV = (data: ReportData): void => {
  const headers = data.columns.map(col => col.header);
  const rows = data.rows.map(row => 
    data.columns.map(col => {
      const value = row[col.key];
      if (value === null || value === undefined) return '';
      // Escape quotes and wrap in quotes if contains comma
      const strValue = String(value);
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      return strValue;
    })
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  try {
    link.href = url;
    link.download = generateFileName(data, 'csv');
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
};
