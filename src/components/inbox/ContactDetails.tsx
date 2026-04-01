import { useEffect, useRef, useState, useCallback } from 'react';
import { log } from '@/lib/logger';
import { Conversation } from '@/types/chat';
import { CustomFieldsSection } from '@/components/contacts/CustomFieldsSection';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Tag, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PrivateNotes } from './PrivateNotes';
import { ConversationHistory } from './ConversationHistory';
import { ContactHeaderSection } from './contact-details/ContactHeaderSection';
import { ContactInfoSection } from './contact-details/ContactInfoSection';
import { AssignmentSection } from './contact-details/AssignmentSection';
import { ContactStatsSection } from './contact-details/ContactStatsSection';
import { SLAAndAITagsSection } from './contact-details/SLAAndAITagsSection';
import { useContactEnrichedData } from '@/hooks/useContactEnrichedData';
import { ExternalContact360Panel } from './contact-details/ExternalContact360Panel';
import { isExternalConfigured } from '@/integrations/supabase/externalClient';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';

const ACCORDION_STORAGE_KEY = 'contact-details-accordion-state';

function getStoredAccordionState(): string[] {
  try {
    const stored = localStorage.getItem(ACCORDION_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return ['info', 'crm-360', 'tags', 'assignment', 'custom-fields', 'notes', 'history', 'stats'];
}

function saveAccordionState(value: string[]) {
  try {
    localStorage.setItem(ACCORDION_STORAGE_KEY, JSON.stringify(value));
  } catch {}
}

interface ContactDetailsProps {
  conversation: Conversation;
  onClose: () => void;
}

// Stagger animation variants for accordion sections
const sectionVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.3, ease: 'easeOut' as const },
  }),
};

export function ContactDetails({ conversation, onClose }: ContactDetailsProps) {
  const { contact } = conversation;
  const { enrichedData, aiTags, slaInfo } = useContactEnrichedData(contact.id);
  const panelRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showCompactHeader, setShowCompactHeader] = useState(false);
  const [accordionValue, setAccordionValue] = useState<string[]>(getStoredAccordionState);

  // Detect scroll to toggle compact header
  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      setShowCompactHeader(scrollRef.current.scrollTop > 180);
    }
  }, []);

  // Save accordion state
  const handleAccordionChange = useCallback((value: string[]) => {
    setAccordionValue(value);
    saveAccordionState(value);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        onClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && panelRef.current) {
        e.preventDefault();
        const notesArea = panelRef.current.querySelector('textarea');
        notesArea?.focus();
        toast.info('📝 Notas Privadas');
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't' && panelRef.current) {
        e.preventDefault();
        toast.info('🏷️ Seção de Tags');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

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
      ref={panelRef}
      className="w-80 h-full min-h-0 shrink-0 bg-card border-l border-border flex flex-col overflow-hidden"
    >
      {/* Fixed top bar */}
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

      {/* Compact sticky header (appears on scroll) */}
      <AnimatePresence>
        {showCompactHeader && (
          <ContactHeaderSection
            contact={contact}
            enrichedData={enrichedData}
            onQuickAction={handleQuickAction}
            isCompact
          />
        )}
      </AnimatePresence>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto scrollbar-thin"
      >
        {/* Full Contact Header */}
        <ContactHeaderSection
          contact={contact}
          enrichedData={enrichedData}
          onQuickAction={handleQuickAction}
        />

        {/* Collapsible sections with memory */}
        <Accordion
          type="multiple"
          value={accordionValue}
          onValueChange={handleAccordionChange}
          className="w-full"
        >
          {/* Informações */}
          <motion.div custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
            <AccordionItem value="info" className="border-border/30">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                Informações
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <ContactInfoSection contact={contact} enrichedData={enrichedData} />
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* SLA & AI Tags */}
          {(slaInfo || aiTags.length > 0) && (
            <motion.div custom={1} initial="hidden" animate="visible" variants={sectionVariants}>
              <AccordionItem value="sla-ai" className="border-border/30">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                  SLA & Inteligência
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <SLAAndAITagsSection slaInfo={slaInfo} aiTags={aiTags} />
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          )}

          {/* CRM 360° */}
          {isExternalConfigured && (
            <motion.div custom={2} initial="hidden" animate="visible" variants={sectionVariants}>
              <AccordionItem value="crm-360" className="border-border/30">
                <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    CRM 360°
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <ExternalContact360Panel phone={contact.phone} />
                </AccordionContent>
              </AccordionItem>
            </motion.div>
          )}

          {/* Tags */}
          <motion.div custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
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
          </motion.div>

          {/* Atribuição */}
          <motion.div custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
            <AccordionItem value="assignment" className="border-border/30">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                Atribuição
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <AssignmentSection conversation={conversation} />
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Campos Personalizados */}
          <motion.div custom={5} initial="hidden" animate="visible" variants={sectionVariants}>
            <AccordionItem value="custom-fields" className="border-border/30">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                Campos Personalizados
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <CustomFieldsSection contactId={contact.id} />
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Notas Privadas */}
          <motion.div custom={6} initial="hidden" animate="visible" variants={sectionVariants}>
            <AccordionItem value="notes" className="border-border/30">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                Notas Privadas
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <PrivateNotes contactId={contact.id} />
              </AccordionContent>
            </AccordionItem>
          </motion.div>

          {/* Histórico */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={sectionVariants}>
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
          </motion.div>

          {/* Estatísticas */}
          <motion.div custom={8} initial="hidden" animate="visible" variants={sectionVariants}>
            <AccordionItem value="stats" className="border-border/30">
              <AccordionTrigger className="px-4 py-3 text-sm font-medium text-muted-foreground uppercase tracking-wide hover:no-underline hover:bg-muted/10">
                Estatísticas
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <ContactStatsSection contactId={contact.id} />
              </AccordionContent>
            </AccordionItem>
          </motion.div>
        </Accordion>
      </div>
    </motion.div>
  );
}
