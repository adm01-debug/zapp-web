import * as React from 'react';
import { motion, AnimatePresence, useDragControls, PanInfo } from 'framer-motion';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { Button } from './button';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  description?: string;
  snapPoints?: number[];
  defaultSnap?: number;
  className?: string;
  showHandle?: boolean;
  closeOnOutsideClick?: boolean;
  fullScreen?: boolean;
}

export function BottomSheet({
  isOpen,
  onClose,
  children,
  title,
  description,
  snapPoints = [0.5, 0.9],
  defaultSnap = 0,
  className,
  showHandle = true,
  closeOnOutsideClick = true,
  fullScreen = false,
}: BottomSheetProps) {
  const dragControls = useDragControls();
  const [currentSnap, setCurrentSnap] = React.useState(defaultSnap);
  const [isDragging, setIsDragging] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const height = fullScreen ? '100%' : `${snapPoints[currentSnap] * 100}vh`;
  const maxHeight = fullScreen ? '100vh' : `${Math.max(...snapPoints) * 100}vh`;

  // Close on Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    const velocity = info.velocity.y;
    const offset = info.offset.y;

    // Close if dragged down significantly or with velocity
    if (offset > 100 || velocity > 500) {
      onClose();
      return;
    }

    // Snap to nearest point based on position
    if (offset < -50 && currentSnap < snapPoints.length - 1) {
      setCurrentSnap(currentSnap + 1);
    } else if (offset > 50 && currentSnap > 0) {
      setCurrentSnap(currentSnap - 1);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOnOutsideClick ? onClose : undefined}
            className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Sheet */}
          <motion.div
            ref={containerRef}
            initial={{ y: '100%' }}
            animate={{ y: 0, height }}
            exit={{ y: '100%' }}
            transition={{
              type: 'spring',
              damping: 30,
              stiffness: 300,
              mass: 0.8,
            }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.1, bottom: 0.5 }}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={handleDragEnd}
            style={{ maxHeight }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[101]',
              'bg-card border-t border-border rounded-t-3xl shadow-2xl',
              'flex flex-col overflow-hidden',
              isDragging && 'cursor-grabbing',
              className
            )}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'bottom-sheet-title' : undefined}
            aria-describedby={description ? 'bottom-sheet-description' : undefined}
          >
            {/* Drag Handle */}
            {showHandle && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="flex justify-center py-3 cursor-grab active:cursor-grabbing touch-none"
              >
                <motion.div
                  className="w-12 h-1.5 rounded-full bg-muted-foreground/30"
                  whileHover={{ scaleX: 1.2, backgroundColor: 'hsl(var(--muted-foreground) / 0.5)' }}
                  transition={{ duration: 0.15 }}
                />
              </div>
            )}

            {/* Header */}
            {(title || description) && (
              <div className="px-4 pb-3 border-b border-border">
                <div className="flex items-center justify-between">
                  {title && (
                    <h2
                      id="bottom-sheet-title"
                      className="font-display text-lg font-semibold text-foreground"
                    >
                      {title}
                    </h2>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 rounded-full"
                    aria-label="Fechar"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                {description && (
                  <p
                    id="bottom-sheet-description"
                    className="text-sm text-muted-foreground mt-1"
                  >
                    {description}
                  </p>
                )}
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4">
              {children}
            </div>

            {/* Safe area padding for iOS */}
            <div className="safe-area-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Action Sheet variant - for quick action selection
interface ActionSheetAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
  onSelect: () => void;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: ActionSheetAction[];
  cancelLabel?: string;
}

export function ActionSheet({
  isOpen,
  onClose,
  title,
  description,
  actions,
  cancelLabel = 'Cancelar',
}: ActionSheetProps) {
  const handleSelect = (action: ActionSheetAction) => {
    if (action.disabled) return;
    action.onSelect();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.4]}
      showHandle={true}
    >
      {/* Header */}
      {(title || description) && (
        <div className="text-center pb-4 border-b border-border mb-2">
          {title && (
            <h3 className="font-display font-semibold text-foreground">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="space-y-1">
        {actions.map((action) => (
          <motion.button
            key={action.id}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(action)}
            disabled={action.disabled}
            className={cn(
              'w-full flex items-center gap-3 p-4 rounded-xl transition-colors',
              'text-left font-medium',
              action.disabled && 'opacity-50 cursor-not-allowed',
              action.variant === 'destructive'
                ? 'text-destructive hover:bg-destructive/10'
                : 'text-foreground hover:bg-muted'
            )}
          >
            {action.icon && (
              <span className={cn(
                'flex-shrink-0',
                action.variant === 'destructive' ? 'text-destructive' : 'text-muted-foreground'
              )}>
                {action.icon}
              </span>
            )}
            <span>{action.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Cancel */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onClose}
        className="w-full p-4 mt-4 rounded-xl bg-muted text-foreground font-medium text-center hover:bg-muted/80 transition-colors"
      >
        {cancelLabel}
      </motion.button>
    </BottomSheet>
  );
}

// Filter Sheet - specialized for filter selection
interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface FilterGroup {
  id: string;
  title: string;
  options: FilterOption[];
  multiple?: boolean;
}

interface FilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  groups: FilterGroup[];
  selectedFilters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
  onReset?: () => void;
  onApply?: () => void;
}

export function FilterSheet({
  isOpen,
  onClose,
  title = 'Filtros',
  groups,
  selectedFilters,
  onFiltersChange,
  onReset,
  onApply,
}: FilterSheetProps) {
  const [localFilters, setLocalFilters] = React.useState(selectedFilters);

  React.useEffect(() => {
    setLocalFilters(selectedFilters);
  }, [selectedFilters, isOpen]);

  const toggleOption = (groupId: string, optionId: string, multiple: boolean) => {
    setLocalFilters((prev) => {
      const current = prev[groupId] || [];
      let updated: string[];

      if (multiple) {
        updated = current.includes(optionId)
          ? current.filter((id) => id !== optionId)
          : [...current, optionId];
      } else {
        updated = current.includes(optionId) ? [] : [optionId];
      }

      return { ...prev, [groupId]: updated };
    });
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onApply?.();
    onClose();
  };

  const handleReset = () => {
    const resetFilters: Record<string, string[]> = {};
    groups.forEach((g) => (resetFilters[g.id] = []));
    setLocalFilters(resetFilters);
    onReset?.();
  };

  const activeCount = Object.values(localFilters).flat().length;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      snapPoints={[0.6, 0.9]}
    >
      <div className="space-y-6">
        {groups.map((group) => (
          <div key={group.id}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">
              {group.title}
            </h4>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => {
                const isSelected = (localFilters[group.id] || []).includes(option.id);
                return (
                  <motion.button
                    key={option.id}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleOption(group.id, option.id, group.multiple || false)}
                    className={cn(
                      'px-3 py-2 rounded-full text-sm font-medium transition-all',
                      'border',
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-foreground border-border hover:border-primary/50'
                    )}
                  >
                    {option.label}
                    {option.count !== undefined && (
                      <span className={cn(
                        'ml-1.5 text-xs',
                        isSelected ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        ({option.count})
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-6 pt-4 border-t border-border">
        <Button
          variant="outline"
          className="flex-1"
          onClick={handleReset}
          disabled={activeCount === 0}
        >
          Limpar {activeCount > 0 && `(${activeCount})`}
        </Button>
        <Button
          className="flex-1"
          onClick={handleApply}
        >
          Aplicar
        </Button>
      </div>
    </BottomSheet>
  );
}

// Confirmation Sheet
interface ConfirmationSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
}

export function ConfirmationSheet({
  isOpen,
  onClose,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmationSheetProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onClose();
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.3]}
    >
      <div className="text-center py-4">
        <h3 className="font-display text-lg font-semibold text-foreground mb-2">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mb-6">{description}</p>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            className="flex-1"
            onClick={handleConfirm}
            isLoading={isLoading}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
}
