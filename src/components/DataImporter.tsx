/**
 * Componente de Importação de Dados
 * 
 * @module components/DataImporter
 */

import { useCallback } from 'react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Download,
  Loader2,
} from 'lucide-react';
import { useImportData } from '@/hooks/useImportData';

interface DataImporterProps<T> {
  schema: z.ZodSchema<T>;
  onImport: (data: T[]) => Promise<void>;
  templateUrl?: string;
  entityName: string;
  trigger?: React.ReactNode;
}

export function DataImporter<T>({
  schema,
  onImport,
  templateUrl,
  entityName,
  trigger,
}: DataImporterProps<T>) {
  const {
    status,
    progress,
    result,
    processFile,
    confirmImport,
    reset,
    isProcessing,
  } = useImportData({ schema, onImport });

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
      // Reset input para permitir mesmo arquivo
      e.target.value = '';
    },
    [processFile]
  );

  return (
    <Dialog onOpenChange={(open) => !open && reset()}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Importar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar {entityName}</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV ou Excel para importar dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Upload Area */}
          <div className="flex gap-2">
            <label className="flex-1">
              <Input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="cursor-pointer file:mr-4 file:rounded-md file:border-0 file:bg-primary file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
              />
            </label>
            {templateUrl && (
              <Button variant="outline" asChild>
                <a href={templateUrl} download>
                  <Download className="mr-2 h-4 w-4" />
                  Template
                </a>
              </Button>
            )}
          </div>

          {/* Progress */}
          {isProcessing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {status === 'parsing' && 'Lendo arquivo...'}
                {status === 'validating' && 'Validando dados...'}
                {status === 'importing' && 'Importando...'}
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {result && (
            <>
              <Alert variant={result.errors.length > 0 ? 'destructive' : 'default'}>
                {result.errors.length === 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertTitle>
                  {result.success.length} de {result.total} registros válidos
                </AlertTitle>
                <AlertDescription>
                  {result.errors.length > 0
                    ? `${result.errors.length} erro(s) encontrado(s). Corrija-os para importar todos os dados.`
                    : 'Todos os registros estão prontos para importação.'}
                </AlertDescription>
              </Alert>

              {/* Error Table */}
              {result.errors.length > 0 && (
                <div className="max-h-48 overflow-y-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Linha</TableHead>
                        <TableHead>Campo</TableHead>
                        <TableHead>Erro</TableHead>
                        <TableHead>Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.slice(0, 20).map((error, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium">{error.row}</TableCell>
                          <TableCell>{error.field}</TableCell>
                          <TableCell className="text-destructive">{error.message}</TableCell>
                          <TableCell className="truncate max-w-[100px]">
                            {String(error.value ?? '-')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {result.errors.length > 20 && (
                    <div className="p-2 text-center text-sm text-muted-foreground">
                      + {result.errors.length - 20} erros adicionais
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={reset}>
            Cancelar
          </Button>
          {result && result.success.length > 0 && (
            <Button
              onClick={confirmImport}
              disabled={isProcessing}
              className="gap-2"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="h-4 w-4" />
              )}
              Importar {result.success.length} Registro(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DataImporter;
