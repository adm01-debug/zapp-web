import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Save, Users, Wand2, Eye, Clock, MessageSquare, Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTalkX, TalkXCampaign } from '@/hooks/useTalkX';
import { TalkXRecipientsList } from './TalkXRecipientsList';

interface Props {
  campaign: TalkXCampaign | null;
  onClose: () => void;
}

const VARIABLES = [
  { key: '{{nome}}', label: 'Primeiro Nome', desc: 'Ex: João' },
  { key: '{{nome_completo}}', label: 'Nome Completo', desc: 'Ex: João Silva' },
  { key: '{{apelido}}', label: 'Apelido', desc: 'Usa apelido ou primeiro nome' },
  { key: '{{empresa}}', label: 'Empresa', desc: 'Ex: Acme Ltda' },
  { key: '{{saudacao}}', label: 'Saudação', desc: 'Bom dia / Boa tarde / Boa noite' },
];

export function TalkXCampaignEditor({ campaign, onClose }: Props) {
  const { createCampaign, updateCampaign, addRecipients } = useTalkX();

  const [name, setName] = useState(campaign?.name || '');
  const [messageTemplate, setMessageTemplate] = useState(campaign?.message_template || '');
  const [typingDelay, setTypingDelay] = useState([
    (campaign?.typing_delay_min || 1500) / 1000,
    (campaign?.typing_delay_max || 4000) / 1000,
  ]);
  const [sendInterval, setSendInterval] = useState([
    (campaign?.send_interval_min || 5000) / 1000,
    (campaign?.send_interval_max || 15000) / 1000,
  ]);
  const [connectionId, setConnectionId] = useState(campaign?.whatsapp_connection_id || '');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const { data: connections } = useQuery({
    queryKey: ['wa-connections-talkx'],
    queryFn: async () => {
      const { data } = await supabase
        .from('whatsapp_connections')
        .select('id, name, phone_number, status')
        .eq('status', 'connected');
      return data || [];
    },
  });

  const { data: contacts } = useQuery({
    queryKey: ['contacts-talkx'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, name, nickname, phone, company, avatar_url')
        .order('name');
      return data || [];
    },
  });

  const previewMessage = useMemo(() => {
    const sampleContact = contacts?.[0] || { name: 'João Silva', nickname: 'Joãozinho', company: 'Acme' };
    const firstName = (sampleContact.name || '').split(' ')[0];
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

    return messageTemplate
      .replace(/\{\{nome\}\}/gi, firstName)
      .replace(/\{\{nome_completo\}\}/gi, sampleContact.name || '')
      .replace(/\{\{apelido\}\}/gi, sampleContact.nickname || firstName)
      .replace(/\{\{empresa\}\}/gi, sampleContact.company || '')
      .replace(/\{\{saudacao\}\}/gi, greeting);
  }, [messageTemplate, contacts]);

  const insertVariable = (variable: string) => {
    setMessageTemplate((prev) => prev + variable);
  };

  const handleSave = async () => {
    const payload = {
      name,
      message_template: messageTemplate,
      typing_delay_min: Math.round(typingDelay[0] * 1000),
      typing_delay_max: Math.round(typingDelay[1] * 1000),
      send_interval_min: Math.round(sendInterval[0] * 1000),
      send_interval_max: Math.round(sendInterval[1] * 1000),
      whatsapp_connection_id: connectionId || null,
    };

    if (campaign) {
      await updateCampaign.mutateAsync({ id: campaign.id, ...payload });
    } else {
      const newCampaign = await createCampaign.mutateAsync(payload);
      if (newCampaign && selectedContacts.length > 0) {
        await addRecipients.mutateAsync({
          campaignId: newCampaign.id,
          contactIds: selectedContacts,
        });
      }
    }
    onClose();
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const selectAll = () => {
    if (!contacts) return;
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((c) => c.id));
    }
  };

  return (
    <div className="h-full flex flex-col gap-6 p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-bold font-display text-foreground">
            {campaign ? 'Editar Campanha' : 'Nova Campanha Talk X'}
          </h2>
          <p className="text-sm text-muted-foreground">Configure mensagem, contatos e simulação</p>
        </div>
        <Button onClick={handleSave} disabled={!name || !messageTemplate} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                Informações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nome da campanha</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Promoção Black Friday"
                />
              </div>
              <div>
                <Label htmlFor="connection">Conexão WhatsApp</Label>
                <Select value={connectionId} onValueChange={setConnectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {connections?.map((conn) => (
                      <SelectItem key={conn.id} value={conn.id}>
                        {conn.instance_name} ({conn.phone_number || 'Sem número'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Message Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Type className="w-4 h-4 text-primary" />
                Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {VARIABLES.map((v) => (
                  <Badge
                    key={v.key}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => insertVariable(v.key)}
                    title={v.desc}
                  >
                    <Wand2 className="w-3 h-3 mr-1" />
                    {v.label}
                  </Badge>
                ))}
              </div>
              <Textarea
                value={messageTemplate}
                onChange={(e) => setMessageTemplate(e.target.value)}
                placeholder="{{saudacao}}, {{nome}}! Tudo bem? 😊"
                rows={5}
                className="resize-none font-mono text-sm"
              />
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">
                  {messageTemplate.length} caracteres
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreview(!showPreview)}
                  className="gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  {showPreview ? 'Ocultar' : 'Preview'}
                </Button>
              </div>
              {showPreview && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border/50">
                  <p className="text-xs text-muted-foreground mb-2">Preview (usando primeiro contato):</p>
                  <div className="bg-green-500/10 rounded-lg p-3 text-sm text-foreground max-w-[80%] ml-auto">
                    {previewMessage || 'Digite uma mensagem...'}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timing Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Simulação Humana
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <div className="flex justify-between mb-3">
                  <Label>Tempo digitando</Label>
                  <span className="text-xs text-muted-foreground">
                    {typingDelay[0]}s – {typingDelay[1]}s
                  </span>
                </div>
                <Slider
                  value={typingDelay}
                  onValueChange={setTypingDelay}
                  min={0.5}
                  max={10}
                  step={0.5}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Tempo que aparece "digitando..." para o contato
                </p>
              </div>
              <Separator />
              <div>
                <div className="flex justify-between mb-3">
                  <Label>Intervalo entre envios</Label>
                  <span className="text-xs text-muted-foreground">
                    {sendInterval[0]}s – {sendInterval[1]}s
                  </span>
                </div>
                <Slider
                  value={sendInterval}
                  onValueChange={setSendInterval}
                  min={3}
                  max={60}
                  step={1}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pausa aleatória entre cada mensagem enviada
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Contact Selection */}
        <Card className="h-fit max-h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Contatos ({selectedContacts.length} selecionados)
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={selectAll}>
                {selectedContacts.length === (contacts?.length || 0) ? 'Desmarcar todos' : 'Selecionar todos'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto min-h-0">
            {campaign ? (
              <TalkXRecipientsList campaignId={campaign.id} />
            ) : (
              <div className="space-y-1">
                {contacts?.map((contact) => (
                  <label
                    key={contact.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${
                      selectedContacts.includes(contact.id)
                        ? 'bg-primary/10 border border-primary/20'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={() => toggleContact(contact.id)}
                      className="rounded border-border"
                    />
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                      {(contact.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {contact.name}
                        {contact.nickname && (
                          <span className="text-muted-foreground ml-1">({contact.nickname})</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {contact.phone}
                        {contact.company && ` • ${contact.company}`}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
