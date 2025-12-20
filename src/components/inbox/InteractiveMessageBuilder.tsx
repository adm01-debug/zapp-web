import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Trash2, ExternalLink, Phone, MessageSquare, 
  GripVertical, X, Check, List, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InteractiveMessage, InteractiveButton } from '@/types/chat';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface InteractiveMessageBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSend: (interactive: InteractiveMessage) => void;
}

export function InteractiveMessageBuilder({
  open,
  onOpenChange,
  onSend,
}: InteractiveMessageBuilderProps) {
  const [messageType, setMessageType] = useState<'buttons' | 'list'>('buttons');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [headerText, setHeaderText] = useState('');
  const [buttons, setButtons] = useState<InteractiveButton[]>([]);
  const [listButtonText, setListButtonText] = useState('Ver opções');

  const resetForm = () => {
    setMessageType('buttons');
    setBody('');
    setFooter('');
    setHeaderText('');
    setButtons([]);
    setListButtonText('Ver opções');
  };

  const addButton = (type: InteractiveButton['type']) => {
    if (buttons.length >= 3) {
      toast({
        title: 'Limite atingido',
        description: 'Máximo de 3 botões por mensagem (limite WhatsApp)',
        variant: 'destructive',
      });
      return;
    }

    const newButton: InteractiveButton = {
      type,
      id: `btn_${Date.now()}`,
      title: '',
      ...(type === 'url' && { url: '' }),
      ...(type === 'phone' && { phoneNumber: '' }),
    };
    setButtons([...buttons, newButton]);
  };

  const updateButton = (index: number, updates: Partial<InteractiveButton>) => {
    const updated = [...buttons];
    updated[index] = { ...updated[index], ...updates };
    setButtons(updated);
  };

  const removeButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleSend = () => {
    if (!body.trim()) {
      toast({
        title: 'Corpo obrigatório',
        description: 'Digite o texto da mensagem',
        variant: 'destructive',
      });
      return;
    }

    if (messageType === 'buttons' && buttons.length === 0) {
      toast({
        title: 'Adicione botões',
        description: 'Adicione pelo menos um botão à mensagem',
        variant: 'destructive',
      });
      return;
    }

    // Validate buttons
    for (const button of buttons) {
      if (!button.title.trim()) {
        toast({
          title: 'Título obrigatório',
          description: 'Todos os botões precisam ter um título',
          variant: 'destructive',
        });
        return;
      }
      if (button.title.length > 20) {
        toast({
          title: 'Título muito longo',
          description: 'O título do botão deve ter no máximo 20 caracteres',
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'url' && !button.url) {
        toast({
          title: 'URL obrigatória',
          description: 'Botões de URL precisam ter um link',
          variant: 'destructive',
        });
        return;
      }
      if (button.type === 'phone' && !button.phoneNumber) {
        toast({
          title: 'Telefone obrigatório',
          description: 'Botões de telefone precisam ter um número',
          variant: 'destructive',
        });
        return;
      }
    }

    const interactive: InteractiveMessage = {
      type: messageType,
      body: body.trim(),
      ...(headerText && { header: { type: 'text', text: headerText } }),
      ...(footer && { footer }),
      ...(messageType === 'buttons' && { buttons }),
      ...(messageType === 'list' && { listButtonText }),
    };

    onSend(interactive);
    resetForm();
    onOpenChange(false);
  };

  const getButtonTypeIcon = (type: InteractiveButton['type']) => {
    switch (type) {
      case 'reply':
        return <MessageSquare className="w-4 h-4" />;
      case 'url':
        return <ExternalLink className="w-4 h-4" />;
      case 'phone':
        return <Phone className="w-4 h-4" />;
    }
  };

  const getButtonTypeLabel = (type: InteractiveButton['type']) => {
    switch (type) {
      case 'reply':
        return 'Resposta Rápida';
      case 'url':
        return 'Abrir URL';
      case 'phone':
        return 'Ligar';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Mensagem Interativa
          </DialogTitle>
          <DialogDescription>
            Crie mensagens com botões de ação seguindo o padrão WhatsApp Business
          </DialogDescription>
        </DialogHeader>

        <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'buttons' | 'list')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="buttons" className="gap-2">
              <MessageSquare className="w-4 h-4" />
              Botões
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="w-4 h-4" />
              Lista
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 mt-4">
            {/* Header (optional) */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Cabeçalho (opcional)</Label>
              <Input
                placeholder="Título da mensagem..."
                value={headerText}
                onChange={(e) => setHeaderText(e.target.value)}
                maxLength={60}
              />
              <p className="text-[10px] text-muted-foreground text-right">{headerText.length}/60</p>
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label>Mensagem *</Label>
              <Textarea
                placeholder="Digite o corpo da mensagem..."
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={1024}
                rows={3}
              />
              <p className="text-[10px] text-muted-foreground text-right">{body.length}/1024</p>
            </div>

            {/* Footer (optional) */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Rodapé (opcional)</Label>
              <Input
                placeholder="Texto do rodapé..."
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                maxLength={60}
              />
              <p className="text-[10px] text-muted-foreground text-right">{footer.length}/60</p>
            </div>

            <TabsContent value="buttons" className="mt-0 space-y-4">
              {/* Button Type Selector */}
              <div className="space-y-2">
                <Label>Adicionar Botão</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addButton('reply')}
                    disabled={buttons.length >= 3}
                    className="flex-1 gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Resposta
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addButton('url')}
                    disabled={buttons.length >= 3}
                    className="flex-1 gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    URL
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addButton('phone')}
                    disabled={buttons.length >= 3}
                    className="flex-1 gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Telefone
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {buttons.length}/3 botões (limite WhatsApp)
                </p>
              </div>

              {/* Buttons List */}
              <AnimatePresence mode="popLayout">
                {buttons.map((button, index) => (
                  <motion.div
                    key={button.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-lg border border-border bg-muted/30 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-muted-foreground" />
                        <Badge variant="secondary" className="gap-1">
                          {getButtonTypeIcon(button.type)}
                          {getButtonTypeLabel(button.type)}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeButton(index)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <Input
                        placeholder="Título do botão (máx. 20 caracteres)"
                        value={button.title}
                        onChange={(e) => updateButton(index, { title: e.target.value })}
                        maxLength={20}
                      />

                      {button.type === 'url' && (
                        <Input
                          placeholder="https://exemplo.com"
                          value={button.url || ''}
                          onChange={(e) => updateButton(index, { url: e.target.value })}
                          type="url"
                        />
                      )}

                      {button.type === 'phone' && (
                        <Input
                          placeholder="+55 11 99999-0000"
                          value={button.phoneNumber || ''}
                          onChange={(e) => updateButton(index, { phoneNumber: e.target.value })}
                          type="tel"
                        />
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {buttons.length === 0 && (
                <div className="text-center py-6 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Adicione botões clicando acima</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="list" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>Texto do Botão de Lista</Label>
                <Input
                  placeholder="Ver opções"
                  value={listButtonText}
                  onChange={(e) => setListButtonText(e.target.value)}
                  maxLength={20}
                />
                <p className="text-[10px] text-muted-foreground">
                  Este botão abrirá a lista de opções para o usuário
                </p>
              </div>

              <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  ⚠️ Listas interativas requerem configuração adicional de seções. 
                  Use botões de resposta rápida para a maioria dos casos.
                </p>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        {/* Preview */}
        {(body || buttons.length > 0) && (
          <div className="mt-4 p-4 rounded-lg bg-muted/50 border border-border">
            <p className="text-xs text-muted-foreground mb-2">Prévia da mensagem:</p>
            <div className="p-3 rounded-xl bg-primary text-primary-foreground max-w-[280px]">
              {headerText && (
                <p className="font-semibold text-sm mb-1">{headerText}</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{body || 'Mensagem...'}</p>
              {footer && (
                <p className="text-xs opacity-70 mt-1">{footer}</p>
              )}
              {buttons.length > 0 && (
                <div className="flex flex-col gap-1 mt-2 pt-2 border-t border-primary-foreground/20">
                  {buttons.map((btn) => (
                    <div 
                      key={btn.id} 
                      className="flex items-center justify-center gap-1 px-3 py-1.5 rounded-md bg-primary-foreground/20 text-xs"
                    >
                      {getButtonTypeIcon(btn.type)}
                      <span>{btn.title || 'Botão'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSend} className="gap-2">
            <Check className="w-4 h-4" />
            Enviar Mensagem
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
