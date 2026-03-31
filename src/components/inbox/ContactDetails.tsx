import { log } from '@/lib/logger';
import { Conversation } from '@/types/chat';
import { CustomFieldsSection } from '@/components/contacts/CustomFieldsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { PrivateNotes } from './PrivateNotes';
import { ConversationHistory } from './ConversationHistory';
import { ContactHeaderSection } from './contact-details/ContactHeaderSection';
import { ContactInfoSection } from './contact-details/ContactInfoSection';
import { AssignmentSection } from './contact-details/AssignmentSection';
import { ContactStatsSection } from './contact-details/ContactStatsSection';
import { SLAAndAITagsSection } from './contact-details/SLAAndAITagsSection';
import { useContactEnrichedData } from '@/hooks/useContactEnrichedData';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';

interface ContactDetailsProps {
  conversation: Conversation;
  onClose: () => void;
}

export function ContactDetails({ conversation, onClose }: ContactDetailsProps) {
  const { contact } = conversation;
  const { enrichedData, aiTags, slaInfo } = useContactEnrichedData(contact.id);

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'vip':
        toast.success('Contato marcado como VIP');
        break;
      case 'archive':
        toast.success('Contato arquivado');
        break;
      case 'block':
        toast.error('Contato bloqueado');
        break;
    }
  };

  return (
    <motion.div
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 100, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="w-80 h-full min-h-0 shrink-0 bg-card border-l border-border flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-card shrink-0">
        <h3 className="font-semibold text-foreground">Detalhes do Contato</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="hover:bg-destructive/10 hover:text-destructive transition-colors"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
        {/* Contact Header with avatar, badges, quick actions */}
        <ContactHeaderSection
          contact={contact}
          enrichedData={enrichedData}
          onQuickAction={handleQuickAction}
        />

        {/* Collapsible sections */}
        <Accordion
          type="multiple"
          defaultValue={['info', 'tags', 'assignment', 'custom-fields', 'notes', 'history', 'stats']}
          className="w-full"
        >
          {/* Informações */}
          <AccordionItem value="info" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              Informações
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ContactInfoSection contact={contact} enrichedData={enrichedData} />
            </AccordionContent>
          </AccordionItem>

          {/* SLA & AI Tags (conditional) */}
          {(slaInfo || aiTags.length > 0) && (
            <AccordionItem value="sla-ai" className="border-border/30">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                SLA & Inteligência
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <SLAAndAITagsSection slaInfo={slaInfo} aiTags={aiTags} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Tags */}
          <AccordionItem value="tags" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary" />
                Tags
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="flex flex-wrap gap-2">
                {contact.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-foreground hover:bg-primary/20 transition-all"
                  >
                    {tag}
                    <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" />
                  </Badge>
                ))}
                {conversation.tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="flex items-center gap-1 border-border/30 hover:border-primary/30 transition-all"
                  >
                    {tag}
                    <X className="w-3 h-3 cursor-pointer hover:text-destructive transition-colors" />
                  </Badge>
                ))}
                {contact.tags.length === 0 && conversation.tags.length === 0 && (
                  <p className="text-xs text-muted-foreground italic">Nenhuma tag</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs hover:bg-primary/10 hover:text-primary"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Adicionar
                </Button>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Atribuição */}
          <AccordionItem value="assignment" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              Atribuição
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <AssignmentSection conversation={conversation} />
            </AccordionContent>
          </AccordionItem>

          {/* Campos Personalizados */}
          <AccordionItem value="custom-fields" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              Campos Personalizados
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <CustomFieldsSection contactId={contact.id} />
            </AccordionContent>
          </AccordionItem>

          {/* Notas Privadas */}
          <AccordionItem value="notes" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              Notas Privadas
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <PrivateNotes contactId={contact.id} />
            </AccordionContent>
          </AccordionItem>

          {/* Histórico */}
          <AccordionItem value="history" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              Histórico
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ConversationHistory
                contactId={contact.id}
                contactPhone={contact.phone}
                onSelectConversation={(id) => log.debug('Selected conversation:', id)}
              />
            </AccordionContent>
          </AccordionItem>

          {/* Estatísticas */}
          <AccordionItem value="stats" className="border-border/30">
            <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
              Estatísticas
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <ContactStatsSection contactId={contact.id} />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </motion.div>
  );
}
