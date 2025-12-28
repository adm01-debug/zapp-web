import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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
    const [isFocused, setIsFocused] = React.useState(false);
    const [hasValue, setHasValue] = React.useState(!!props.value || !!props.defaultValue);
    const inputId = id || React.useId();
    const errorId = `${inputId}-error`;
    const hintId = `${inputId}-hint`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setHasValue(!!e.target.value);
      props.onChange?.(e);
    };

    return (
      <div className="relative w-full space-y-1.5">
        {/* Label (non-floating) */}
        {label && !floatingLabel && (
          <label 
            htmlFor={inputId}
            className="text-sm font-medium text-foreground"
          >
            {label}
            {props.required && <span className="text-destructive ml-1">*</span>}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative group">
          {/* Left icon */}
          {leftIcon && (
            <div className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors",
              isFocused && "text-primary",
              error && "text-destructive"
            )}>
              {leftIcon}
            </div>
          )}

          {/* Floating label */}
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

          {/* Input */}
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
              // Focus glow effect
              "focus-visible:shadow-[0_0_0_3px_hsl(var(--primary)/0.1)]",
              // States
              error 
                ? "border-destructive focus-visible:ring-destructive" 
                : "border-input focus-visible:ring-ring focus-visible:border-primary",
              // Icon padding
              leftIcon && "pl-10",
              rightIcon && "pr-10",
              // Loading state
              isLoading && "pr-10",
              // Floating label padding
              floatingLabel && "pt-4",
              className,
            )}
            {...props}
          />

          {/* Right icon or loading spinner */}
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

          {/* Focus ring animation */}
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

        {/* Error message */}
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
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Hint text */}
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

export { EnhancedInput };
