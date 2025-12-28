import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  ArrowRight,
  CheckCircle,
  FileText,
  StickyNote,
  Tag,
  AlertTriangle,
  Users,
  Clock,
  Star,
  Archive,
  Bell,
  Zap,
  MessageSquare,
  Search,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: typeof ArrowRight;
  category: 'actions' | 'templates' | 'notes' | 'tags' | 'priority';
  color: string;
  shortcut?: string;
  subCommands?: { id: string; label: string; value: string }[];
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: 'transfer',
    command: '/transfer',
    label: 'Transferir',
    description: 'Transferir conversa para outro agente ou fila',
    icon: ArrowRight,
    category: 'actions',
    color: 'text-blue-500',
    shortcut: 'T',
    subCommands: [
      { id: 'agent', label: 'Para Agente', value: 'agent' },
      { id: 'queue', label: 'Para Fila', value: 'queue' },
    ],
  },
  {
    id: 'resolve',
    command: '/resolve',
    label: 'Resolver',
    description: 'Marcar conversa como resolvida',
    icon: CheckCircle,
    category: 'actions',
    color: 'text-success',
    shortcut: 'R',
  },
  {
    id: 'template',
    command: '/template',
    label: 'Template',
    description: 'Inserir um template de mensagem',
    icon: FileText,
    category: 'templates',
    color: 'text-purple-500',
    shortcut: 'M',
  },
  {
    id: 'note',
    command: '/note',
    label: 'Nota',
    description: 'Adicionar nota privada à conversa',
    icon: StickyNote,
    category: 'notes',
    color: 'text-amber-500',
    shortcut: 'N',
  },
  {
    id: 'tag',
    command: '/tag',
    label: 'Tag',
    description: 'Adicionar ou remover tags',
    icon: Tag,
    category: 'tags',
    color: 'text-cyan-500',
    shortcut: 'G',
    subCommands: [
      { id: 'add', label: 'Adicionar Tag', value: 'add' },
      { id: 'remove', label: 'Remover Tag', value: 'remove' },
    ],
  },
  {
    id: 'priority',
    command: '/priority',
    label: 'Prioridade',
    description: 'Definir prioridade da conversa',
    icon: AlertTriangle,
    category: 'priority',
    color: 'text-orange-500',
    shortcut: 'P',
    subCommands: [
      { id: 'high', label: '🔴 Alta', value: 'high' },
      { id: 'medium', label: '🟡 Média', value: 'medium' },
      { id: 'low', label: '🟢 Baixa', value: 'low' },
    ],
  },
  {
    id: 'assign',
    command: '/assign',
    label: 'Atribuir',
    description: 'Atribuir conversa a um agente',
    icon: Users,
    category: 'actions',
    color: 'text-indigo-500',
    shortcut: 'A',
  },
  {
    id: 'snooze',
    command: '/snooze',
    label: 'Adiar',
    description: 'Adiar conversa para depois',
    icon: Clock,
    category: 'actions',
    color: 'text-slate-500',
    shortcut: 'S',
    subCommands: [
      { id: '1h', label: 'Em 1 hora', value: '1h' },
      { id: '3h', label: 'Em 3 horas', value: '3h' },
      { id: 'tomorrow', label: 'Amanhã', value: 'tomorrow' },
      { id: 'nextweek', label: 'Próxima semana', value: 'nextweek' },
    ],
  },
  {
    id: 'star',
    command: '/star',
    label: 'Favoritar',
    description: 'Marcar conversa como favorita',
    icon: Star,
    category: 'actions',
    color: 'text-yellow-500',
    shortcut: 'F',
  },
  {
    id: 'archive',
    command: '/archive',
    label: 'Arquivar',
    description: 'Arquivar esta conversa',
    icon: Archive,
    category: 'actions',
    color: 'text-muted-foreground',
    shortcut: 'Q',
  },
  {
    id: 'remind',
    command: '/remind',
    label: 'Lembrete',
    description: 'Criar lembrete para esta conversa',
    icon: Bell,
    category: 'actions',
    color: 'text-pink-500',
    shortcut: 'L',
  },
  {
    id: 'quick',
    command: '/quick',
    label: 'Resposta Rápida',
    description: 'Usar uma resposta rápida salva',
    icon: Zap,
    category: 'templates',
    color: 'text-emerald-500',
    shortcut: 'K',
  },
  {
    id: 'summary',
    command: '/summary',
    label: 'Resumo IA',
    description: 'Gerar resumo da conversa com IA',
    icon: MessageSquare,
    category: 'actions',
    color: 'text-violet-500',
    shortcut: 'I',
  },
];

interface SlashCommandsProps {
  inputValue: string;
  onSelectCommand: (command: SlashCommand, subCommand?: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function SlashCommands({
  inputValue,
  onSelectCommand,
  onClose,
  isOpen,
}: SlashCommandsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCommand, setSelectedCommand] = useState<SlashCommand | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!inputValue.startsWith('/')) return [];
    
