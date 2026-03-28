import { useState } from 'react';
import { Filter, X, Calendar, User, Tag, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format, subDays, startOfDay, endOfDay, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAgents } from '@/hooks/useAgents';
import { useTags } from '@/hooks/useTags';
import { motion, AnimatePresence } from 'framer-motion';

export interface InboxFiltersState {
  status: string[];
  tags: string[];
  agentId: string | null;
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
}

interface InboxFiltersProps {
  filters: InboxFiltersState;
  onFiltersChange: (filters: InboxFiltersState) => void;
}

const STATUS_OPTIONS = [
  { value: 'unread', label: 'Não lidas', color: 'bg-primary' },
  { value: 'read', label: 'Lidas', color: 'bg-muted-foreground' },
  { value: 'pending', label: 'Pendentes', color: 'bg-warning' },
  { value: 'resolved', label: 'Resolvidas', color: 'bg-success' },
];

const DATE_PRESETS = [
  { label: 'Hoje', getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: 'Últimos 7 dias', getValue: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: 'Últimos 30 dias', getValue: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: 'Este mês', getValue: () => ({ from: startOfDay(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), to: endOfDay(new Date()) }) },
];

export function InboxFilters({ filters, onFiltersChange }: InboxFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { agents } = useAgents();
  const { tags } = useTags();

  const activeFiltersCount = 
    filters.status.length + 
    filters.tags.length + 
    (filters.agentId ? 1 : 0) + 
    (filters.dateRange.from ? 1 : 0);

  const toggleStatus = (status: string) => {
    const newStatus = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    onFiltersChange({ ...filters, status: newStatus });
  };

  const toggleTag = (tagId: string) => {
    const newTags = filters.tags.includes(tagId)
      ? filters.tags.filter(t => t !== tagId)
      : [...filters.tags, tagId];
    onFiltersChange({ ...filters, tags: newTags });
  };

  const setAgent = (agentId: string | null) => {
    onFiltersChange({ ...filters, agentId: agentId === 'all' ? null : agentId });
  };

  const setDateRange = (range: { from: Date | null; to: Date | null }) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const clearFilters = () => {
    onFiltersChange({
      status: [],
      tags: [],
      agentId: null,
      dateRange: { from: null, to: null },
    });
  };

  const removeFilter = (type: 'status' | 'tag' | 'agent' | 'date', value?: string) => {
    switch (type) {
      case 'status':
        onFiltersChange({ ...filters, status: filters.status.filter(s => s !== value) });
        break;
      case 'tag':
        onFiltersChange({ ...filters, tags: filters.tags.filter(t => t !== value) });
        break;
      case 'agent':
        onFiltersChange({ ...filters, agentId: null });
        break;
      case 'date':
        onFiltersChange({ ...filters, dateRange: { from: null, to: null } });
        break;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn(
                "gap-2",
                activeFiltersCount > 0 && "border-primary text-primary"
              )}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
            <div className="p-4 border-b border-border">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-foreground">Filtros Avançados</h4>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                    Limpar tudo
                  </Button>
                )}
              </div>
            </div>

            <div className="max-h-[400px] overflow-y-auto p-4 pb-6">
              <div className="space-y-6">
                {/* Status Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Status</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {STATUS_OPTIONS.map(status => (
                      <button
                        key={status.value}
                        onClick={() => toggleStatus(status.value)}
                        className={cn(
                          "flex items-center gap-2 p-2 rounded-lg border text-sm transition-all",
                          filters.status.includes(status.value)
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border hover:border-muted-foreground"
                        )}
                      >
                        <div className={cn("w-2 h-2 rounded-full", status.color)} />
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Tags Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Tags</Label>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {tags.length > 0 ? (
                      tags.map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => toggleTag(tag.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all",
                            filters.tags.includes(tag.id)
                              ? "ring-2 ring-primary ring-offset-1"
                              : "hover:opacity-80"
                          )}
                          style={{ 
                            backgroundColor: `${tag.color}20`,
                            color: tag.color,
                            borderColor: tag.color
                          }}
                        >
                          <div 
                            className="w-2 h-2 rounded-full" 
                            style={{ backgroundColor: tag.color }}
                          />
                          {tag.name}
                        </button>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">Nenhuma tag disponível</p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Agent Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Atendente</Label>
                  </div>
                  <Select 
                    value={filters.agentId || 'all'} 
                    onValueChange={setAgent}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os atendentes" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os atendentes</SelectItem>
                      {agents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-2 h-2 rounded-full",
                              agent.status === 'online' && "bg-success",
                              agent.status === 'away' && "bg-warning",
                              agent.status === 'offline' && "bg-muted-foreground"
                            )} />
                            {agent.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Date Filter */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <Label className="text-sm font-medium">Período</Label>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {DATE_PRESETS.map(preset => (
                      <Button
                        key={preset.label}
                        variant="outline"
                        size="sm"
                        onClick={() => setDateRange(preset.getValue())}
                        className="text-xs h-7"
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>

                  {filters.dateRange.from && (
                    <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-2">
                      {format(filters.dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                      {filters.dateRange.to && ` - ${format(filters.dateRange.to, "dd/MM/yyyy", { locale: ptBR })}`}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Active Filters Badges */}
        <AnimatePresence>
          {activeFiltersCount > 0 && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-wrap gap-1"
            >
              {filters.status.map(status => {
                const statusOption = STATUS_OPTIONS.find(s => s.value === status);
                return (
                  <Badge
                    key={status}
                    variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => removeFilter('status', status)}
                  >
                    {statusOption?.label}
                    <X className="w-3 h-3" />
                  </Badge>
                );
              })}

              {filters.tags.map(tagId => {
                const tag = tags.find(t => t.id === tagId);
                return tag ? (
                  <Badge
                    key={tagId}
                    variant="secondary"
                    className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                    style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
                    onClick={() => removeFilter('tag', tagId)}
                  >
                    {tag.name}
                    <X className="w-3 h-3" />
                  </Badge>
                ) : null;
              })}

              {filters.agentId && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeFilter('agent')}
                >
                  {agents.find(a => a.id === filters.agentId)?.name || 'Atendente'}
                  <X className="w-3 h-3" />
                </Badge>
              )}

              {filters.dateRange.from && (
                <Badge
                  variant="secondary"
                  className="gap-1 pr-1 cursor-pointer hover:bg-destructive/20"
                  onClick={() => removeFilter('date')}
                >
                  {format(filters.dateRange.from, "dd/MM", { locale: ptBR })}
                  {filters.dateRange.to && ` - ${format(filters.dateRange.to, "dd/MM", { locale: ptBR })}`}
                  <X className="w-3 h-3" />
                </Badge>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
