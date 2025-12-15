import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Conversation } from '@/types/chat';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Filter,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
}

const statusIcons = {
  open: AlertCircle,
  pending: Clock,
  resolved: CheckCircle2,
  waiting: Loader2,
};

const statusColors = {
  open: 'bg-status-open',
  pending: 'bg-status-pending',
  resolved: 'bg-status-resolved',
  waiting: 'bg-status-waiting',
};

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filteredConversations = conversations.filter((conv) => {
    const matchesSearch = conv.contact.name.toLowerCase().includes(search.toLowerCase()) ||
      conv.contact.phone.includes(search);
    const matchesFilter = filter === 'all' || conv.status === filter;
    return matchesSearch && matchesFilter;
  });

  const counts = {
    all: conversations.length,
    open: conversations.filter((c) => c.status === 'open').length,
    pending: conversations.filter((c) => c.status === 'pending').length,
    waiting: conversations.filter((c) => c.status === 'waiting').length,
  };

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">Conversas</h2>
          <Button variant="ghost" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conversas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-secondary border-0"
          />
        </div>

        {/* Tabs */}
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="w-full grid grid-cols-4 bg-secondary">
            <TabsTrigger value="all" className="text-xs">
              Todas ({counts.all})
            </TabsTrigger>
            <TabsTrigger value="open" className="text-xs">
              Abertas ({counts.open})
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">
              Pendentes ({counts.pending})
            </TabsTrigger>
            <TabsTrigger value="waiting" className="text-xs">
              Aguardando ({counts.waiting})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
            <Search className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">Nenhuma conversa encontrada</p>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {filteredConversations.map((conversation) => {
              const StatusIcon = statusIcons[conversation.status];
              const isSelected = selectedId === conversation.id;

              return (
                <div
                  key={conversation.id}
                  onClick={() => onSelect(conversation)}
                  className={cn(
                    'conversation-item',
                    isSelected && 'active'
                  )}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={conversation.contact.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {conversation.contact.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        'absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center',
                        statusColors[conversation.status]
                      )}
                    >
                      <StatusIcon className="w-2.5 h-2.5 text-white" />
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-foreground truncate">
                        {conversation.contact.name}
                      </span>
                      <span className="text-xs text-muted-foreground flex-shrink-0">
                        {formatDistanceToNow(conversation.updatedAt, {
                          addSuffix: false,
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground truncate pr-2">
                        {conversation.lastMessage?.content || 'Sem mensagens'}
                      </p>
                      {conversation.unreadCount > 0 && (
                        <span className="unread-badge flex-shrink-0">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>

                    {/* Tags */}
                    {conversation.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-2 flex-wrap">
                        {conversation.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {conversation.tags.length > 2 && (
                          <span className="text-[10px] text-muted-foreground">
                            +{conversation.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Priority indicator */}
                  {conversation.priority === 'high' && (
                    <div className="w-1 h-8 rounded-full bg-priority-high flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