    const searchTerm = inputValue.slice(1).toLowerCase();
    return SLASH_COMMANDS.filter(
      cmd => 
        cmd.command.slice(1).toLowerCase().includes(searchTerm) ||
        cmd.label.toLowerCase().includes(searchTerm) ||
        cmd.description.toLowerCase().includes(searchTerm)
    );
  }, [inputValue]);

  // Reset selection when commands change
  useEffect(() => {
    setSelectedIndex(0);
    setSelectedCommand(null);
  }, [inputValue]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      const items = selectedCommand?.subCommands || filteredCommands;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % items.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (selectedCommand?.subCommands) {
            const subCmd = selectedCommand.subCommands[selectedIndex];
            if (subCmd) {
              onSelectCommand(selectedCommand, subCmd.value);
            }
          } else if (filteredCommands[selectedIndex]) {
            const cmd = filteredCommands[selectedIndex];
            if (cmd.subCommands) {
              setSelectedCommand(cmd);
              setSelectedIndex(0);
            } else {
              onSelectCommand(cmd);
            }
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (selectedCommand) {
            setSelectedCommand(null);
            setSelectedIndex(0);
          } else {
            onClose();
          }
          break;
        case 'Backspace':
          if (selectedCommand && inputValue === `/${selectedCommand.command.slice(1)} `) {
            setSelectedCommand(null);
            setSelectedIndex(0);
          }
          break;
        case 'Tab':
          e.preventDefault();
          if (filteredCommands[selectedIndex] && !selectedCommand) {
            const cmd = filteredCommands[selectedIndex];
            if (cmd.subCommands) {
              setSelectedCommand(cmd);
              setSelectedIndex(0);
            } else {
              onSelectCommand(cmd);
            }
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredCommands, selectedIndex, selectedCommand, onSelectCommand, onClose, inputValue]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    selectedElement?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  if (!isOpen || (filteredCommands.length === 0 && !selectedCommand)) return null;

  const categoryColors = {
    actions: 'bg-blue-500/10 text-blue-500',
    templates: 'bg-purple-500/10 text-purple-500',
    notes: 'bg-amber-500/10 text-amber-500',
    tags: 'bg-cyan-500/10 text-cyan-500',
    priority: 'bg-orange-500/10 text-orange-500',
  };

  const categoryLabels = {
    actions: 'Ações',
    templates: 'Templates',
    notes: 'Notas',
    tags: 'Tags',
    priority: 'Prioridade',
  };

  // Group commands by category
  const groupedCommands = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, SlashCommand[]>);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-full left-0 right-0 mb-2 mx-4 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {selectedCommand ? (
                <span className="flex items-center gap-1.5">
                  <selectedCommand.icon className={cn("w-4 h-4", selectedCommand.color)} />
                  {selectedCommand.label}
                </span>
              ) : (
                'Comandos'
              )}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded text-muted-foreground">↑↓</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded text-muted-foreground">Enter</kbd>
            <kbd className="px-1.5 py-0.5 text-[10px] font-medium bg-muted rounded text-muted-foreground">Esc</kbd>
          </div>
        </div>

        {/* Content */}
        <ScrollArea className="max-h-64">
          <div ref={listRef} className="p-1">
            {selectedCommand?.subCommands ? (
              // Show sub-commands
              <div className="space-y-0.5">
                {selectedCommand.subCommands.map((subCmd, idx) => (
                  <motion.button
                    key={subCmd.id}
                    data-index={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    onClick={() => onSelectCommand(selectedCommand, subCmd.value)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                      selectedIndex === idx 
                        ? "bg-primary/10 text-primary" 
                        : "hover:bg-muted/50 text-foreground"
                    )}
                  >
                    <span className="font-medium">{subCmd.label}</span>
                  </motion.button>
                ))}
              </div>
            ) : (
              // Show grouped commands
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-2 last:mb-0">
                  <div className="px-3 py-1">
                    <Badge 
                      variant="outline" 
                      className={cn("text-[10px] font-medium", categoryColors[category as keyof typeof categoryColors])}
                    >
                      {categoryLabels[category as keyof typeof categoryLabels]}
                    </Badge>
                  </div>
                  <div className="space-y-0.5">
                    {commands.map((cmd) => {
                      const globalIndex = filteredCommands.indexOf(cmd);
                      const Icon = cmd.icon;
                      
                      return (
                        <motion.button
                          key={cmd.id}
                          data-index={globalIndex}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: globalIndex * 0.02 }}
                          onClick={() => {
                            if (cmd.subCommands) {
                              setSelectedCommand(cmd);
                              setSelectedIndex(0);
                            } else {
                              onSelectCommand(cmd);
                            }
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                            selectedIndex === globalIndex 
                              ? "bg-primary/10" 
                              : "hover:bg-muted/50"
                          )}
                        >
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110",
                            selectedIndex === globalIndex ? "bg-primary/20" : "bg-muted"
                          )}>
                            <Icon className={cn("w-4 h-4", cmd.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "font-medium",
                                selectedIndex === globalIndex ? "text-primary" : "text-foreground"
                              )}>
                                {cmd.label}
                              </span>
                              <code className="text-[10px] px-1.5 py-0.5 bg-muted rounded font-mono text-muted-foreground">
                                {cmd.command}
                              </code>
                            </div>
                            <p className="text-xs text-muted-foreground truncate">
                              {cmd.description}
                            </p>
                          </div>
                          {cmd.shortcut && (
                            <kbd className="px-2 py-1 text-xs font-medium bg-muted rounded text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                              ⌘{cmd.shortcut}
                            </kbd>
                          )}
                          {cmd.subCommands && (
                            <ArrowRight className="w-4 h-4 text-muted-foreground" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        {/* Footer hint */}
        <div className="px-3 py-2 border-t border-border/50 bg-muted/20">
          <p className="text-[11px] text-muted-foreground text-center">
            Digite <code className="px-1 py-0.5 bg-muted rounded">/</code> para ver todos os comandos disponíveis
          </p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

// Export command list for use elsewhere
export { SLASH_COMMANDS };
