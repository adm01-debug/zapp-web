import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { log } from '@/lib/logger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  FileSpreadsheet,
  File,
  Calendar as CalendarIcon,
  Download,
  Loader2,
  ChevronRight,
  Check,
  Settings2,
} from 'lucide-react';
import { format as formatDate, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { exportToPDF, exportToExcel, exportToCSV, ReportData } from '@/utils/exportReport';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ColumnConfig {
  key: string;
  header: string;
  width?: number;
  selected: boolean;
}

export interface AdvancedExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  columns: ColumnConfig[];
  getData: (options: ExportOptions) => Promise<Record<string, any>[]> | Record<string, any>[];
  summary?: { label: string; value: string | number }[];
}

export interface ExportOptions {
  format: ExportFormat;
  dateRange: {
    from: Date;
    to: Date;
  };
  selectedColumns: string[];
  includeSummary: boolean;
}

const FORMAT_OPTIONS = [
  { 
    value: 'pdf' as ExportFormat, 
    label: 'PDF', 
    icon: FileText, 
    color: 'text-red-500',
    description: 'Ideal para impressão e compartilhamento' 
  },
  { 
    value: 'excel' as ExportFormat, 
    label: 'Excel', 
    icon: FileSpreadsheet, 
    color: 'text-green-500',
    description: 'Planilha com formatação completa' 
  },
  { 
    value: 'csv' as ExportFormat, 
    label: 'CSV', 
    icon: File, 
    color: 'text-blue-500',
    description: 'Dados simples para importação' 
  },
];

const DATE_PRESETS = [
  { label: 'Hoje', getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: 'Últimos 7 dias', getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }) },
  { label: 'Últimos 30 dias', getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }) },
  { label: 'Este mês', getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
];

export function AdvancedExportDialog({
  open,
  onOpenChange,
  title,
  columns: initialColumns,
  getData,
  summary,
}: AdvancedExportDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [columns, setColumns] = useState<ColumnConfig[]>(initialColumns);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [includeSummary, setIncludeSummary] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const selectedColumns = columns.filter(c => c.selected);

  const toggleColumn = (key: string) => {
    setColumns(prev => 
      prev.map(col => 
        col.key === key ? { ...col, selected: !col.selected } : col
      )
    );
  };

  const selectAllColumns = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: true })));
  };

  const deselectAllColumns = () => {
    setColumns(prev => prev.map(col => ({ ...col, selected: false })));
  };

  const handleExport = async () => {
    if (selectedColumns.length === 0) {
      toast({
        title: 'Selecione ao menos uma coluna',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        format,
        dateRange,
        selectedColumns: selectedColumns.map(c => c.key),
        includeSummary,
      };

      const rows = await getData(options);

      const reportData: ReportData = {
        title,
        subtitle: `Período: ${dateRange.from.toLocaleDateString('pt-BR')} - ${dateRange.to.toLocaleDateString('pt-BR')}`,
        generatedAt: new Date(),
        columns: selectedColumns.map(c => ({
          header: c.header,
          key: c.key,
          width: c.width,
        })),
        rows,
        summary: includeSummary ? summary : undefined,
      };

      switch (format) {
        case 'pdf':
          exportToPDF(reportData);
          break;
        case 'excel':
          exportToExcel(reportData);
          break;
        case 'csv':
          exportToCSV(reportData);
          break;
      }

      toast({
        title: 'Exportação concluída!',
        description: `Arquivo ${format.toUpperCase()} gerado com sucesso.`,
      });

      onOpenChange(false);
      setStep(1);
    } catch (error) {
      log.error('Export error:', error);
      toast({
        title: 'Erro na exportação',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Settings2 className="w-4 h-4" />
              <span>Escolha o formato de exportação</span>
            </div>

            <RadioGroup value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
              <div className="grid gap-3">
                {FORMAT_OPTIONS.map((option) => (
                  <motion.div
                    key={option.value}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <Label
                      htmlFor={option.value}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all",
                        format === option.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <option.icon className={cn("w-6 h-6", option.color)} />
                      <div className="flex-1">
                        <span className="font-medium">{option.label}</span>
                        <p className="text-xs text-muted-foreground">{option.description}</p>
                      </div>
                      {format === option.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                        >
                          <Check className="w-5 h-5 text-primary" />
                        </motion.div>
                      )}
                    </Label>
                  </motion.div>
                ))}
              </div>
            </RadioGroup>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <CalendarIcon className="w-4 h-4" />
              <span>Selecione o período dos dados</span>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {DATE_PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => setDateRange(preset.getValue())}
                  className="text-xs"
                >
                  {preset.label}
                </Button>
              ))}
            </div>

            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full justify-start gap-2"
                >
                  <CalendarIcon className="w-4 h-4" />
                  <span>
                    {formatDate(dateRange.from, 'dd/MM/yyyy', { locale: ptBR })} - {formatDate(dateRange.to, 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) => {
                    if (range?.from && range?.to) {
                      setDateRange({ from: range.from, to: range.to });
                      setCalendarOpen(false);
                    } else if (range?.from) {
                      setDateRange(prev => ({ ...prev, from: range.from! }));
                    }
                  }}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>

            {summary && summary.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="include-summary"
                    checked={includeSummary}
                    onCheckedChange={(checked) => setIncludeSummary(!!checked)}
                  />
                  <Label htmlFor="include-summary" className="text-sm cursor-pointer">
                    Incluir resumo estatístico
                  </Label>
                </div>
              </>
            )}
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>Selecione as colunas</span>
              </div>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={selectAllColumns}>
                  Todas
                </Button>
                <Button variant="ghost" size="sm" onClick={deselectAllColumns}>
                  Nenhuma
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[240px] rounded-lg border">
              <div className="p-4 space-y-2">
                {columns.map((column) => (
                  <motion.div
                    key={column.key}
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors cursor-pointer",
                      column.selected ? "bg-primary/5" : "hover:bg-muted/50"
                    )}
                    onClick={() => toggleColumn(column.key)}
                  >
                    <Checkbox checked={column.selected} />
                    <span className="text-sm">{column.header}</span>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {selectedColumns.length} de {columns.length} colunas selecionadas
              </span>
              <Badge variant="secondary">
                Formato: {format.toUpperCase()}
              </Badge>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Relatório
          </DialogTitle>
          <DialogDescription>
            {title}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 py-2">
          {[1, 2, 3].map((s) => (
            <motion.div
              key={s}
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                step >= s 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              )}
              animate={{ scale: step === s ? 1.1 : 1 }}
            >
              {step > s ? <Check className="w-4 h-4" /> : s}
            </motion.div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {renderStep()}
        </AnimatePresence>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          {step > 1 && (
            <Button 
              variant="outline" 
              onClick={() => setStep((s) => (s - 1) as 1 | 2 | 3)}
              disabled={isExporting}
            >
              Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 3 ? (
            <Button onClick={() => setStep((s) => (s + 1) as 1 | 2 | 3)}>
              Próximo
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button 
              onClick={handleExport}
              disabled={isExporting || selectedColumns.length === 0}
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
