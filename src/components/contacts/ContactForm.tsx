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
  return (
    <div className="space-y-4 pt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome Principal *</Label>
          <Input
            id="name"
            placeholder="Nome"
            value={values.name}
            onChange={(e) => onChange('name', e.target.value)}
          />
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
          onChange={(e) => onChange('phone', e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="email@exemplo.com"
          value={values.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} className="bg-whatsapp hover:bg-whatsapp-dark">
          {submitLabel}
        </Button>
      </div>
    </div>
  );
});
