import React, { useState, useMemo } from 'react';
import {
  ArrowLeft, Save, Users, Wand2, Eye, Clock, MessageSquare, Type, Search,
  Image, FileText, Video, Music, X, CalendarClock, BookOpen
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
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTalkX, TalkXCampaign } from '@/hooks/useTalkX';
import { TalkXRecipientsList } from './TalkXRecipientsList';
import { TalkXMessagePreview } from './TalkXMessagePreview';

interface Props {
  campaign: TalkXCampaign | null;
  onClose: () => void;
}

const VARIABLES = [
  { key: '{{nome}}', label: 'Primeiro Nome', desc: 'Insere o primeiro nome do contato' },
  { key: '{{nome_completo}}', label: 'Nome Completo', desc: 'Insere o nome completo do contato' },
  { key: '{{apelido}}', label: 'Apelido', desc: 'Usa apelido se disponível, senão primeiro nome' },
  { key: '{{empresa}}', label: 'Empresa', desc: 'Nome da empresa do contato' },
  { key: '{{saudacao}}', label: 'Saudação', desc: 'Automático: Bom dia / Boa tarde / Boa noite' },
];

const MEDIA_TYPES = [
  { value: 'image', label: 'Imagem', icon: Image },
  { value: 'video', label: 'Vídeo', icon: Video },
  { value: 'document', label: 'Documento', icon: FileText },
  { value: 'audio', label: 'Áudio', icon: Music },
];

