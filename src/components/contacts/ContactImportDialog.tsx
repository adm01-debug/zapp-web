import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ContactImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
}

interface ParsedRow {
  [key: string]: string;
}

interface ImportPreview {
  headers: string[];
  rows: ParsedRow[];
  mapping: Record<string, string>;
  errors: string[];
  duplicates: number[];
}

const FIELD_OPTIONS = [
  { value: '_skip', label: '⏭ Ignorar' },
  { value: 'name', label: 'Nome' },
  { value: 'surname', label: 'Sobrenome' },
  { value: 'nickname', label: 'Apelido' },
  { value: 'phone', label: 'Telefone *' },
  { value: 'email', label: 'Email' },
  { value: 'company', label: 'Empresa' },
  { value: 'job_title', label: 'Cargo' },
  { value: 'contact_type', label: 'Tipo' },
  { value: 'notes', label: 'Notas' },
];

const AUTO_MAP: Record<string, string> = {
  nome: 'name', name: 'name', 'primeiro nome': 'name', 'first name': 'name',
  sobrenome: 'surname', 'last name': 'surname', surname: 'surname',
  apelido: 'nickname', nickname: 'nickname',
  telefone: 'phone', phone: 'phone', celular: 'phone', whatsapp: 'phone', tel: 'phone',
  email: 'email', 'e-mail': 'email',
  empresa: 'company', company: 'company', companhia: 'company',
  cargo: 'job_title', 'job title': 'job_title', função: 'job_title',
  tipo: 'contact_type', type: 'contact_type',
  notas: 'notes', notes: 'notes', observações: 'notes',
};

function parseCSV(text: string): { headers: string[]; rows: ParsedRow[] } {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if ((ch === ',' || ch === ';') && !inQuotes) {
        result.push(current.trim()); current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseLine(line);
    const row: ParsedRow = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });

  return { headers, rows };
}

