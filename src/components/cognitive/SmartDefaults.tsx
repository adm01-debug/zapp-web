import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, History, RotateCcw, Star, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Smart Defaults Storage
const STORAGE_KEY = 'smart_defaults';

interface SmartDefaultsData {
  lastView: string;
  savedFilters: Record<string, unknown>;
  recentSearches: string[];
  preferredSettings: Record<string, unknown>;
  frequentActions: string[];
  lastUsedTemplates: string[];
}

function getStoredDefaults(): SmartDefaultsData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : getInitialDefaults();
  } catch {
    return getInitialDefaults();
  }
}

function getInitialDefaults(): SmartDefaultsData {
  return {
    lastView: 'inbox',
    savedFilters: {},
    recentSearches: [],
    preferredSettings: {},
    frequentActions: [],
    lastUsedTemplates: [],
  };
}

// Context
interface SmartDefaultsContextType {
  defaults: SmartDefaultsData;
  updateDefault: <K extends keyof SmartDefaultsData>(key: K, value: SmartDefaultsData[K]) => void;
  addRecentSearch: (search: string) => void;
  addFrequentAction: (action: string) => void;
  clearHistory: () => void;
}

const SmartDefaultsContext = createContext<SmartDefaultsContextType | null>(null);

export function SmartDefaultsProvider({ children }: { children: ReactNode }) {
  const [defaults, setDefaults] = useState<SmartDefaultsData>(getStoredDefaults);
  
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  }, [defaults]);
  
  const updateDefault = useCallback(<K extends keyof SmartDefaultsData>(
    key: K,
    value: SmartDefaultsData[K]
  ) => {
    setDefaults(prev => ({ ...prev, [key]: value }));
  }, []);
  
  const addRecentSearch = useCallback((search: string) => {
    setDefaults(prev => ({
      ...prev,
      recentSearches: [search, ...prev.recentSearches.filter(s => s !== search)].slice(0, 10),
    }));
  }, []);
  
  const addFrequentAction = useCallback((action: string) => {
    setDefaults(prev => ({
      ...prev,
      frequentActions: [action, ...prev.frequentActions.filter(a => a !== action)].slice(0, 5),
    }));
  }, []);
  
  const clearHistory = useCallback(() => {
    setDefaults(getInitialDefaults());
  }, []);
  
  return (
    <SmartDefaultsContext.Provider value={{
      defaults,
      updateDefault,
      addRecentSearch,
      addFrequentAction,
      clearHistory,
    }}>
      {children}
    </SmartDefaultsContext.Provider>
  );
}

export function useSmartDefaults() {
  const context = useContext(SmartDefaultsContext);
  if (!context) {
    throw new Error('useSmartDefaults must be used within SmartDefaultsProvider');
  }
  return context;
}

// Recent Searches Component
interface RecentSearchesProps {
  onSelect: (search: string) => void;
  className?: string;
}