const MESSAGE_TEMPLATES = [
  { name: 'Saudação simples', template: '{{saudacao}}, {{nome}}! Tudo bem? 😊' },
  { name: 'Promoção', template: '{{saudacao}}, {{nome}}! 🎉 Temos uma oferta especial para você! Entre em contato para saber mais.' },
  { name: 'Follow-up', template: 'Oi, {{apelido}}! Passando para saber se conseguiu ver nossa última mensagem. Fico à disposição! 🙏' },
  { name: 'Boas-vindas', template: '{{saudacao}}, {{nome}}! Seja muito bem-vindo(a) à {{empresa}}! Estamos felizes em ter você conosco. 🤝' },
  { name: 'Lembrete', template: 'Oi, {{apelido}}! Só passando para lembrar sobre nosso compromisso. Qualquer dúvida, estou por aqui! 📌' },
  { name: 'Agradecimento', template: '{{saudacao}}, {{nome}}! Muito obrigado pela confiança! Foi um prazer atender você. ⭐' },
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
  const [contactSearch, setContactSearch] = useState('');
  const [saving, setSaving] = useState(false);

  // Media state
  const [mediaUrl, setMediaUrl] = useState(campaign?.media_url || '');
  const [mediaType, setMediaType] = useState(campaign?.media_type || '');
  const [hasMedia, setHasMedia] = useState(!!campaign?.media_url);

  // Scheduling state
  const [isScheduled, setIsScheduled] = useState(!!campaign?.scheduled_at);
  const [scheduledAt, setScheduledAt] = useState(
    campaign?.scheduled_at
      ? new Date(campaign.scheduled_at).toISOString().slice(0, 16)
      : ''
  );

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
        .not('phone', 'is', null)
        .order('name');
      return data || [];
    },
  });

  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    if (!contactSearch.trim()) return contacts;
    const q = contactSearch.toLowerCase();
    return contacts.filter(
      (c) =>
        c.name?.toLowerCase().includes(q) ||
        c.nickname?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.company?.toLowerCase().includes(q)
    );
  }, [contacts, contactSearch]);

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
    setSaving(true);
    try {
      const payload: Partial<TalkXCampaign> = {
        name,
        message_template: messageTemplate,
        typing_delay_min: Math.round(typingDelay[0] * 1000),
        typing_delay_max: Math.round(typingDelay[1] * 1000),
        send_interval_min: Math.round(sendInterval[0] * 1000),
        send_interval_max: Math.round(sendInterval[1] * 1000),
        whatsapp_connection_id: connectionId || null,
        media_url: hasMedia ? mediaUrl || null : null,
        media_type: hasMedia ? mediaType || null : null,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        status: isScheduled && scheduledAt ? 'scheduled' : undefined,
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
    } finally {
      setSaving(false);
    }
  };

  const toggleContact = (contactId: string) => {
    setSelectedContacts((prev) =>
      prev.includes(contactId) ? prev.filter((id) => id !== contactId) : [...prev, contactId]
    );
  };

  const selectAll = () => {
    if (!filteredContacts) return;
    const allFilteredIds = filteredContacts.map((c) => c.id);
    const allSelected = allFilteredIds.every((id) => selectedContacts.includes(id));
    if (allSelected) {
      setSelectedContacts((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedContacts((prev) => [...new Set([...prev, ...allFilteredIds])]);
    }
  };

  const estimatedTime = useMemo(() => {
    if (selectedContacts.length === 0) return null;
    const avgTyping = (typingDelay[0] + typingDelay[1]) / 2;
    const avgInterval = (sendInterval[0] + sendInterval[1]) / 2;
    const totalSeconds = selectedContacts.length * (avgTyping + avgInterval);
    const minutes = Math.ceil(totalSeconds / 60);
    if (minutes < 60) return `~${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const remainMin = minutes % 60;
    return `~${hours}h${remainMin > 0 ? ` ${remainMin}min` : ''}`;
  }, [selectedContacts.length, typingDelay, sendInterval]);

  return (
    <div className="h-full flex flex-col gap-4 md:gap-6 p-4 md:p-6 overflow-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg md:text-xl font-bold font-display text-foreground truncate">
            {campaign ? 'Editar Campanha' : 'Nova Campanha Talk X'}
          </h2>
          <p className="text-xs md:text-sm text-muted-foreground">Configure mensagem, contatos e simulação</p>
        </div>
        <div className="flex items-center gap-2">
          {estimatedTime && (
            <Badge variant="outline" className="gap-1 hidden sm:flex">
              <Clock className="w-3 h-3" />
              {estimatedTime}
            </Badge>
          )}
          <Button onClick={handleSave} disabled={!name || !messageTemplate || saving} className="gap-2">
            {saving ? <Loader2Icon /> : <Save className="w-4 h-4" />}
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Left Column */}
        <div className="space-y-4 md:space-y-6">
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
                        {conn.name} ({conn.phone_number || 'Sem número'})
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
              <div className="flex flex-wrap gap-1.5 items-center">
                {VARIABLES.map((v) => (
                  <Tooltip key={v.key}>
                    <TooltipTrigger asChild>
                      <Badge
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors text-xs"
                        onClick={() => insertVariable(v.key)}
                      >
                        <Wand2 className="w-3 h-3 mr-1" />
                        {v.label}
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[200px]">
                      <p className="font-mono text-[10px] text-primary mb-0.5">{v.key}</p>
                      <p className="text-xs">{v.desc}</p>
                    </TooltipContent>
                  </Tooltip>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-6 gap-1 text-xs text-muted-foreground">
                      <BookOpen className="w-3 h-3" />
                      Templates
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-64">
                    {MESSAGE_TEMPLATES.map((t) => (
                      <DropdownMenuItem
                        key={t.name}
                        onClick={() => setMessageTemplate(t.template)}
                        className="flex flex-col items-start gap-0.5"
                      >
                        <span className="font-medium text-xs">{t.name}</span>
                        <span className="text-[10px] text-muted-foreground line-clamp-1">{t.template}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <TalkXMessagePreview
                  messageTemplate={messageTemplate}
                  contacts={
                    selectedContacts.length > 0
                      ? (contacts || []).filter((c) => selectedContacts.includes(c.id))
                      : contacts || []
                  }
                  mediaUrl={hasMedia ? mediaUrl : undefined}
                  mediaType={hasMedia ? mediaType : undefined}
                />
              )}
            </CardContent>
          </Card>

          {/* Media Attachment */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Image className="w-4 h-4 text-primary" />
                  Mídia (opcional)
                </CardTitle>
                <Switch checked={hasMedia} onCheckedChange={(v) => { setHasMedia(v); if (!v) { setMediaUrl(''); setMediaType(''); } }} />
              </div>
            </CardHeader>
            {hasMedia && (
              <CardContent className="space-y-4">
                <div>
                  <Label>Tipo de mídia</Label>
                  <div className="grid grid-cols-4 gap-2 mt-1.5">
                    {MEDIA_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setMediaType(value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs transition-all ${
                          mediaType === value
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/30 text-muted-foreground'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="media-url">URL da mídia</Label>
                  <div className="relative">
                    <Input
                      id="media-url"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      placeholder="https://exemplo.com/imagem.jpg"
                      className="pr-8"
                    />
                    {mediaUrl && (
                      <button
                        type="button"
                        onClick={() => setMediaUrl('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    A mídia será enviada junto com a mensagem de texto como legenda
                  </p>
                </div>
              </CardContent>
            )}
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
                  <span className="text-xs font-mono text-muted-foreground">
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
                  <span className="text-xs font-mono text-muted-foreground">
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
              {estimatedTime && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tempo estimado total:</span>
                    <Badge variant="secondary" className="gap-1">
                      <Clock className="w-3 h-3" />
                      {estimatedTime}
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Scheduling */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-primary" />
                  Agendar envio
                </CardTitle>
                <Switch checked={isScheduled} onCheckedChange={(v) => { setIsScheduled(v); if (!v) setScheduledAt(''); }} />
              </div>
            </CardHeader>
            {isScheduled && (
              <CardContent>
                <Label htmlFor="scheduled-at">Data e hora</Label>
                <Input
                  id="scheduled-at"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                  className="mt-1.5"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A campanha será iniciada automaticamente na data e hora programada
                </p>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Right Column - Contact Selection */}
        <Card className="h-fit max-h-[calc(100vh-200px)] flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Contatos
                <Badge variant="secondary" className="text-[10px]">
                  {selectedContacts.length}/{contacts?.length || 0}
                </Badge>
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={selectAll} className="text-xs shrink-0">
                {filteredContacts.length > 0 && filteredContacts.every((c) => selectedContacts.includes(c.id))
                  ? 'Desmarcar'
                  : 'Todos'}
              </Button>
            </div>
            {!campaign && (
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  placeholder="Buscar por nome, telefone, empresa..."
                  className="pl-9 h-9 text-sm"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="flex-1 overflow-auto min-h-0">
            {campaign ? (
              <TalkXRecipientsList campaignId={campaign.id} />
            ) : (
              <div className="space-y-0.5">
                {filteredContacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {contactSearch ? 'Nenhum contato encontrado' : 'Nenhum contato disponível'}
                  </p>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContacts.includes(contact.id);
                    return (
                      <label
                        key={contact.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-primary/10 border border-primary/20'
                            : 'hover:bg-muted/50 border border-transparent'
                        }`}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleContact(contact.id)}
                        />
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                          {contact.avatar_url ? (
                            <img src={contact.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (contact.name || '?')[0].toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {contact.name}
                            {contact.nickname && (
                              <span className="text-muted-foreground ml-1 font-normal">({contact.nickname})</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {contact.phone}
                            {contact.company && ` · ${contact.company}`}
                          </p>
                        </div>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Loader2Icon() {
  return <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
