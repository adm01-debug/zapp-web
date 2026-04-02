import { describe, it, expect } from 'vitest';
import {
  emailSchema,
  passwordSchema,
  phoneE164Schema,
  uuidSchema,
  cpfSchema,
  cnpjSchema,
  loginSchema,
  signupSchema,
  contactSchema,
  campaignSchema,
  queueSchema,
  quickReplySchema,
  messageSchema,
  connectionSchema,
  profileSchema,
} from '../schemas';

describe('Primitive Validators', () => {
  describe('emailSchema', () => {
    it('accepts valid emails', () => {
      expect(emailSchema.safeParse('user@example.com').success).toBe(true);
      expect(emailSchema.safeParse('a@b.co').success).toBe(true);
    });

    it('rejects invalid emails', () => {
      expect(emailSchema.safeParse('not-an-email').success).toBe(false);
      expect(emailSchema.safeParse('').success).toBe(false);
    });
  });

  describe('passwordSchema', () => {
    it('accepts valid passwords', () => {
      expect(passwordSchema.safeParse('123456').success).toBe(true);
      expect(passwordSchema.safeParse('strongPassword!').success).toBe(true);
    });

    it('rejects short passwords', () => {
      expect(passwordSchema.safeParse('12345').success).toBe(false);
      expect(passwordSchema.safeParse('').success).toBe(false);
    });
  });

  describe('phoneE164Schema', () => {
    it('accepts valid phones', () => {
      expect(phoneE164Schema.safeParse('+5511999999999').success).toBe(true);
      expect(phoneE164Schema.safeParse('5511999999999').success).toBe(true);
    });

    it('rejects invalid phones', () => {
      expect(phoneE164Schema.safeParse('abc').success).toBe(false);
      expect(phoneE164Schema.safeParse('').success).toBe(false);
    });
  });

  describe('uuidSchema', () => {
    it('accepts valid UUIDs', () => {
      expect(uuidSchema.safeParse('550e8400-e29b-41d4-a716-446655440000').success).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(uuidSchema.safeParse('not-a-uuid').success).toBe(false);
    });
  });

  describe('cpfSchema', () => {
    it('accepts valid CPF', () => {
      expect(cpfSchema.safeParse('529.982.247-25').success).toBe(true);
    });

    it('rejects all-same-digit CPFs', () => {
      expect(cpfSchema.safeParse('111.111.111-11').success).toBe(false);
    });

    it('rejects invalid CPFs', () => {
      expect(cpfSchema.safeParse('123.456.789-00').success).toBe(false);
    });
  });

  describe('cnpjSchema', () => {
    it('accepts valid CNPJ', () => {
      expect(cnpjSchema.safeParse('11.222.333/0001-81').success).toBe(true);
    });

    it('rejects all-same-digit CNPJs', () => {
      expect(cnpjSchema.safeParse('11.111.111/1111-11').success).toBe(false);
    });
  });
});

describe('Form Schemas', () => {
  describe('loginSchema', () => {
    it('accepts valid login', () => {
      expect(loginSchema.safeParse({ email: 'user@test.com', password: '123456' }).success).toBe(true);
    });

    it('rejects missing fields', () => {
      expect(loginSchema.safeParse({ email: 'user@test.com' }).success).toBe(false);
      expect(loginSchema.safeParse({ password: '123456' }).success).toBe(false);
    });
  });

  describe('signupSchema', () => {
    it('accepts valid signup', () => {
      expect(signupSchema.safeParse({ email: 'u@t.com', password: '123456', fullName: 'Jo' }).success).toBe(true);
    });

    it('rejects short name', () => {
      expect(signupSchema.safeParse({ email: 'u@t.com', password: '123456', fullName: 'J' }).success).toBe(false);
    });
  });

  describe('contactSchema', () => {
    it('accepts valid contact', () => {
      expect(contactSchema.safeParse({ name: 'John', phone: '+5511999999999' }).success).toBe(true);
    });

    it('accepts optional email', () => {
      expect(contactSchema.safeParse({ name: 'John', phone: '+5511999999999', email: '' }).success).toBe(true);
      expect(contactSchema.safeParse({ name: 'John', phone: '+5511999999999', email: 'j@e.com' }).success).toBe(true);
    });

    it('rejects missing name', () => {
      expect(contactSchema.safeParse({ name: '', phone: '+5511999999999' }).success).toBe(false);
    });
  });

  describe('campaignSchema', () => {
    it('accepts valid campaign', () => {
      expect(campaignSchema.safeParse({ name: 'Test', message: 'Hello' }).success).toBe(true);
    });

    it('rejects too-long message', () => {
      expect(campaignSchema.safeParse({ name: 'Test', message: 'a'.repeat(4097) }).success).toBe(false);
    });
  });

  describe('queueSchema', () => {
    it('accepts valid queue', () => {
      expect(queueSchema.safeParse({ name: 'Support' }).success).toBe(true);
    });

    it('accepts optional capacity', () => {
      expect(queueSchema.safeParse({ name: 'Support', max_capacity: 100 }).success).toBe(true);
    });
  });

  describe('quickReplySchema', () => {
    it('accepts valid quick reply', () => {
      expect(quickReplySchema.safeParse({ title: 'Greeting', content: 'Hello!' }).success).toBe(true);
    });
  });
});

describe('API Response Schemas', () => {
  describe('messageSchema', () => {
    it('accepts valid message', () => {
      const result = messageSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        contact_id: '550e8400-e29b-41d4-a716-446655440001',
        content: 'Hello',
        sender: 'agent',
        message_type: 'text',
        status: 'sent',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid sender', () => {
      const result = messageSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        contact_id: '550e8400-e29b-41d4-a716-446655440001',
        content: 'Hello',
        sender: 'invalid',
        message_type: 'text',
        status: 'sent',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('connectionSchema', () => {
    it('accepts valid connection', () => {
      const result = connectionSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'My WhatsApp',
        instance_name: 'wpp1',
        status: 'connected',
        created_at: '2024-01-01T00:00:00.000Z',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('profileSchema', () => {
    it('accepts valid profile', () => {
      const result = profileSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Agent 1',
        role: 'agent',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid role', () => {
      const result = profileSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        name: 'Agent 1',
        role: 'hacker',
      });
      expect(result.success).toBe(false);
    });
  });
});
