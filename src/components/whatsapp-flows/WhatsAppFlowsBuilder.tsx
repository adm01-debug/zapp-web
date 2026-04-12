import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Plus, Workflow, Trash2, Edit, Eye, X, Send,
  Type, ListChecks, CalendarDays, ToggleLeft, ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWhatsAppFlows } from '@/hooks/useWhatsAppFlows';
import { renderComponent } from './FlowComponentRenderer';

const COMPONENT_TYPES = [
  { type: 'TextHeading', label: 'Título', icon: Type },
  { type: 'TextBody', label: 'Texto', icon: Type },
  { type: 'TextInput', label: 'Campo de Texto', icon: Type },
  { type: 'TextArea', label: 'Área de Texto', icon: Type },
  { type: 'DatePicker', label: 'Data', icon: CalendarDays },
  { type: 'RadioButtonsGroup', label: 'Escolha Única', icon: ToggleLeft },
  { type: 'CheckboxGroup', label: 'Múltipla Escolha', icon: ListChecks },
  { type: 'Dropdown', label: 'Dropdown', icon: ChevronDown },
  { type: 'Footer', label: 'Botão de Ação', icon: Send },
] as const;

export function WhatsAppFlowsBuilder() {
  const f = useWhatsAppFlows();

  if (!f.selectedFlow) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader title="WhatsApp Flows" subtitle="Crie formulários e fluxos interativos nativos do WhatsApp"
          actions={<Button onClick={() => f.setShowCreateDialog(true)} className="gap-2"><Plus className="w-4 h-4" /> Novo Flow</Button>} />

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {f.flows.map((flow) => (
              <motion.div key={flow.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="bg-card/50 border-border/30 hover:border-secondary/30 transition-all cursor-pointer group"
                  onClick={() => { f.setSelectedFlow(flow); f.setEditingScreen(0); }}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center"><Workflow className="w-5 h-5 text-primary" /></div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); f.deleteFlow(flow.id); }}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{flow.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{flow.description || 'Sem descrição'}</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Badge variant="outline" className="text-[10px]">{flow.screens.length} telas</Badge>
                      <Badge variant={flow.status === 'published' ? 'default' : 'secondary'} className="text-[10px]">{flow.status === 'published' ? 'Publicado' : 'Rascunho'}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          {f.flows.length === 0 && !f.loading && (
            <div className="text-center py-16 text-muted-foreground">
              <Workflow className="w-12 h-12 mx-auto mb-3 opacity-20" /><p className="font-medium">Nenhum WhatsApp Flow</p><p className="text-sm">Crie formulários nativos para coletar dados no WhatsApp</p>
            </div>
          )}
        </div>

        <Dialog open={f.showCreateDialog} onOpenChange={f.setShowCreateDialog}>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo WhatsApp Flow</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={f.formName} onChange={(e) => f.setFormName(e.target.value)} placeholder="Ex: Cadastro de Lead" /></div>
              <div><Label>Descrição</Label><Textarea value={f.formDescription} onChange={(e) => f.setFormDescription(e.target.value)} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => f.setShowCreateDialog(false)}>Cancelar</Button>
              <Button onClick={f.createFlow}>Criar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const currentScreen = f.selectedFlow.screens[f.editingScreen];

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={f.selectedFlow.name} subtitle="Editor de WhatsApp Flow"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => f.setSelectedFlow(null)}>← Voltar</Button>
            <Button variant="outline" onClick={() => f.setPreviewMode(!f.previewMode)} className="gap-2">
              {f.previewMode ? <Edit className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {f.previewMode ? 'Editar' : 'Preview'}
            </Button>
            <Button onClick={f.addScreen} variant="outline" className="gap-2"><Plus className="w-4 h-4" /> Tela</Button>
          </div>
        } />

      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-4">
        <div className="w-48 flex-shrink-0 space-y-2 overflow-y-auto">
          {f.selectedFlow.screens.map((screen, idx) => (
            <button key={screen.id} onClick={() => f.setEditingScreen(idx)}
              className={cn("w-full text-left p-3 rounded-lg border transition-all text-sm",
                idx === f.editingScreen ? "border-secondary bg-secondary/10 text-secondary" : "border-border/30 bg-card/30 text-muted-foreground hover:border-border")}>
              <div className="font-medium">{screen.title}</div>
              <div className="text-[10px] mt-0.5">{screen.layout.length} componentes</div>
            </button>
          ))}
        </div>

        <div className="flex-1 flex gap-4">
          {!f.previewMode && (
            <div className="w-52 flex-shrink-0 space-y-1 overflow-y-auto">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">Componentes</p>
              {COMPONENT_TYPES.map(({ type, label, icon: Icon }) => (
                <button key={type} onClick={() => f.addComponent(type)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-sm hover:bg-muted/50 transition-colors text-foreground">
                  <Icon className="w-4 h-4 text-muted-foreground" />{label}
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 flex items-start justify-center">
            <div className="w-[320px] bg-card border border-border/30 rounded-[2rem] p-2 shadow-xl">
              <div className="bg-background rounded-[1.5rem] overflow-hidden">
                <div className="h-8 bg-primary/10 flex items-center justify-center">
                  <span className="text-[10px] text-muted-foreground font-medium">{currentScreen?.title}</span>
                </div>
                <div className="p-4 space-y-3 min-h-[400px]">
                  {currentScreen?.layout.map((comp, idx) => (
                    <div key={comp.id} className="group relative">
                      {!f.previewMode && (
                        <button onClick={() => f.removeComponent(idx)}
                          className="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                          <X className="w-3 h-3" />
                        </button>
                      )}
                      {renderComponent(comp, f.previewMode)}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
