import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn().mockReturnValue({}),
    book_new: vi.fn().mockReturnValue({}),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    save: vi.fn(),
    internal: { pageSize: { getWidth: vi.fn().mockReturnValue(210) } },
  })),
}));

vi.mock('jspdf-autotable', () => ({
  default: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useExportData } from '@/hooks/useExportData';

interface TestRow {
  name: string;
  email: string;
  score: number;
}

describe('useExportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const columns = [
    { key: 'name' as keyof TestRow, header: 'Nome' },
    { key: 'email' as keyof TestRow, header: 'Email' },
    { key: 'score' as keyof TestRow, header: 'Score', format: (v: unknown) => `${v}%` },
  ];

  const testData: TestRow[] = [
    { name: 'John', email: 'john@test.com', score: 95 },
    { name: 'Jane', email: 'jane@test.com', score: 87 },
  ];

  it('initializes with isExporting=false', () => {
    const { result } = renderHook(() =>
      useExportData<TestRow>({ columns, fileName: 'test' })
    );
    expect(result.current.isExporting).toBe(false);
  });

  it('exposes exportToCSV function', () => {
    const { result } = renderHook(() =>
      useExportData<TestRow>({ columns, fileName: 'test' })
    );
    expect(typeof result.current.exportToCSV).toBe('function');
  });

  it('exposes exportToExcel function', () => {
    const { result } = renderHook(() =>
      useExportData<TestRow>({ columns, fileName: 'test' })
    );
    expect(typeof result.current.exportToExcel).toBe('function');
  });

  it('exposes exportToPDF function', () => {
    const { result } = renderHook(() =>
      useExportData<TestRow>({ columns, fileName: 'test' })
    );
    expect(typeof result.current.exportToPDF).toBe('function');
  });

  it('exportToCSV processes data', async () => {
    // Mock URL.createObjectURL
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    const { result } = renderHook(() =>
      useExportData<TestRow>({ columns, fileName: 'test' })
    );

    await act(async () => {
      await result.current.exportToCSV(testData);
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('handles empty data export', async () => {
    const { result } = renderHook(() =>
      useExportData<TestRow>({ columns, fileName: 'test' })
    );

    await act(async () => {
      await result.current.exportToCSV([]);
    });

    expect(result.current.isExporting).toBe(false);
  });

  it('column format function is applied', () => {
    const scoreCol = columns.find(c => c.key === 'score');
    expect(scoreCol?.format?.(95)).toBe('95%');
  });

  it('handles columns without format function', () => {
    const nameCol = columns.find(c => c.key === 'name');
    expect(nameCol?.format).toBeUndefined();
  });
});
