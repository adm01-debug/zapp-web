import { lazy, Suspense } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldQuestion, GraduationCap, Loader2 } from 'lucide-react';

const ObjectionDetector = lazy(() => import('./ObjectionDetector').then(m => ({ default: m.ObjectionDetector })));
const UniversityHelp = lazy(() => import('./UniversityHelp').then(m => ({ default: m.UniversityHelp })));

interface ChatMessage {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
}

interface AIToolsPopoverProps {
  contactId: string;
  lastMessages: string[];
  allMessages: ChatMessage[];
  onSelectSuggestion?: (text: string) => void;
}

export function AIToolsPopover({ contactId, lastMessages, allMessages, onSelectSuggestion }: AIToolsPopoverProps) {
  return (
    <div className="space-y-1">
      <Tabs defaultValue="objections" className="w-full">
        <TabsList className="w-full h-9 bg-muted/50 p-0.5 rounded-lg mb-3">
          <TabsTrigger
            value="objections"
            className="flex-1 h-8 text-[11px] gap-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ShieldQuestion className="w-3.5 h-3.5" />
            Detectar Objeções
          </TabsTrigger>
          <TabsTrigger
            value="university"
            className="flex-1 h-8 text-[11px] gap-1.5 font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Ajuda dos Universitários
          </TabsTrigger>
        </TabsList>
        <TabsContent value="objections" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}>
            <ObjectionDetector
              contactId={contactId}
              lastMessages={lastMessages}
              onSelectSuggestion={onSelectSuggestion}
            />
          </Suspense>
        </TabsContent>
        <TabsContent value="university" className="mt-0 focus-visible:outline-none">
          <Suspense fallback={<div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}>
            <UniversityHelp
              contactId={contactId}
              messages={allMessages}
              onSelectSuggestion={onSelectSuggestion}
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
