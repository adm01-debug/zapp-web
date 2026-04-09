import { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Merge, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  surname?: string | null;
  phone: string;
  email?: string | null;
  company?: string | null;
  job_title?: string | null;
  contact_type?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  created_at: string;
}

interface ContactMergeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  onMergeComplete: () => void;
}

const FIELDS = [
  { key: 'name', label: 'Nome' },
  { key: 'surname', label: 'Sobrenome' },
  { key: 'phone', label: 'Telefone' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Empresa' },
  { key: 'job_title', label: 'Cargo' },
  { key: 'contact_type', label: 'Tipo' },
  { key: 'notes', label: 'Notas' },
] as const;

export function ContactMergeDialog({ open, onOpenChange, contacts, onMergeComplete }: ContactMergeDialogProps) {
  const [selections, setSelections] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    FIELDS.forEach(f => {
      // Prefer the one with data
      const idx = contacts.findIndex(c => (c as Record<string, unknown>)[f.key]);
      init[f.key] = idx >= 0 ? idx : 0;
    });
    return init;
  });
  const [merging, setMerging] = useState(false);

  if (contacts.length < 2) return null;

  const handleMerge = async () => {
    setMerging(true);
    try {
      const primary = contacts[0];
      const merged: Record<string, unknown> = {};

      FIELDS.forEach(f => {
        const source = contacts[selections[f.key]];
        const val = (source as Record<string, unknown>)[f.key];
        if (val) merged[f.key] = val;
      });

      // Merge tags from all contacts
      const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];
      merged.tags = allTags;

      // Update primary contact
      const { error: updateErr } = await supabase
        .from('contacts')
        .update(merged)
        .eq('id', primary.id);

      if (updateErr) throw updateErr;

      // Reassign messages from secondary contacts to primary
      for (let i = 1; i < contacts.length; i++) {
        await supabase
          .from('messages')
          .update({ contact_id: primary.id })
          .eq('contact_id', contacts[i].id);

        // Delete secondary contact
        await supabase.from('contacts').delete().eq('id', contacts[i].id);
      }

      toast.success(`Contatos mesclados em "${merged.name}"`);
      onMergeComplete();
      onOpenChange(false);
    } catch (err) {
      toast.error('Erro ao mesclar contatos');
    } finally {
      setMerging(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Merge className="w-5 h-5 text-primary" />
            Mesclar Contatos
          </DialogTitle>
          <DialogDescription>
            Escolha qual valor manter para cada campo. O primeiro contato será o principal.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive">
            Mensagens dos contatos secundários serão movidas para o contato principal. Esta ação é irreversível.
          </p>
        </div>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {FIELDS.map(field => {
            const values = contacts.map((c, i) => ({
              index: i,
              value: (c as Record<string, unknown>)[field.key] as string | null,
            })).filter(v => v.value);

            if (values.length <= 1) return null;

            return (
              <div key={field.key} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{field.label}</p>
                <RadioGroup
                  value={String(selections[field.key])}
                  onValueChange={v => setSelections(s => ({ ...s, [field.key]: parseInt(v) }))}
                  className="flex flex-col gap-1"
                >
                  {values.map(v => (
                    <Label
                      key={v.index}
                      htmlFor={`${field.key}-${v.index}`}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors',
                        selections[field.key] === v.index
                          ? 'border-primary/50 bg-primary/5'
                          : 'border-transparent hover:bg-muted/50'
                      )}
                    >
                      <RadioGroupItem value={String(v.index)} id={`${field.key}-${v.index}`} />
                      <span className="text-sm">{v.value}</span>
                      {v.index === 0 && <Badge variant="secondary" className="text-[10px] h-4">principal</Badge>}
                    </Label>
                  ))}
                </RadioGroup>
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleMerge} disabled={merging} className="gap-2">
            {merging ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Mesclar {contacts.length} contatos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
