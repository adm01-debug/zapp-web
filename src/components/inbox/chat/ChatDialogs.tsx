import { Conversation, Message, InteractiveMessage, LocationMessage } from '@/types/chat';
import { TransferDialog } from '../TransferDialog';
import { ScheduleMessageDialog } from '../ScheduleMessageDialog';
import { CallDialog } from '@/components/calls/CallDialog';
import { GlobalSearch } from '../GlobalSearch';
import { InteractiveMessageBuilder } from '../InteractiveMessageBuilder';
import { ForwardMessageDialog } from '../ForwardMessageDialog';
import { LocationPicker } from '../LocationPicker';
import { AIConversationAssistant } from '../AIConversationAssistant';
import { toast } from '@/hooks/use-toast';

interface SearchResult {
  id: string;
  type: 'message' | 'contact' | 'transcription' | 'action' | 'crm';
  title: string;
  preview: string;
  timestamp: Date;
  contactId?: string;
  action?: () => void;
}

interface ChatDialogsProps {
  conversation: Conversation;
  messages: Message[];
  
  // Transfer dialog
  showTransferDialog: boolean;
  onTransferDialogChange: (open: boolean) => void;
  onTransfer: (type: 'agent' | 'queue', targetId: string, message?: string) => void;
  
  // Schedule dialog
  showScheduleDialog: boolean;
  onScheduleDialogChange: (open: boolean) => void;
  onSchedule: (message: string, scheduledAt: Date, attachment?: File) => void;
  
  // Call dialog
  showCallDialog: boolean;
  onCallDialogChange: (open: boolean) => void;
  callDirection: 'inbound' | 'outbound';
  onEndCall: () => void;
  
  // Global search
  showGlobalSearch: boolean;
  onGlobalSearchChange: (open: boolean) => void;
  onSelectSearchResult: (result: SearchResult) => void;
  
  // Interactive message builder
  showInteractiveBuilder: boolean;
  onInteractiveBuilderChange: (open: boolean) => void;
  onSendInteractiveMessage: (interactive: InteractiveMessage) => void;
  
  // Forward dialog
  showForwardDialog: boolean;
  onForwardDialogChange: (open: boolean) => void;
  forwardMessage: Message | null;
  onForward: (targetIds: string[], targetType: 'contact' | 'group') => void;
  
  // Location picker
  showLocationPicker: boolean;
  onLocationPickerChange: (open: boolean) => void;
  onSendLocation: (location: LocationMessage) => void;
  
  // AI Assistant
  showAIAssistant: boolean;
  onAIAssistantClose: () => void;
}

export function ChatDialogs({
  conversation,
  messages,
  showTransferDialog,
  onTransferDialogChange,
  onTransfer,
  showScheduleDialog,
  onScheduleDialogChange,
  onSchedule,
  showCallDialog,
  onCallDialogChange,
  callDirection,
  onEndCall,
  showGlobalSearch,
  onGlobalSearchChange,
  onSelectSearchResult,
  showInteractiveBuilder,
  onInteractiveBuilderChange,
  onSendInteractiveMessage,
  showForwardDialog,
  onForwardDialogChange,
  forwardMessage,
  onForward,
  showLocationPicker,
  onLocationPickerChange,
  onSendLocation,
  showAIAssistant,
  onAIAssistantClose,
}: ChatDialogsProps) {
  return (
    <>
      <TransferDialog
        open={showTransferDialog}
        onOpenChange={onTransferDialogChange}
        onTransfer={onTransfer}
      />
      
      <ScheduleMessageDialog
        open={showScheduleDialog}
        onOpenChange={onScheduleDialogChange}
        onSchedule={onSchedule}
      />

      <CallDialog
        open={showCallDialog}
        onOpenChange={onCallDialogChange}
        contact={{
          name: conversation.contact.name,
          phone: conversation.contact.phone,
          avatar: conversation.contact.avatar,
        }}
        direction={callDirection}
        onEnd={onEndCall}
      />

      <GlobalSearch
        open={showGlobalSearch}
        onOpenChange={onGlobalSearchChange}
        onSelectResult={(result) => {
          onSelectSearchResult(result);
          toast({
            title: "Resultado selecionado",
            description: result.title
          });
        }}
      />

      <InteractiveMessageBuilder
        open={showInteractiveBuilder}
        onOpenChange={onInteractiveBuilderChange}
        onSend={onSendInteractiveMessage}
      />

      <ForwardMessageDialog
        open={showForwardDialog}
        onOpenChange={onForwardDialogChange}
        message={forwardMessage}
        onForward={onForward}
      />

      <LocationPicker
        open={showLocationPicker}
        onOpenChange={onLocationPickerChange}
        onSend={onSendLocation}
      />

      <AIConversationAssistant
        messages={messages.map(m => ({
          id: m.id,
          sender: m.sender,
          content: m.content,
          type: m.type,
          mediaUrl: m.mediaUrl,
          created_at: m.timestamp.toISOString()
        }))}
        contactId={conversation.contact.id}
        contactName={conversation.contact.name}
        isOpen={showAIAssistant}
        onClose={onAIAssistantClose}
      />
    </>
  );
}
