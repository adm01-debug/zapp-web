import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTACT_TYPES } from '@/utils/whatsappFileTypes';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Phone, Mail, Building, Briefcase, AlertCircle,
  CheckCircle2, Loader2, Info, Smile,
} from 'lucide-react';
import { useExternalCargos } from '@/hooks/useExternalCargos';
import { useExternalEmpresas } from '@/hooks/useExternalEmpresas';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ContactFormValues {
  name: string;
  nickname?: string | null;
  surname?: string | null;
  job_title?: string | null;
  company?: string | null;
  phone: string;
  email?: string | null;
  contact_type?: string | null;
}

interface ContactFormProps {
  values: ContactFormValues;
  onChange: (field: string, value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  submitLabel: string;
  isSubmitting?: boolean;
}

// Validation helpers
const validateEmail = (email: string): boolean => {
  if (!email) return true; // Optional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const validatePhone = (phone: string): boolean => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
};

const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.startsWith('55')) {
    if (cleaned.length <= 4) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`;
    if (cleaned.length <= 6) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`;
    if (cleaned.length <= 11) return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9, 13)}`;
  }
  return value;
};

type FieldError = Record<string, string | null>;

export const ContactForm = React.memo(function ContactForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
  isSubmitting = false,
}: ContactFormProps) {
  const { data: externalCargos = [] } = useExternalCargos();
  const { data: externalEmpresas = [] } = useExternalEmpresas();
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const empresaBlurTimer = useRef<ReturnType<typeof setTimeout>>();
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<FieldError>({});
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const dupCheckTimer = useRef<ReturnType<typeof setTimeout>>();

  // Check for duplicate phone
  const checkDuplicate = useCallback(async (phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) { setDuplicateWarning(null); return; }
    const { data } = await supabase
      .from('contacts')
      .select('name, phone')
      .or(`phone.ilike.%${cleaned.slice(-8)}%`)
      .limit(1);
    if (data && data.length > 0) {
      setDuplicateWarning(`Possível duplicata: "${data[0].name}" (${data[0].phone})`);
    } else {
      setDuplicateWarning(null);
    }
  }, []);

  const validate = useCallback((field: string, value: string): string | null => {
    switch (field) {
      case 'name':
        if (!value.trim()) return 'Nome é obrigatório';
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        if (value.length > 100) return 'Nome deve ter no máximo 100 caracteres';
        return null;
      case 'phone':
        if (!value.trim()) return 'Telefone é obrigatório';
        if (!validatePhone(value)) return 'Formato inválido (mín. 10 dígitos)';
        return null;
      case 'email':
        if (value && !validateEmail(value)) return 'Email inválido';
        return null;
      case 'surname':
        if (value && value.length > 100) return 'Máximo 100 caracteres';
        return null;
      default:
        return null;
    }
  }, []);

  const handleChange = useCallback((field: string, value: string) => {
    onChange(field, value);
    if (touched[field]) {
      setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
    }
  }, [onChange, touched, validate]);

  const handleBlur = useCallback((field: string, value: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
    setErrors(prev => ({ ...prev, [field]: validate(field, value) }));
  }, [validate]);

  const handlePhoneChange = useCallback((value: string) => {
    const formatted = formatPhone(value);
    onChange('phone', formatted);
    if (touched.phone) {
      setErrors(prev => ({ ...prev, phone: validate('phone', formatted) }));
    }
    // Debounced duplicate check
    clearTimeout(dupCheckTimer.current);
    dupCheckTimer.current = setTimeout(() => checkDuplicate(formatted), 500);
  }, [onChange, touched, validate, checkDuplicate]);

  const handleSubmit = useCallback(() => {
    const newErrors: FieldError = {
      name: validate('name', values.name),
      phone: validate('phone', values.phone),
      email: validate('email', values.email || ''),
    };
    setErrors(newErrors);
    setTouched({ name: true, phone: true, email: true });
    
    if (Object.values(newErrors).some(e => e !== null)) return;
    onSubmit();
  }, [values, validate, onSubmit]);

  const isValid = useMemo(() => {
    return values.name.trim().length >= 2 && validatePhone(values.phone) &&
      (!values.email || validateEmail(values.email));
  }, [values.name, values.phone, values.email]);

  const renderFieldStatus = (field: string) => {
    const error = errors[field];
    const isTouched = touched[field];
    const value = (values as unknown as Record<string, string | null | undefined>)[field] || '';
    
    if (!isTouched) return null;
    if (error) {
      return (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1 text-destructive text-xs mt-1"
          role="alert"
        >
          <AlertCircle className="w-3 h-3" />
          {error}
        </motion.div>
      );
    }
    if (value && String(value).trim()) {
      return (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <CheckCircle2 className="w-4 h-4 text-success" />
        </motion.div>
      );
    }
    return null;
  };

  return (
    <TooltipProvider>
      <div
        className="space-y-4 pt-4"
        role="form"
        aria-label="Formulário de contato"
        onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit(); }}
      >
        {/* Name + Surname */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-muted-foreground" />
              Nome Principal
              <span className="text-destructive">*</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Nome usado para identificar o contato</p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="relative">
              <Input
                id="name"
                placeholder="Nome do contato"
                value={values.name}
                onChange={(e) => handleChange('name', e.target.value)}
                onBlur={() => handleBlur('name', values.name)}
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
                className={cn(
                  'transition-all duration-200',
                  errors.name && touched.name && 'border-destructive focus-visible:ring-destructive',
                  !errors.name && touched.name && values.name.trim() && 'border-success/50 focus-visible:ring-success/30',
                )}
                maxLength={100}
              />
              {renderFieldStatus('name')}
            </div>
            {errors.name && touched.name && (
              <p id="name-error" className="sr-only">{errors.name}</p>
            )}
            <AnimatePresence>
              {touched.name && errors.name && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-destructive text-xs" role="alert">
                  <AlertCircle className="w-3 h-3" /> {errors.name}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="surname" className="flex items-center gap-1.5">
              Sobrenome
            </Label>
            <Input
              id="surname"
              placeholder="Sobrenome"
              value={values.surname || ''}
              onChange={(e) => handleChange('surname', e.target.value)}
              aria-label="Sobrenome do contato"
              maxLength={100}
            />
          </div>
        </div>

        {/* Nickname + Type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="nickname" className="flex items-center gap-1.5">
              <Smile className="w-3.5 h-3.5 text-muted-foreground" />
              Apelido
            </Label>
            <Input
              id="nickname"
              placeholder="Como prefere ser chamado"
              value={values.nickname || ''}
              onChange={(e) => handleChange('nickname', e.target.value)}
              aria-label="Apelido do contato"
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_type" className="flex items-center gap-1.5">
              Tipo de Contato
            </Label>
            <Select
              value={values.contact_type || 'cliente'}
              onValueChange={(value) => onChange('contact_type', value)}
            >
              <SelectTrigger aria-label="Selecionar tipo de contato">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTACT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", type.color)} />
                      {type.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Job + Company — Conditional: show extra context based on type */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="job_title" className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
              Cargo
            </Label>
            <Select
              value={values.job_title || '__none__'}
              onValueChange={(v) => handleChange('job_title', v === '__none__' ? '' : v)}
            >
              <SelectTrigger id="job_title" aria-label="Cargo do contato">
                <SelectValue placeholder="Selecione o cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Selecione o cargo</SelectItem>
                {externalCargos.map((cargo) => (
                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company" className="flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-muted-foreground" />
              Empresa
            </Label>
            <div className="relative">
              <Input
                id="company"
                placeholder="Buscar empresa..."
                value={values.company || ''}
                onChange={(e) => {
                  handleChange('company', e.target.value);
                  setEmpresaSearch(e.target.value);
                  setShowEmpresaDropdown(e.target.value.length >= 1);
                }}
                onFocus={() => {
                  clearTimeout(empresaBlurTimer.current);
                  const val = values.company || '';
                  setEmpresaSearch(val);
                  setShowEmpresaDropdown(val.length >= 1);
                }}
                onBlur={() => {
                  empresaBlurTimer.current = setTimeout(() => setShowEmpresaDropdown(false), 200);
                }}
                aria-label="Empresa do contato"
                autoComplete="off"
              />
              {showEmpresaDropdown && empresaSearch.length >= 1 && (() => {
                const filtered = externalEmpresas.filter(e =>
                  e.toLowerCase().includes(empresaSearch.toLowerCase())
                ).slice(0, 8);
                return filtered.length > 0 ? (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                    {filtered.map((empresa) => (
                      <button
                        key={empresa}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          handleChange('company', empresa);
                          setEmpresaSearch('');
                          setShowEmpresaDropdown(false);
                        }}
                      >
                        {empresa}
                      </button>
                    ))}
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </div>

        {/* Phone with mask */}
        <div className="space-y-1.5">
          <Label htmlFor="phone" className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" />
            Telefone
            <span className="text-destructive">*</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground/50 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Número com código do país (ex: +55 11 99999-9999)</p>
              </TooltipContent>
            </Tooltip>
          </Label>
          <div className="relative">
            <Input
              id="phone"
              placeholder="+55 11 99999-9999"
              value={values.phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              onBlur={() => handleBlur('phone', values.phone)}
              aria-required="true"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
              className={cn(
                'transition-all duration-200',
                errors.phone && touched.phone && 'border-destructive focus-visible:ring-destructive',
                !errors.phone && touched.phone && values.phone.trim() && 'border-success/50 focus-visible:ring-success/30',
              )}
              maxLength={20}
            />
            {renderFieldStatus('phone')}
          </div>
          {errors.phone && touched.phone && (
            <p id="phone-error" className="sr-only">{errors.phone}</p>
          )}
          <AnimatePresence>
            {touched.phone && errors.phone && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-destructive text-xs" role="alert">
                <AlertCircle className="w-3 h-3" /> {errors.phone}
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {duplicateWarning && !errors.phone && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1.5 text-[hsl(38_92%_50%)] text-xs bg-[hsl(38_92%_50%)]/10 rounded-md px-2 py-1.5" role="alert">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>{duplicateWarning}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email" className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-muted-foreground" />
            Email
            <span className="text-muted-foreground text-xs">(para resposta)</span>
          </Label>
          <div className="relative">
            <Input
              id="email"
              type="email"
              placeholder="email@exemplo.com"
              value={values.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              onBlur={() => handleBlur('email', values.email || '')}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
              className={cn(
                'transition-all duration-200',
                errors.email && touched.email && 'border-destructive focus-visible:ring-destructive',
                !errors.email && touched.email && values.email && 'border-success/50 focus-visible:ring-success/30',
              )}
              maxLength={255}
            />
            {renderFieldStatus('email')}
          </div>
          {errors.email && touched.email && (
            <p id="email-error" className="sr-only">{errors.email}</p>
          )}
          <AnimatePresence>
            {touched.email && errors.email && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="flex items-center gap-1 text-destructive text-xs" role="alert">
                <AlertCircle className="w-3 h-3" /> {errors.email}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Hint about required fields */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <span className="text-destructive">*</span> Campos obrigatórios
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/30">
          <p className="text-xs text-muted-foreground hidden sm:block">
            Ctrl+Enter para salvar
          </p>
          <div className="flex gap-2 ml-auto">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              aria-label="Cancelar formulário"
            >
              Cancelar
            </Button>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={handleSubmit}
                disabled={!isValid || isSubmitting}
                className="bg-whatsapp hover:bg-whatsapp-dark min-w-[120px]"
                aria-label={submitLabel}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {submitLabel}
                  </>
                )}
              </Button>
            </motion.div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
