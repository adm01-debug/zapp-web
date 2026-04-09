import { lazy, Suspense, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ShieldQuestion, GraduationCap } from 'lucide-react';

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
    <Tabs defaultValue="objections" className="w-full">
      <TabsList className="w-full h-8 bg-muted/50 p-0.5 rounded-lg mb-2">
        <TabsTrigger value="objections" className="flex-1 h-7 text-[11px] gap-1 data-[state=active]:bg-background">
          <ShieldQuestion className="w-3 h-3" />
          Objeções
        </TabsTrigger>
        <TabsTrigger value="university" className="flex-1 h-7 text-[11px] gap-1 data-[state=active]:bg-background">
          <GraduationCap className="w-3 h-3" />
          Universitários
        </TabsTrigger>
      </TabsList>
      <TabsContent value="objections" className="mt-0">
        <Suspense fallback={null}>
          <ObjectionDetector
            contactId={contactId}
            lastMessages={lastMessages}
            onSelectSuggestion={onSelectSuggestion}
          />
        </Suspense>
      </TabsContent>
      <TabsContent value="university" className="mt-0">
        <Suspense fallback={null}>
          <UniversityHelp
            contactId={contactId}
            messages={allMessages}
            onSelectSuggestion={onSelectSuggestion}
          />
        </Suspense>
      </TabsContent>
    </Tabs>
  );
}
