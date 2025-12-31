/**
 * FINANCE HUB - Hook para Exportação de Dados
 * 
 * @module hooks/useExportData
 * @description Exportação para CSV, Excel e PDF
 */

import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { toast } from 'sonner';

// ============================================
// TIPOS
// ============================================

export type ExportFormat = 'csv' | 'xlsx' | 'pdf';

export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  width?: number;
  format?: (value: unknown) => string;
}

interface UseExportDataOptions<T> {
  columns: ExportColumn<T>[];
  fileName: string;
}

// ============================================
// HOOK
// ============================================

export function useExportData<T extends Record<string, unknown>>(
  options: UseExportDataOptions<T>
) {
  const { columns, fileName } = options;
  const [isExporting, setIsExporting] = useState(false);

  // Formatar dados para exportação
  const formatData = useCallback((data: T[]): Record<string, unknown>[] => {
    return data.map((row) => {
      const formatted: Record<string, unknown> = {};
      columns.forEach((col) => {
        const value = row[col.key];
        formatted[col.header] = col.format ? col.format(value) : value;
      });
      return formatted;
    });
  }, [columns]);

  // Exportar para CSV
  const exportCSV = useCallback((data: T[]) => {
    const formatted = formatData(data);
    const headers = columns.map((c) => c.header);
    
    const csvContent = [
      headers.join(','),
      ...formatted.map((row) =>
        headers
          .map((h) => {
            const value = row[h];
            // Escapar valores com vírgula ou aspas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value ?? '';
          })
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [columns, formatData, fileName]);

  // Exportar para Excel
  const exportExcel = useCallback((data: T[]) => {
    const formatted = formatData(data);
    const worksheet = XLSX.utils.json_to_sheet(formatted);
    
    // Ajustar largura das colunas
    const colWidths = columns.map((col) => ({
      wch: col.width ?? Math.max(col.header.length, 15),
    }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    XLSX.writeFile(workbook, `${fileName}.xlsx`);
  }, [columns, formatData, fileName]);

  // Exportar para PDF
  const exportPDF = useCallback((data: T[], title?: string) => {
    const doc = new jsPDF({
      orientation: data.length > 5 ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // Título
    doc.setFontSize(16);
    doc.text(title ?? fileName, 14, 15);
    
    // Data de geração
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 22);

    // Tabela
    const tableData = data.map((row) =>
      columns.map((col) => {
        const value = row[col.key];
        return col.format ? col.format(value) : String(value ?? '');
      })
    );

    autoTable(doc, {
      head: [columns.map((c) => c.header)],
      body: tableData,
      startY: 30,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246], // blue-500
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252], // slate-50
      },
    });

    doc.save(`${fileName}.pdf`);
  }, [columns, fileName]);

  // Função principal de exportação
  const exportData = useCallback(async (
    data: T[],
    format: ExportFormat,
    options?: { title?: string }
  ) => {
    if (data.length === 0) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    setIsExporting(true);

    try {
      switch (format) {
        case 'csv':
          exportCSV(data);
          break;
        case 'xlsx':
          exportExcel(data);
          break;
        case 'pdf':
          exportPDF(data, options?.title);
          break;
      }

      toast.success(`Exportado ${data.length} registros para ${format.toUpperCase()}`);
    } catch (error) {
      toast.error(`Erro ao exportar: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsExporting(false);
    }
  }, [exportCSV, exportExcel, exportPDF]);

  return {
    exportData,
    exportCSV: (data: T[]) => exportData(data, 'csv'),
    exportExcel: (data: T[]) => exportData(data, 'xlsx'),
    exportPDF: (data: T[], title?: string) => exportData(data, 'pdf', { title }),
    isExporting,
  };
}

export default useExportData;
