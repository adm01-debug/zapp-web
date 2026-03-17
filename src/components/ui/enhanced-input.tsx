import * as React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Input } from './input';
import { Label } from './label';
import { Check, X, AlertCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

interface EnhancedInputProps extends React.ComponentProps<'input'> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isLoading?: boolean;
  floatingLabel?: boolean;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  ({ 
    className, 
    type,
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    isLoading,
    floatingLabel = false,
    id,
    ...props 
  }, ref) => {
    const [isFocused, setIsFocused] = useState(false);
    const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className="relative w-full space-y-1.5">
        {label && !floatingLabel && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        <div className="relative group">
          {leftIcon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
              isFocused && "text-primary",
              error && "text-destructive"
            )}>
              {leftIcon}
            </div>
          )}

          {label && floatingLabel && (
            <motion.label
              htmlFor={inputId}
              initial={false}
              animate={{
                y: isFocused || hasValue ? -24 : 0,
                scale: isFocused || hasValue ? 0.85 : 1,
                x: isFocused || hasValue ? -4 : 0,
              }}
              className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 origin-left",
                "pointer-events-none transition-colors duration-200",
                "text-muted-foreground",
                (isFocused || hasValue) && "text-primary",
                error && "text-destructive",
                leftIcon && "left-10"
              )}
            >
              {label}
              {props.required && <span className="text-destructive ml-1">*</span>}
            </motion.label>
          )}

          <input
            type={type}
            id={inputId}
            ref={ref}
            onFocus={(e) => {
              setIsFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              props.onBlur?.(e);
            }}
            onChange={handleChange}
            aria-invalid={!!error}
            aria-describedby={cn(
              error && errorId,
              hint && !error && hintId
            ) || undefined}
            className={cn(
              "flex h-11 w-full rounded-lg border bg-background px-3 py-2 text-base",
              "ring-offset-background transition-all duration-200",
              "file:border-0 file:bg-transparent file:text-sm file:font-medium",
              "placeholder:text-muted-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
              error 
                ? "border-destructive focus-visible:ring-destructive" 
                : "border-input focus-visible:ring-ring focus-visible:border-primary",
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              isLoading && "pr-10",
              floatingLabel && "pt-4",
              className,
            )}
            {...props}
          />

          {(rightIcon || isLoading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                />
              ) : (
                rightIcon
              )}
            </div>
          )}

          <AnimatePresence>
            {isFocused && !error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="absolute inset-0 rounded-lg pointer-events-none ring-2 ring-primary/20"
              />
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              id={errorId}
              role="alert"
              initial={{ opacity: 0, y: -5, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -5, height: 0 }}
              className="text-sm text-destructive flex items-center gap-1"
            >
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {hint && !error && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  },
);
EnhancedInput.displayName = 'EnhancedInput';

// Password input with toggle and strength meter
interface PasswordInputEnhancedProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  showStrength?: boolean;
}

export function PasswordInputEnhanced({ 
  label,
  error,
  showStrength = false,
  className,
  ...props 
}: PasswordInputEnhancedProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [strength, setStrength] = useState(0);

  const calculateStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;
    return Math.min(score, 4);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (showStrength) {
      setStrength(calculateStrength(e.target.value));
    }
    props.onChange?.(e);
  };

  const strengthColors = ['bg-destructive', 'bg-warning', 'bg-warning', 'bg-success'];
  const strengthLabels = ['Fraca', 'Regular', 'Boa', 'Forte'];

  return (
    <div className={cn('space-y-2', className)}>
      {label && <Label>{label}</Label>}
      <div className="relative">
        <Input
          {...props}
          type={showPassword ? 'text' : 'password'}
          onChange={handleChange}
          error={!!error}
          className="pr-10"
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {showStrength && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i < strength ? strengthColors[strength - 1] : 'bg-muted'
                )}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: i * 0.1 }}
              />
            ))}
          </div>
          {strength > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-muted-foreground"
            >
              Força: {strengthLabels[strength - 1]}
            </motion.p>
          )}
        </div>
      )}

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-destructive"
        >
          {error}
        </motion.p>
      )}
    </div>
  );
}

// Search input with debounce
interface DebouncedSearchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  onSearch: (value: string) => void;
  debounceMs?: number;
  loading?: boolean;
  onClear?: () => void;
}

export function DebouncedSearchInput({ 
  onSearch,
  debounceMs = 300,
  loading = false,
  onClear,
  className,
  ...props 
}: DebouncedSearchProps) {
  const [value, setValue] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      onSearch(newValue);
    }, debounceMs);
  }, [onSearch, debounceMs]);

  const handleClear = () => {
    setValue('');
    onSearch('');
    onClear?.();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={cn('relative', className)}>
      <Input
        {...props}
        value={value}
        onChange={handleChange}
        className="pr-10"
      />
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        ) : value ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Limpar busca"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

// Inline edit input
interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineEdit({ 
  value: initialValue, 
  onSave,
  placeholder = 'Clique para editar',
  className 
}: InlineEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    setIsEditing(false);
    if (value !== initialValue) {
      onSave(value);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setValue(initialValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="h-8"
        />
        <button
          type="button"
          onClick={handleSave}
          className="p-1 text-success hover:bg-success/10 rounded transition-colors"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleCancel}
          className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        'text-left px-2 py-1 rounded hover:bg-muted transition-colors min-w-[100px]',
        !value && 'text-muted-foreground italic',
        className
      )}
    >
      {value || placeholder}
    </button>
  );
}

// OTP Input
interface OTPInputProps {
  length?: number;
  onComplete: (code: string) => void;
  disabled?: boolean;
  error?: boolean;
}

export function OTPInput({ 
  length = 6, 
  onComplete,
  disabled = false,
  error = false
}: OTPInputProps) {
  const [values, setValues] = useState<string[]>(Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newValues = [...values];
    newValues[index] = value.slice(-1);
    setValues(newValues);

    if (value && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    const code = newValues.join('');
    if (code.length === length) {
      onComplete(code);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !values[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;

    const newValues = [...values];
    pastedData.split('').forEach((char, i) => {
      if (i < length) newValues[i] = char;
    });
    setValues(newValues);

    if (pastedData.length === length) {
      onComplete(pastedData);
    } else {
      inputRefs.current[pastedData.length]?.focus();
    }
  };

  return (
    <div className="flex gap-2 justify-center">
      {values.map((value, index) => (
        <motion.input
          key={index}
          ref={(el) => { inputRefs.current[index] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-12 h-14 text-center text-xl font-semibold rounded-lg border bg-background',
            'outline-none transition-all duration-200',
            'focus:ring-2 focus:ring-primary/20 focus:border-primary',
            error && 'border-destructive shake',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: index * 0.05 }}
        />
      ))}
    </div>
  );
}

export { EnhancedInput };