export function RecentSearches({ onSelect, className }: RecentSearchesProps) {
  const { defaults, addRecentSearch } = useSmartDefaults();
  
  if (defaults.recentSearches.length === 0) return null;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <History className="w-4 h-4" />
        <span>Pesquisas recentes</span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {defaults.recentSearches.map((search, i) => (
          <motion.button
            key={search}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              onSelect(search);
              addRecentSearch(search);
            }}
            className="px-3 py-1.5 text-sm bg-muted hover:bg-muted/80 rounded-full transition-colors"
          >
            {search}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Frequent Actions Component
interface FrequentActionsProps {
  actions: Array<{
    id: string;
    label: string;
    icon: ReactNode;
    onClick: () => void;
  }>;
  className?: string;
}

export function FrequentActions({ actions, className }: FrequentActionsProps) {
  const { defaults, addFrequentAction } = useSmartDefaults();
  
  // Sort by frequency
  const sortedActions = [...actions].sort((a, b) => {
    const aIndex = defaults.frequentActions.indexOf(a.id);
    const bIndex = defaults.frequentActions.indexOf(b.id);
    if (aIndex === -1 && bIndex === -1) return 0;
    if (aIndex === -1) return 1;
    if (bIndex === -1) return -1;
    return aIndex - bIndex;
  });
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Star className="w-4 h-4" />
        <span>Ações frequentes</span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {sortedActions.slice(0, 4).map((action, i) => (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => {
              action.onClick();
              addFrequentAction(action.id);
            }}
            className="flex items-center gap-2 px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-left"
          >
            {action.icon}
            <span className="text-sm font-medium">{action.label}</span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// Auto-Save Indicator
interface AutoSaveIndicatorProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  lastSaved?: Date;
  className?: string;
}

export function AutoSaveIndicator({ status, lastSaved, className }: AutoSaveIndicatorProps) {
  const statusConfig = {
    idle: { text: '', icon: null },
    saving: { 
      text: 'Salvando...', 
      icon: <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><RotateCcw className="w-3 h-3" /></motion.div>
    },
    saved: { 
      text: lastSaved ? `Salvo às ${lastSaved.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Salvo', 
      icon: <Check className="w-3 h-3 text-green-500" />
    },
    error: { text: 'Erro ao salvar', icon: null },
  };
  
  const config = statusConfig[status];
  
  if (status === 'idle') return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className
      )}
    >
      {config.icon}
      <span>{config.text}</span>
    </motion.div>
  );
}

// Last Used Templates
interface LastUsedTemplatesProps {
  templates: Array<{
    id: string;
    name: string;
    preview: string;
  }>;
  onSelect: (templateId: string) => void;
  className?: string;
}

export function LastUsedTemplates({ templates, onSelect, className }: LastUsedTemplatesProps) {
  const { defaults, updateDefault } = useSmartDefaults();
  
  const recentTemplates = templates.filter(t => 
    defaults.lastUsedTemplates.includes(t.id)
  ).slice(0, 3);
  
  const handleSelect = (templateId: string) => {
    onSelect(templateId);
    updateDefault('lastUsedTemplates', [
      templateId,
      ...defaults.lastUsedTemplates.filter(id => id !== templateId),
    ].slice(0, 5));
  };
  
  if (recentTemplates.length === 0) return null;
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>Templates recentes</span>
      </div>
      
      <div className="space-y-1">
        {recentTemplates.map((template) => (
          <button
            key={template.id}
            onClick={() => handleSelect(template.id)}
            className="w-full p-3 text-left bg-muted/50 hover:bg-muted rounded-lg transition-colors"
          >
            <div className="font-medium text-sm">{template.name}</div>
            <div className="text-xs text-muted-foreground line-clamp-1">
              {template.preview}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

// Preference Toggle with Memory
interface SmartToggleProps {
  id: string;
  label: string;
  description?: string;
  defaultValue?: boolean;
  onChange?: (value: boolean) => void;
}

export function SmartToggle({
  id,
  label,
  description,
  defaultValue = false,
  onChange,
}: SmartToggleProps) {
  const { defaults, updateDefault } = useSmartDefaults();
  const storedValue = (defaults.preferredSettings[id] as boolean) ?? defaultValue;
  const [value, setValue] = useState(storedValue);
  
  const handleChange = () => {
    const newValue = !value;
    setValue(newValue);
    updateDefault('preferredSettings', {
      ...defaults.preferredSettings,
      [id]: newValue,
    });
    onChange?.(newValue);
  };
  
  return (
    <button
      onClick={handleChange}
      className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-muted/50 transition-colors"
    >
      <div>
        <div className="font-medium text-sm">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground">{description}</div>
        )}
      </div>
      
      <div className={cn(
        "relative w-11 h-6 rounded-full transition-colors",
        value ? "bg-primary" : "bg-muted"
      )}>
        <motion.div
          animate={{ x: value ? 20 : 2 }}
          className="absolute top-1 w-4 h-4 bg-background rounded-full shadow-sm"
        />
      </div>
    </button>
  );
}
