/**
 * Hook de Exportação - BLOQUEADO por política de segurança.
 * Todas as exportações de dados estão desabilitadas para proteção de dados de clientes/fornecedores.
 */

import { useCallback } from 'react';
import { toast } from 'sonner';

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

const BLOCKED_MSG = 'Exportação bloqueada por política de segurança';

export function useExportData<T extends Record<string, unknown>>(
  _options: UseExportDataOptions<T>
) {
  const blocked = useCallback(() => {
    toast.error('🔒 ' + BLOCKED_MSG, {
      description: 'A exportação de dados está desabilitada para proteção dos dados de clientes e fornecedores.',
    });
  }, []);

  const exportData = useCallback(async () => { blocked(); }, [blocked]);

  return {
    exportData,
    exportCSV: blocked,
    exportExcel: blocked,
    exportPDF: blocked,
    isExporting: false,
  };
}

export default useExportData;
