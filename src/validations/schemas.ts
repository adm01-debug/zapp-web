import { z } from 'zod';

/**
 * Shared validation schemas used across the application.
 * Single source of truth for form and API validation.
 */

// --- Primitive Validators ---

export const emailSchema = z.string().email('Email inv\u00e1lido');

export const passwordSchema = z.string().min(6, 'Senha deve ter no m\u00ednimo 6 caracteres');

export const phoneE164Schema = z.string().refine(
  (v) => /^\+?[1-9]\d{1,14}$/.test(v.replace(/[\s\-()]/g, '')),
  'Telefone inv\u00e1lido (formato E.164)'
);

export const uuidSchema = z.string().uuid('ID inv\u00e1lido');

export const cpfSchema = z.string().transform((v) => v.replace(/\D/g, '')).refine(
  (v) => {
    if (v.length !== 11 || /^(\d)\1{10}$/.test(v)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(v[i]) * (10 - i);
    let d1 = 11 - (sum % 11);
    if (d1 >= 10) d1 = 0;
    if (parseInt(v[9]) !== d1) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(v[i]) * (11 - i);
    let d2 = 11 - (sum % 11);
    if (d2 >= 10) d2 = 0;
    return parseInt(v[10]) === d2;
  },
  'CPF inv\u00e1lido'
);

export const cnpjSchema = z.string().transform((v) => v.replace(/\D/g, '')).refine(
  (v) => {
    if (v.length !== 14 || /^(\d)\1{13}$/.test(v)) return false;
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += parseInt(v[i]) * w1[i];
    let d1 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (parseInt(v[12]) !== d1) return false;
    sum = 0;
    for (let i = 0; i < 13; i++) sum += parseInt(v[i]) * w2[i];
    let d2 = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    return parseInt(v[13]) === d2;
  },
  'CNPJ inv\u00e1lido'
);

// --- Form Schemas ---

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2, 'Nome deve ter no m\u00ednimo 2 caracteres'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'As senhas n\u00e3o coincidem',
  path: ['confirmPassword'],
});

export const contactSchema = z.object({
  name: z.string().min(1, 'Nome \u00e9 obrigat\u00f3rio'),
  phone: phoneE164Schema,
  email: emailSchema.optional().or(z.literal('')),
  company: z.string().optional(),
  notes: z.string().max(2000, 'Notas devem ter no m\u00e1ximo 2000 caracteres').optional(),
});

export const campaignSchema = z.object({
  name: z.string().min(1, 'Nome da campanha \u00e9 obrigat\u00f3rio').max(200),
  message: z.string().min(1, 'Mensagem \u00e9 obrigat\u00f3ria').max(4096, 'Mensagem muito longa (m\u00e1x 4096 caracteres)'),
  message_type: z.enum(['text', 'media']).default('text'),
  media_url: z.string().url('URL de m\u00eddia inv\u00e1lida').optional().or(z.literal('')),
  scheduled_at: z.string().datetime('Data de agendamento inv\u00e1lida').optional(),
});

export const queueSchema = z.object({
  name: z.string().min(1, 'Nome da fila \u00e9 obrigat\u00f3rio').max(100),
  description: z.string().max(500).optional(),
  max_capacity: z.number().int().min(1).max(10000).optional(),
});

export const quickReplySchema = z.object({
  title: z.string().min(1, 'T\u00edtulo \u00e9 obrigat\u00f3rio').max(100),
  content: z.string().min(1, 'Conte\u00fado \u00e9 obrigat\u00f3rio').max(4096),
  category: z.string().optional(),
  shortcut: z.string().max(20).optional(),
});

// --- Type Exports ---

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type ContactInput = z.infer<typeof contactSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type QueueInput = z.infer<typeof queueSchema>;
export type QuickReplyInput = z.infer<typeof quickReplySchema>;
