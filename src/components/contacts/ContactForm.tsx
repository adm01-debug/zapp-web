import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CONTACT_TYPES } from '@/utils/whatsappFileTypes';
import { cn } from '@/lib/utils';

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
}

export const ContactForm = React.memo(function ContactForm({
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel,
}: ContactFormProps) {
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!values.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!values.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    } else if (!/^\+?\d[\d\s()-]{7,}$/.test(values.phone.trim())) {
      newErrors.phone = 'Telefone inválido';
    }
    if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      newErrors.email = 'Email inválido';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit();
    }
  };

  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Principal *</Label>
          <Input
            id="name"
            placeholder="Nome"
            value={values.name}
            required
            autoComplete="given-name"
            onChange={(e) => { onChange('name', e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: '' })); }}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={cn(errors.name && 'border-destructive')}
          />
          {errors.name && <p id="name-error" className="text-xs text-destructive">{errors.name}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="surname">Sobrenome</Label>
          <Input
            id="surname"
            placeholder="Sobrenome"
            value={values.surname || ''}
            onChange={(e) => onChange('surname', e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="nickname">Apelido</Label>
          <Input
            id="nickname"
            placeholder="Como prefere ser chamado"
            value={values.nickname || ''}
            onChange={(e) => onChange('nickname', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_type">Tipo de Contato</Label>
          <Select
            value={values.contact_type || 'cliente'}
            onValueChange={(value) => onChange('contact_type', value)}
          >
            <SelectTrigger>
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="job_title">Cargo</Label>
          <Input
            id="job_title"
            placeholder="Ex: Gerente de Vendas"
            value={values.job_title || ''}
            onChange={(e) => onChange('job_title', e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="company">Empresa</Label>
          <Input
            id="company"
            placeholder="Nome da empresa"
            value={values.company || ''}
            onChange={(e) => onChange('company', e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefone *</Label>
        <Input
          id="phone"
          placeholder="+55 11 99999-9999"
          value={values.phone}
          required
          inputMode="tel"
          autoComplete="tel"
          onChange={(e) => { onChange('phone', e.target.value); if (errors.phone) setErrors(prev => ({ ...prev, phone: '' })); }}
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
          className={cn(errors.phone && 'border-destructive')}
        />
        {errors.phone && <p id="phone-error" className="text-xs text-destructive">{errors.phone}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemplo.com"
          inputMode="email"
          autoComplete="email"
          value={values.email || ''}
          onChange={(e) => { onChange('email', e.target.value); if (errors.email) setErrors(prev => ({ ...prev, email: '' })); }}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={cn(errors.email && 'border-destructive')}
        />
        {errors.email && <p id="email-error" className="text-xs text-destructive">{errors.email}</p>}
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} className="bg-whatsapp hover:bg-whatsapp-dark">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
});
