/**
 * AdvancedExportDialog - BLOQUEADO por política de segurança.
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShieldAlert } from 'lucide-react';
import { ReportData } from '@/utils/exportReport';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ColumnConfig {
  key: string;
  header: string;
  width?: number;
  selected: boolean;
}

interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: ColumnConfig[];
  getData: (params: { columns: ColumnConfig[]; dateRange: { from: Date; to: Date } }) => Promise<ReportData> | ReportData;
  summary?: { label: string; value: string | number }[];
}

export function AdvancedExportDialog({ open, onOpenChange }: AdvancedExportDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Exportação Bloqueada
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <ShieldAlert className="w-16 h-16 text-destructive/30 mb-4" />
          <p className="text-sm font-medium text-foreground">Funcionalidade Desabilitada</p>
          <p className="text-xs text-muted-foreground mt-2 max-w-sm">
            A exportação de dados está bloqueada por política de segurança para proteção dos dados de clientes e fornecedores (LGPD).
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
