import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: 'Mínimo 6 caracteres', test: (p) => p.length >= 6 },
  { label: 'Letra maiúscula', test: (p) => /[A-Z]/.test(p) },
  { label: 'Letra minúscula', test: (p) => /[a-z]/.test(p) },
  { label: 'Número', test: (p) => /\d/.test(p) },
];

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => {
    if (!password) return 0;
    return requirements.filter((req) => req.test(password)).length;
  }, [password]);

  const strengthLabel = useMemo(() => {
    if (strength === 0) return '';
    if (strength === 1) return 'Fraca';
    if (strength === 2) return 'Razoável';
    if (strength === 3) return 'Boa';
    return 'Forte';
  }, [strength]);

  const strengthColor = useMemo(() => {
    if (strength <= 1) return 'bg-destructive';
    if (strength === 2) return 'bg-warning';
    if (strength === 3) return 'bg-info';
    return 'bg-success';
  }, [strength]);

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="space-y-2 mt-2"
    >
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex gap-1">
          {[1, 2, 3, 4].map((level) => (
            <motion.div
              key={level}
              initial={{ scaleX: 0 }}
              animate={{ scaleX: strength >= level ? 1 : 0 }}
              transition={{ delay: level * 0.1 }}
              className={`flex-1 h-full origin-left rounded-full ${
                strength >= level ? strengthColor : 'bg-muted'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium ${
          strength <= 1 ? 'text-destructive' :
          strength === 2 ? 'text-warning' :
          strength === 3 ? 'text-info' :
          'text-success'
        }`}>
          {strengthLabel}
        </span>
      </div>

      {/* Requirements Checklist */}
      <div className="grid grid-cols-2 gap-1">
        {requirements.map((req, index) => {
          const met = req.test(password);
          return (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-1.5"
            >
              {met ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <X className="w-3 h-3 text-muted-foreground" />
              )}
              <span className={`text-xs ${met ? 'text-success' : 'text-muted-foreground'}`}>
                {req.label}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
