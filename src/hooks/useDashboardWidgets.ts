import { useState, useEffect } from 'react';

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'stats' | 'challenges' | 'ai-stats' | 'queues' | 'leaderboard' | 'activity' | 'achievements';
  visible: boolean;
  order: number;
  size: 'small' | 'medium' | 'large' | 'full';
}

const defaultWidgets: DashboardWidget[] = [
  { id: 'stats', title: 'Estatísticas', type: 'stats', visible: true, order: 0, size: 'full' },
  { id: 'challenges', title: 'Desafios do Dia', type: 'challenges', visible: true, order: 1, size: 'full' },
  { id: 'ai-stats', title: 'IA Stats', type: 'ai-stats', visible: true, order: 2, size: 'small' },
  { id: 'queues', title: 'Status das Filas', type: 'queues', visible: true, order: 3, size: 'medium' },
  { id: 'leaderboard', title: 'Ranking', type: 'leaderboard', visible: true, order: 4, size: 'full' },
  { id: 'activity', title: 'Atividade Recente', type: 'activity', visible: true, order: 5, size: 'full' },
  { id: 'achievements', title: 'Conquistas', type: 'achievements', visible: true, order: 6, size: 'full' },
];

const STORAGE_KEY = 'dashboard-widgets-config';

export function useDashboardWidgets() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Merge with defaults to ensure new widgets are added
        const mergedWidgets = defaultWidgets.map(defaultWidget => {
          const storedWidget = parsed.find((w: DashboardWidget) => w.id === defaultWidget.id);
          return storedWidget ? { ...defaultWidget, ...storedWidget } : defaultWidget;
        });
        return mergedWidgets.sort((a, b) => a.order - b.order);
      } catch {
        return defaultWidgets;
      }
    }
    return defaultWidgets;
  });

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  }, [widgets]);

  const reorderWidgets = (sourceIndex: number, destinationIndex: number) => {
    const result = Array.from(widgets);
    const [removed] = result.splice(sourceIndex, 1);
    result.splice(destinationIndex, 0, removed);
    
    // Update order property
    const reordered = result.map((widget, index) => ({
      ...widget,
      order: index,
    }));
    
    setWidgets(reordered);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    setWidgets(prev => 
      prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, visible: !widget.visible } 
          : widget
      )
    );
  };

  const resetToDefaults = () => {
    setWidgets(defaultWidgets);
    localStorage.removeItem(STORAGE_KEY);
  };

  const visibleWidgets = widgets.filter(w => w.visible);

  return {
    widgets,
    visibleWidgets,
    isEditMode,
    setIsEditMode,
    reorderWidgets,
    toggleWidgetVisibility,
    resetToDefaults,
  };
}
