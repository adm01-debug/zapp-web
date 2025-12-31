/**
 * Componente de Dropdown para Exportação
 * 
 * @module components/ExportDropdown
 */

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { ExportFormat } from '@/hooks/useExportData';

interface ExportDropdownProps {
  onExport: (format: ExportFormat) => void;
  isExporting?: boolean;
  formats?: ExportFormat[];
  disabled?: boolean;
  itemCount?: number;
}

export function ExportDropdown({
  onExport,
  isExporting = false,
  formats = ['csv', 'xlsx', 'pdf'],
  disabled = false,
  itemCount,
}: ExportDropdownProps) {
  const formatConfig = {
    csv: {
      label: 'CSV',
      icon: FileText,
      description: 'Planilha simples',
    },
    xlsx: {
      label: 'Excel',
      icon: FileSpreadsheet,
      description: 'Microsoft Excel',
    },
    pdf: {
      label: 'PDF',
      icon: FileText,
      description: 'Documento PDF',
    },
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={disabled || isExporting}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          <span className="hidden sm:inline">Exportar</span>
          {itemCount !== undefined && itemCount > 0 && (
            <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
              {itemCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {formats.map((format, index) => {
          const config = formatConfig[format];
          const Icon = config.icon;
          return (
            <div key={format}>
              {index > 0 && <DropdownMenuSeparator />}
              <DropdownMenuItem
                onClick={() => onExport(format)}
                className="flex items-center gap-3"
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">{config.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {config.description}
                  </div>
                </div>
              </DropdownMenuItem>
            </div>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default ExportDropdown;