export function ContactImportDialog({ open, onOpenChange, onImportComplete }: ContactImportDialogProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'importing' | 'done'>('upload');
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('upload');
    setPreview(null);
    setImportResult(null);
  };

  const handleFile = useCallback(async (file: File) => {
    const text = await file.text();
    const { headers, rows } = parseCSV(text.replace(/^\uFEFF/, ''));

    if (headers.length === 0 || rows.length === 0) {
      toast.error('Arquivo vazio ou formato inválido');
      return;
    }

    // Auto-map columns
    const mapping: Record<string, string> = {};
    headers.forEach(h => {
      const key = h.toLowerCase().trim();
      mapping[h] = AUTO_MAP[key] || '_skip';
    });

    // Check duplicates by phone
    const phoneCol = Object.entries(mapping).find(([, v]) => v === 'phone')?.[0];
    let duplicates: number[] = [];
    if (phoneCol) {
      const phones = rows.map(r => r[phoneCol]?.replace(/\D/g, ''));
      const { data: existing } = await supabase
        .from('contacts')
        .select('phone')
        .in('phone', phones.filter(Boolean));
      const existingSet = new Set((existing || []).map(e => e.phone.replace(/\D/g, '')));
      duplicates = rows.map((r, i) => existingSet.has(r[phoneCol]?.replace(/\D/g, '')) ? i : -1).filter(i => i >= 0);
    }

    const errors: string[] = [];
    if (!Object.values(mapping).includes('phone')) errors.push('Coluna de telefone não detectada — mapeie manualmente');
    if (!Object.values(mapping).includes('name')) errors.push('Coluna de nome não detectada — mapeie manualmente');

    setPreview({ headers, rows, mapping, errors, duplicates });
    setStep('preview');
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) handleFile(file);
    else toast.error('Apenas arquivos CSV são aceitos');
  }, [handleFile]);

  const updateMapping = (header: string, value: string) => {
    if (!preview) return;
    setPreview({ ...preview, mapping: { ...preview.mapping, [header]: value } });
  };

  const handleImport = async () => {
    if (!preview) return;
    const { mapping, rows } = preview;

    const phoneCol = Object.entries(mapping).find(([, v]) => v === 'phone')?.[0];
    const nameCol = Object.entries(mapping).find(([, v]) => v === 'name')?.[0];

    if (!phoneCol || !nameCol) {
      toast.error('Mapeie pelo menos Nome e Telefone');
      return;
    }

    setStep('importing');
    let success = 0, failed = 0;

    // Filter out duplicates
    const rowsToImport = rows.filter((_, i) => !preview.duplicates.includes(i));

    for (const row of rowsToImport) {
      const contact: Record<string, string> = {};
      Object.entries(mapping).forEach(([header, field]) => {
        if (field !== '_skip' && row[header]) {
          contact[field] = row[header];
        }
      });

      if (!contact.phone || !contact.name) { failed++; continue; }

      const { error } = await supabase.from('contacts').insert({
        name: contact.name,
        phone: contact.phone.replace(/\D/g, ''),
        surname: contact.surname || null,
        nickname: contact.nickname || null,
        email: contact.email || null,
        company: contact.company || null,
        job_title: contact.job_title || null,
        contact_type: contact.contact_type || 'cliente',
        notes: contact.notes || null,
      });

      if (error) failed++; else success++;
    }

    setImportResult({ success, failed });
    setStep('done');
    if (success > 0) onImportComplete();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-primary" />
            Importar Contatos
          </DialogTitle>
          <DialogDescription>
            {step === 'upload' && 'Envie um arquivo CSV com seus contatos'}
            {step === 'preview' && 'Revise o mapeamento de colunas e confirme'}
            {step === 'importing' && 'Importando contatos...'}
            {step === 'done' && 'Importação concluída'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1"
            >
              <div
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-muted-foreground/30 rounded-xl p-12 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-sm font-medium text-foreground mb-1">
                  Arraste um arquivo CSV ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground">
                  Suporta CSV com separador vírgula ou ponto-e-vírgula
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </motion.div>
          )}

          {step === 'preview' && preview && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col gap-4 overflow-hidden"
            >
              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                  <div className="text-xs text-destructive">
                    {preview.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="secondary">{preview.rows.length} linhas</Badge>
                <Badge variant="secondary">{preview.headers.length} colunas</Badge>
                {preview.duplicates.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {preview.duplicates.length} duplicados (serão ignorados)
                  </Badge>
                )}
              </div>

              {/* Column Mapping */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Mapeamento de Colunas</p>
                <div className="grid grid-cols-2 gap-2">
                  {preview.headers.map(h => (
                    <div key={h} className="flex items-center gap-2">
                      <span className="text-xs truncate w-24 text-muted-foreground" title={h}>{h}</span>
                      <span className="text-muted-foreground">→</span>
                      <Select value={preview.mapping[h]} onValueChange={v => updateMapping(h, v)}>
                        <SelectTrigger className="h-7 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_OPTIONS.map(o => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data Preview */}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-medium text-muted-foreground mb-2">Pré-visualização (5 primeiros)</p>
                <ScrollArea className="h-40 rounded-lg border">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left font-medium w-8">#</th>
                        {preview.headers.filter(h => preview.mapping[h] !== '_skip').map(h => (
                          <th key={h} className="p-2 text-left font-medium">{preview.mapping[h]}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 5).map((row, i) => (
                        <tr key={i} className={cn(
                          'border-b',
                          preview.duplicates.includes(i) && 'bg-destructive/5 line-through opacity-50'
                        )}>
                          <td className="p-2 text-muted-foreground">{i + 1}</td>
                          {preview.headers.filter(h => preview.mapping[h] !== '_skip').map(h => (
                            <td key={h} className="p-2 truncate max-w-[120px]">{row[h]}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={reset}>Voltar</Button>
                <Button onClick={handleImport} className="gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Importar {preview.rows.length - preview.duplicates.length} contatos
                </Button>
              </DialogFooter>
            </motion.div>
          )}

          {step === 'importing' && (
            <motion.div
              key="importing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
              <p className="text-sm font-medium">Importando contatos...</p>
              <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos</p>
            </motion.div>
          )}

          {step === 'done' && importResult && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 gap-4"
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="text-lg font-bold">{importResult.success} contatos importados</p>
                {importResult.failed > 0 && (
                  <p className="text-sm text-destructive">{importResult.failed} falharam</p>
                )}
              </div>
              <Button onClick={() => { reset(); onOpenChange(false); }}>Fechar</Button>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
