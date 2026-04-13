import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Drawer, DrawerContent } from '@/components/ui/drawer';
import { ContactDetails } from './ContactDetails';
import type { Conversation } from '@/types/chat';

interface Props {
  conversation: Conversation;
  onClose: () => void;
}

/**
 * Renders ContactDetails as a side panel on desktop (≥768px)
 * and as a bottom Drawer (Vaul) on mobile (<768px).
 */
export function ContactDetailsResponsive({ conversation, onClose }: Props) {
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (isMobile) {
    return (
      <Drawer open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DrawerContent className="max-h-[85vh]">
          <ContactDetails conversation={conversation} onClose={onClose} />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="h-full shrink-0 overflow-hidden">
      <ContactDetails conversation={conversation} onClose={onClose} />
    </div>
  );
}
