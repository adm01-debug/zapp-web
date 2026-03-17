import { useState, useEffect, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Check, X, Undo2, Info, Shield, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Confirmation Dialog
interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'danger';
  onConfirm: () => void;
  onCancel?: () => void;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  if (!open) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/50"
      onClick={() => onOpenChange(false)}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-background border border-border rounded-lg shadow-xl p-6 max-w-md w-full mx-4"
      >
        <div className="flex items-start gap-4">
          <div className={cn(
            "p-2 rounded-full",
            variant === 'danger' ? "bg-destructive/10" : "bg-primary/10"
          )}>
            {variant === 'danger' ? (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            ) : (
              <Info className="w-6 h-6 text-primary" />
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => {
              onCancel?.();
              onOpenChange(false);
            }}
          >
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'destructive' : 'default'}
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Undo Toast
interface UndoToastProps {
  message: string;
  duration?: number;
  onUndo: () => void;
  onDismiss?: () => void;
}

export function UndoToast({ message, duration = 5000, onUndo, onDismiss }: UndoToastProps) {
  const [progress, setProgress] = useState(100);
  const [isVisible, setIsVisible] = useState(true);
  
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        setIsVisible(false);
        onDismiss?.();
        clearInterval(interval);
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [duration, onDismiss]);
  
  if (!isVisible) return null;
  
  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
    >
      <div className="bg-foreground text-background rounded-lg shadow-xl overflow-hidden">
        <div className="flex items-center gap-4 px-4 py-3">
          <span className="text-sm">{message}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              onUndo();
              setIsVisible(false);
            }}
            className="text-primary-foreground hover:text-primary-foreground/80"
          >
            <Undo2 className="w-4 h-4 mr-1" />
            Desfazer
          </Button>
        </div>
        
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: `${progress}%` }}
          className="h-1 bg-primary"
        />
      </div>
    </motion.div>
  );
}

// Real-time Validation
interface ValidationRule {
  test: (value: string) => boolean;
  message: string;
  type: 'error' | 'warning' | 'success';
}

interface RealTimeValidationProps {
  value: string;
  rules: ValidationRule[];
  showOnlyErrors?: boolean;
  className?: string;
}

export function RealTimeValidation({
  value,
  rules,
  showOnlyErrors = false,
  className,
}: RealTimeValidationProps) {
  const results = rules.map(rule => ({
    ...rule,
    passed: rule.test(value),
  }));
  
  const visibleResults = showOnlyErrors
    ? results.filter(r => !r.passed && r.type === 'error')
    : results;
  
  if (visibleResults.length === 0 || !value) return null;
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className={cn("space-y-1 mt-2", className)}
    >
      {visibleResults.map((result, i) => (
        <motion.div
          key={i}
          initial={{ x: -10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.05 }}
          className={cn(
            "flex items-center gap-2 text-sm",
            result.passed ? "text-success" : 
            result.type === 'error' ? "text-destructive" : "text-amber-500"
          )}
        >
          {result.passed ? (
            <Check className="w-4 h-4" />
          ) : result.type === 'error' ? (
            <X className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          <span>{result.message}</span>
        </motion.div>
      ))}
    </motion.div>
  );
}

// Password Strength Meter (enhanced)
interface PasswordStrengthProps {
  password: string;
  className?: string;
}

export function PasswordStrengthMeter({ password, className }: PasswordStrengthProps) {
  const checks = [
    { test: password.length >= 8, label: 'Mínimo 8 caracteres' },
    { test: /[A-Z]/.test(password), label: 'Letra maiúscula' },
    { test: /[a-z]/.test(password), label: 'Letra minúscula' },
    { test: /[0-9]/.test(password), label: 'Número' },
    { test: /[^A-Za-z0-9]/.test(password), label: 'Caractere especial' },
  ];
  
  const passed = checks.filter(c => c.test).length;
  const strength = passed / checks.length;
  
  const strengthLabel = 
    strength <= 0.2 ? 'Muito fraca' :
    strength <= 0.4 ? 'Fraca' :
    strength <= 0.6 ? 'Média' :
    strength <= 0.8 ? 'Forte' :
    'Muito forte';
  
  const strengthColor =
    strength <= 0.2 ? 'bg-destructive' :
    strength <= 0.4 ? 'bg-warning' :
    strength <= 0.6 ? 'bg-warning' :
    strength <= 0.8 ? 'bg-lime-500' :
    'bg-success';
  
  if (!password) return null;
  
  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${strength * 100}%` }}
            className={cn("h-full rounded-full", strengthColor)}
          />
        </div>
        <span className="text-xs font-medium text-muted-foreground min-w-[80px]">
          {strengthLabel}
        </span>
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        {checks.map((check, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              check.test ? "text-success" : "text-muted-foreground"
            )}
          >
            {check.test ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            {check.label}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Safe Action Button
interface SafeActionButtonProps {
  children: ReactNode;
  onAction: () => void;
  confirmTitle: string;
  confirmDescription: string;
  variant?: 'default' | 'danger';
  disabled?: boolean;
  className?: string;
}

export function SafeActionButton({
  children,
  onAction,
  confirmTitle,
  confirmDescription,
  variant = 'default',
  disabled,
  className,
}: SafeActionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  
  return (
    <>
      <Button
        variant={variant === 'danger' ? 'destructive' : 'default'}
        disabled={disabled}
        onClick={() => setShowConfirm(true)}
        className={className}
      >
        {children}
      </Button>
      
      <AnimatePresence>
        {showConfirm && (
          <ConfirmationDialog
            open={showConfirm}
            onOpenChange={setShowConfirm}
            title={confirmTitle}
            description={confirmDescription}
            variant={variant}
            onConfirm={onAction}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Form Guard (prevents leaving with unsaved changes)
interface FormGuardProps {
  isDirty: boolean;
  onConfirmLeave: () => void;
  children: ReactNode;
}

export function FormGuard({ isDirty, onConfirmLeave, children }: FormGuardProps) {
  const [showWarning, setShowWarning] = useState(false);
  
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);
  
  return (
    <>
      {children}
      
      <AnimatePresence>
        {showWarning && (
          <ConfirmationDialog
            open={showWarning}
            onOpenChange={setShowWarning}
            title="Alterações não salvas"
            description="Você tem alterações não salvas. Deseja realmente sair sem salvar?"
            confirmLabel="Sair sem salvar"
            variant="danger"
            onConfirm={onConfirmLeave}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Input with Visual Confirmation
interface ConfirmedInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  className?: string;
}

export function ConfirmedInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  className,
}: ConfirmedInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isConfirmed, setIsConfirmed] = useState(false);
  
  const handleBlur = () => {
    if (localValue !== value) {
      onChange(localValue);
      setIsConfirmed(true);
      setTimeout(() => setIsConfirmed(false), 2000);
    }
  };
  
  return (
    <div className="relative">
      <input
        type={type}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          "w-full px-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all",
          className
        )}
      />
      
      <AnimatePresence>
        {isConfirmed && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute right-3 top-1/2 -translate-y-1/2"
          >
            <Check className="w-4 h-4 text-success" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
