/**
 * ExportDropdown - BLOQUEADO por política de segurança.
 * Exportação de dados desabilitada para proteção de dados.
 */

import { Button } from '@/components/ui/button';
import { ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ExportDropdownProps {
  onExport?: (format: string) => void;
  isExporting?: boolean;
  formats?: string[];
  disabled?: boolean;
  itemCount?: number;
}

export function ExportDropdown(_props: ExportDropdownProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 opacity-50 cursor-not-allowed"
          disabled
          onClick={() => toast.error('🔒 Exportação bloqueada por política de segurança')}
        >
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <span className="hidden sm:inline">Exportação Bloqueada</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Exportação desabilitada para proteção de dados</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default ExportDropdown;
