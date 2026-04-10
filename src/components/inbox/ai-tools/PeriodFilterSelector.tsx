import { useState, useMemo, useCallback } from 'react';
import { format, startOfDay as fnsStartOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Calendar, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';

// ── Shared types & constants ──

export type AnalysisPeriod = 'all' | 'last_interaction' | 'today' | '3d' | '7d' | '14d' | '30d' | '90d' | 'custom';

export interface PeriodMessage {
  id: string;
  created_at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const SESSION_GAP_MS = 4 * 60 * 60 * 1000;

export const PERIOD_OPTIONS: { value: AnalysisPeriod; label: string }[] = [
  { value: 'last_interaction', label: 'Última conversa' },
  { value: 'today', label: 'Hoje' },
  { value: '3d', label: 'Últimos 3 dias' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '14d', label: 'Últimos 14 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Toda a conversa' },
  { value: 'custom', label: 'Período personalizado' },
];

const SHORTCUT_PRESETS: { label: string; period: AnalysisPeriod }[] = [
  { label: 'Última conversa', period: 'last_interaction' },
  { label: 'Hoje', period: 'today' },
  { label: '3 dias', period: '3d' },
  { label: '7 dias', period: '7d' },
  { label: '14 dias', period: '14d' },
  { label: '30 dias', period: '30d' },
  { label: '90 dias', period: '90d' },
];

// ── Shared utility functions ──

function startOfDay(date: Date): Date {
  return fnsStartOfDay(date);
}

export function getLastConversationStart<T extends PeriodMessage>(messages: T[]): Date | null {
  if (messages.length === 0) return null;
  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  let sessionStart = new Date(sorted[0].created_at);
  for (let i = 1; i < sorted.length; i++) {
    const newer = new Date(sorted[i - 1].created_at).getTime();
    const older = new Date(sorted[i].created_at).getTime();
    if (newer - older > SESSION_GAP_MS) break;
    sessionStart = new Date(sorted[i].created_at);
  }
  return sessionStart;
}

export function filterMessagesByPeriod<T extends PeriodMessage>(
  messages: T[],
  period: AnalysisPeriod,
  customFrom?: Date | null,
  customTo?: Date | null
): T[] {
  if (period === 'all') return messages;

  if (period === 'custom') {
    if (!customFrom && !customTo) return messages;
    return messages.filter((m) => {
      const d = new Date(m.created_at);
      if (customFrom && d < startOfDay(customFrom)) return false;
      if (customTo) {
        const endOfTo = new Date(startOfDay(customTo).getTime() + DAY_MS - 1);
        if (d > endOfTo) return false;
      }
      return true;
    });
  }

  if (period === 'last_interaction') {
    const sessionStart = getLastConversationStart(messages);
    if (!sessionStart) return [];
    return messages.filter((m) => new Date(m.created_at) >= sessionStart);
  }

  const now = new Date();
  const dayMap: Record<string, number> = { today: 0, '3d': 3, '7d': 7, '14d': 14, '30d': 30, '90d': 90 };
  const days = dayMap[period];
  if (days !== undefined) {
    const cutoff = days === 0 ? startOfDay(now) : startOfDay(new Date(now.getTime() - days * DAY_MS));
    return messages.filter((m) => new Date(m.created_at) >= cutoff);
  }

  return messages;
}

export function getPeriodDays(period: AnalysisPeriod): number | null {
  const map: Record<string, number> = { today: 1, '3d': 3, '7d': 7, '14d': 14, '30d': 30, '90d': 90 };
  return map[period] ?? null;
}

// ── Hook for period filter state ──

export function usePeriodFilter<T extends PeriodMessage>(messages: T[], defaultPeriod: AnalysisPeriod = '7d') {
  const [analysisPeriod, setAnalysisPeriod] = useState<AnalysisPeriod>(defaultPeriod);
  const [customDateFrom, setCustomDateFrom] = useState<Date | undefined>(undefined);
  const [customDateTo, setCustomDateTo] = useState<Date | undefined>(undefined);

  const filteredMessages = useMemo(
    () => filterMessagesByPeriod(messages, analysisPeriod, customDateFrom, customDateTo),
    [messages, analysisPeriod, customDateFrom, customDateTo]
  );

  const handlePeriodChange = useCallback((period: AnalysisPeriod) => {
    setAnalysisPeriod(period);
    if (period !== 'custom') {
      setCustomDateFrom(undefined);
      setCustomDateTo(undefined);
    }
  }, []);

  const handleCustomFromChange = useCallback((date: Date | undefined) => setCustomDateFrom(date), []);
  const handleCustomToChange = useCallback((date: Date | undefined) => setCustomDateTo(date), []);
  const clearCustomDates = useCallback(() => { setCustomDateFrom(undefined); setCustomDateTo(undefined); }, []);

  return {
    analysisPeriod,
    setAnalysisPeriod: handlePeriodChange,
    customDateFrom,
    customDateTo,
    setCustomDateFrom: handleCustomFromChange,
    setCustomDateTo: handleCustomToChange,
    clearCustomDates,
    filteredMessages,
  };
}

// ── Premium UI Component ──

interface PeriodFilterSelectorProps {
  period: AnalysisPeriod;
  onPeriodChange: (period: AnalysisPeriod) => void;
  customFrom?: Date;
  customTo?: Date;
  onCustomFromChange: (date: Date | undefined) => void;
  onCustomToChange: (date: Date | undefined) => void;
  onClearCustom: () => void;
  filteredCount: number;
  totalCount: number;
}

export function PeriodFilterSelector({
  period,
  onPeriodChange,
  customFrom,
  customTo,
  onCustomFromChange,
  onCustomToChange,
  onClearCustom,
  filteredCount,
  totalCount,
}: PeriodFilterSelectorProps) {
  return (
    <div className="space-y-2">
      {/* Select dropdown */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Select value={period} onValueChange={(v) => onPeriodChange(v as AnalysisPeriod)}>
          <SelectTrigger className="h-8 flex-1 rounded-lg text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Custom period — premium layout */}
      <AnimatePresence>
        {period === 'custom' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">Período personalizado</p>
                {(customFrom || customTo) && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px]" onClick={onClearCustom}>
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                )}
              </div>

              {/* Side-by-side: Shortcuts + Calendars */}
              <div className="flex gap-2">
                {/* Shortcuts sidebar */}
                <div className="w-[120px] shrink-0 space-y-0.5">
                  <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground mb-1.5">Atalhos</p>
                  {SHORTCUT_PRESETS.map((s) => (
                    <button
                      key={s.period}
                      type="button"
                      onClick={() => onPeriodChange(s.period)}
                      className="w-full text-left px-2 py-1.5 rounded-md text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>

                {/* Dual calendars */}
                <div className="flex-1 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">De</p>
                      <p className="text-[11px] font-medium text-foreground mt-0.5">
                        {customFrom ? format(customFrom, 'dd/MM/yyyy') : '—'}
                      </p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-widest font-semibold text-muted-foreground">Até</p>
                      <p className="text-[11px] font-medium text-foreground mt-0.5">
                        {customTo ? format(customTo, 'dd/MM/yyyy') : '—'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1">
                    <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                      <CalendarComponent
                        mode="single"
                        selected={customFrom}
                        onSelect={onCustomFromChange}
                        locale={ptBR}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (customTo && date > customTo) return true;
                          return false;
                        }}
                        defaultMonth={customFrom || new Date()}
                        className="p-1.5 pointer-events-auto text-[10px] [&_.rdp-cell]:w-7 [&_.rdp-cell]:h-7 [&_.rdp-day]:w-7 [&_.rdp-day]:h-7 [&_.rdp-head_cell]:w-7 [&_.rdp-caption_label]:text-[11px] [&_.rdp-nav_button]:h-6 [&_.rdp-nav_button]:w-6"
                      />
                    </div>
                    <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
                      <CalendarComponent
                        mode="single"
                        selected={customTo}
                        onSelect={onCustomToChange}
                        locale={ptBR}
                        disabled={(date) => {
                          if (date > new Date()) return true;
                          if (customFrom && date < customFrom) return true;
                          return false;
                        }}
                        defaultMonth={customTo || new Date()}
                        className="p-1.5 pointer-events-auto text-[10px] [&_.rdp-cell]:w-7 [&_.rdp-cell]:h-7 [&_.rdp-day]:w-7 [&_.rdp-day]:h-7 [&_.rdp-head_cell]:w-7 [&_.rdp-caption_label]:text-[11px] [&_.rdp-nav_button]:h-6 [&_.rdp-nav_button]:w-6"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message count */}
      <p className="text-center text-xs tabular-nums text-muted-foreground">
        <span className="font-semibold text-foreground">{filteredCount}</span> mensagens no período
        {totalCount !== filteredCount && (
          <span className="text-muted-foreground/60"> (de {totalCount} total)</span>
        )}
      </p>
    </div>
  );
}
