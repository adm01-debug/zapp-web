import { useState } from 'react';
import { log } from '@/lib/logger';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, File, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { exportToPDF, exportToExcel, exportToCSV, ReportData } from '@/utils/exportReport';

interface ExportButtonProps {
  getData: () => Promise<ReportData> | ReportData;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export const ExportButton = ({ 
  getData, 
  disabled = false,
  variant = 'outline',
  size = 'default',
  className 
}: ExportButtonProps) => {
  const [exporting, setExporting] = useState<'pdf' | 'excel' | 'csv' | null>(null);

  const handleExport = async (format: 'pdf' | 'excel' | 'csv') => {
    setExporting(format);
    try {
      const data = await getData();
      
      switch (format) {
        case 'pdf':
          exportToPDF(data);
          toast({
            title: 'PDF Exportado',
            description: 'O relatório foi exportado com sucesso.',
          });
          break;
        case 'excel':
          exportToExcel(data);
          toast({
            title: 'Excel Exportado',
            description: 'O relatório foi exportado com sucesso.',
          });
          break;
        case 'csv':
          exportToCSV(data);
          toast({
            title: 'CSV Exportado',
            description: 'O relatório foi exportado com sucesso.',
          });
          break;
      }
    } catch (error) {
      log.error('Export error:', error);
      toast({
        title: 'Erro na Exportação',
        description: 'Não foi possível exportar o relatório.',
        variant: 'destructive',
      });
    } finally {
      setExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant} 
          size={size} 
          disabled={disabled || exporting !== null}
          className={className}
        >
          {exporting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={() => handleExport('pdf')}
          disabled={exporting !== null}
        >
          <FileText className="h-4 w-4 mr-2 text-red-500" />
          Exportar PDF
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('excel')}
          disabled={exporting !== null}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
          Exportar Excel
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => handleExport('csv')}
          disabled={exporting !== null}
        >
          <File className="h-4 w-4 mr-2 text-blue-500" />
          Exportar CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
