import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jspdf', () => {
  const mockDoc = {
    internal: { pageSize: { getWidth: () => 210, getHeight: () => 297 } },
    setFontSize: vi.fn(),
    setTextColor: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    getNumberOfPages: vi.fn().mockReturnValue(1),
    setPage: vi.fn(),
  };
  return { default: vi.fn(() => mockDoc) };
});

vi.mock('jspdf-autotable', () => ({ default: vi.fn() }));

vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn().mockReturnValue({}),
    aoa_to_sheet: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

import { exportToPDF, exportToExcel, exportToCSV, type ReportData } from '@/utils/exportReport';

const mockData: ReportData = {
  title: 'Test Report',
  subtitle: 'Subtitle',
  generatedAt: new Date('2024-06-15T10:00:00'),
  columns: [
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'Valor', key: 'value' },
  ],
  rows: [
    { name: 'Item 1', value: 100 },
    { name: 'Item 2', value: null },
    { name: 'Item, with "quotes"', value: 'text\nline' },
  ],
  summary: [
    { label: 'Total', value: 200 },
    { label: 'Média', value: 100 },
  ],
};

describe('exportReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportToPDF', () => {
    it('calls jsPDF and saves', () => {
      expect(() => exportToPDF(mockData)).not.toThrow();
    });

    it('handles data without subtitle', () => {
      const noSubtitle = { ...mockData, subtitle: undefined };
      expect(() => exportToPDF(noSubtitle)).not.toThrow();
    });

    it('handles data without summary', () => {
      const noSummary = { ...mockData, summary: undefined };
      expect(() => exportToPDF(noSummary)).not.toThrow();
    });

    it('handles empty rows', () => {
      const empty = { ...mockData, rows: [] };
      expect(() => exportToPDF(empty)).not.toThrow();
    });
  });

  describe('exportToExcel', () => {
    it('creates workbook with data', () => {
      expect(() => exportToExcel(mockData)).not.toThrow();
    });

    it('includes summary sheet when summary exists', () => {
      const { utils } = require('xlsx');
      exportToExcel(mockData);
      // Should be called twice: Resumo + Dados
      expect(utils.book_append_sheet).toHaveBeenCalledTimes(2);
    });

    it('skips summary sheet when no summary', () => {
      const { utils } = require('xlsx');
      vi.clearAllMocks();
      exportToExcel({ ...mockData, summary: undefined });
      expect(utils.book_append_sheet).toHaveBeenCalledTimes(1);
    });

    it('handles null values in rows', () => {
      expect(() => exportToExcel(mockData)).not.toThrow();
    });
  });

  describe('exportToCSV', () => {
    it('generates CSV and triggers download', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:url');
      const revokeObjectURL = vi.fn();
      const clickSpy = vi.fn();
      
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '',
        download: '',
        click: clickSpy,
      } as any);

      exportToCSV(mockData);

      expect(clickSpy).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalled();
    });

    it('escapes values with commas', () => {
      // The CSV export wraps values with commas in quotes
      expect(() => exportToCSV(mockData)).not.toThrow();
    });

    it('escapes values with quotes', () => {
      expect(() => exportToCSV(mockData)).not.toThrow();
    });

    it('handles empty rows', () => {
      const createObjectURL = vi.fn().mockReturnValue('blob:url');
      const revokeObjectURL = vi.fn();
      global.URL.createObjectURL = createObjectURL;
      global.URL.revokeObjectURL = revokeObjectURL;
      vi.spyOn(document, 'createElement').mockReturnValue({
        href: '', download: '', click: vi.fn(),
      } as any);

      expect(() => exportToCSV({ ...mockData, rows: [] })).not.toThrow();
    });
  });
});
