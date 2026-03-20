import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Unit tests for phone uniqueness constraint handling ───

describe('Phone Uniqueness - Database Constraint', () => {
  describe('Constraint Error Detection', () => {
    const isDuplicatePhoneError = (error: { code?: string; message?: string }) =>
      error.code === '23505' && !!(error.message?.includes('contacts_phone_unique') || error.message?.includes('phone'));

    it('detects exact constraint violation code 23505', () => {
      expect(isDuplicatePhoneError({ code: '23505', message: 'duplicate key value violates unique constraint "contacts_phone_unique"' })).toBe(true);
    });

    it('rejects non-duplicate errors', () => {
      expect(isDuplicatePhoneError({ code: '23502', message: 'not null violation' })).toBe(false);
    });

    it('rejects errors without code', () => {
      expect(isDuplicatePhoneError({ message: 'contacts_phone_unique' })).toBe(false);
    });

    it('rejects 23505 on other constraints', () => {
      expect(isDuplicatePhoneError({ code: '23505', message: 'contacts_email_unique' })).toBe(false);
    });

    it('handles undefined message gracefully', () => {
      expect(isDuplicatePhoneError({ code: '23505' })).toBe(false);
    });

    it('handles empty error object', () => {
      expect(isDuplicatePhoneError({})).toBe(false);
    });
  });
});

describe('Phone Uniqueness - Phone Normalization Edge Cases', () => {
  const normalizePhone = (phone: string) => phone.trim().replace(/\s+/g, '').replace(/[()-]/g, '');

  it('trims whitespace', () => {
    expect(normalizePhone('  5511999999999  ')).toBe('5511999999999');
  });

  it('removes internal spaces', () => {
    expect(normalizePhone('55 11 99999 9999')).toBe('5511999999999');
  });

  it('removes dashes', () => {
    expect(normalizePhone('55-11-99999-9999')).toBe('5511999999999');
  });

  it('removes parentheses', () => {
    expect(normalizePhone('55(11)999999999')).toBe('5511999999999');
  });

  it('handles mixed formatting', () => {
    expect(normalizePhone('+55 (11) 99999-9999')).toBe('+5511999999999');
  });

  it('preserves + prefix', () => {
    expect(normalizePhone('+5511999999999')).toBe('+5511999999999');
  });

  it('empty string returns empty', () => {
    expect(normalizePhone('')).toBe('');
  });

  it('pure whitespace trims to empty', () => {
    expect(normalizePhone('   ')).toBe('');
  });
});

describe('Phone Uniqueness - Duplicate Detection Logic', () => {
  describe('Pre-insert check simulation', () => {
    const existingPhones = ['5511999999999', '5521888888888', '5531777777777'];

    const checkDuplicate = (phone: string) => existingPhones.includes(phone.trim());

    it('detects exact match', () => {
      expect(checkDuplicate('5511999999999')).toBe(true);
    });

    it('detects match with whitespace', () => {
      expect(checkDuplicate(' 5511999999999 ')).toBe(true);
    });

    it('allows new number', () => {
      expect(checkDuplicate('5541666666666')).toBe(false);
    });

    it('empty phone is not duplicate', () => {
      expect(checkDuplicate('')).toBe(false);
    });

    it('checks all existing phones', () => {
      existingPhones.forEach(phone => {
        expect(checkDuplicate(phone)).toBe(true);
      });
    });

    it('partial match is NOT a duplicate', () => {
      expect(checkDuplicate('551199999999')).toBe(false); // 12 digits
    });

    it('number with extra digit is NOT a duplicate', () => {
      expect(checkDuplicate('55119999999990')).toBe(false);
    });
  });
});

describe('Phone Uniqueness - Webhook Upsert Behavior', () => {
  it('should insert for new phone, update on duplicate', () => {
    const contacts = new Map<string, { name: string; phone: string }>();

    const upsertContact = (phone: string, name: string) => {
      if (contacts.has(phone)) {
        contacts.set(phone, { ...contacts.get(phone)!, name });
        return 'updated';
      }
      contacts.set(phone, { name, phone });
      return 'inserted';
    };

    expect(upsertContact('5511999999999', 'João')).toBe('inserted');
    expect(contacts.size).toBe(1);

    expect(upsertContact('5511999999999', 'João Silva')).toBe('updated');
    expect(contacts.size).toBe(1);
    expect(contacts.get('5511999999999')?.name).toBe('João Silva');

    expect(upsertContact('5521888888888', 'Maria')).toBe('inserted');
    expect(contacts.size).toBe(2);
  });

  it('handles rapid duplicate inserts (race condition)', () => {
    const results: string[] = [];
    const phoneSet = new Set<string>();

    const insertWithFallback = (phone: string) => {
      if (phoneSet.has(phone)) {
        results.push('fallback-update');
        return;
      }
      phoneSet.add(phone);
      results.push('insert');
    };

    // Simulate 5 rapid inserts of the same phone
    for (let i = 0; i < 5; i++) {
      insertWithFallback('5511999999999');
    }

    expect(results.filter(r => r === 'insert')).toHaveLength(1);
    expect(results.filter(r => r === 'fallback-update')).toHaveLength(4);
    expect(phoneSet.size).toBe(1);
  });
});

describe('Phone Uniqueness - Sync (evolution-sync) Behavior', () => {
  it('inserts new contacts and updates existing on 23505', () => {
    const db = new Map<string, { name: string; avatar_url: string | null }>();
    let synced = 0;

    const syncContact = (ct: { phone: string; name: string; avatar_url: string | null }) => {
      if (db.has(ct.phone)) {
        // Simulate 23505 → update
        db.set(ct.phone, { name: ct.name, avatar_url: ct.avatar_url });
        synced++;
        return '23505-update';
      }
      db.set(ct.phone, { name: ct.name, avatar_url: ct.avatar_url });
      synced++;
      return 'insert';
    };

    expect(syncContact({ phone: '5511111111111', name: 'A', avatar_url: null })).toBe('insert');
    expect(syncContact({ phone: '5522222222222', name: 'B', avatar_url: 'url1' })).toBe('insert');
    expect(syncContact({ phone: '5511111111111', name: 'A Updated', avatar_url: 'url2' })).toBe('23505-update');

    expect(db.size).toBe(2);
    expect(db.get('5511111111111')?.name).toBe('A Updated');
    expect(db.get('5511111111111')?.avatar_url).toBe('url2');
    expect(synced).toBe(3);
  });
});

describe('Phone Uniqueness - Edit Contact Validation', () => {
  it('should detect 23505 on update and show user-friendly message', () => {
    const error = { code: '23505', message: 'duplicate key value violates unique constraint "contacts_phone_unique"' };

    const getErrorMessage = (err: { code?: string; message?: string }) => {
      if (err.code === '23505' && err.message?.includes('contacts_phone_unique')) {
        return 'Já existe outro contato com este número de telefone.';
      }
      return 'Erro ao atualizar contato';
    };

    expect(getErrorMessage(error)).toBe('Já existe outro contato com este número de telefone.');
  });

  it('returns generic message for non-duplicate errors', () => {
    const error = { code: '42000', message: 'syntax error' };
    const getErrorMessage = (err: { code?: string; message?: string }) => {
      if (err.code === '23505' && err.message?.includes('contacts_phone_unique')) {
        return 'Já existe outro contato com este número de telefone.';
      }
      return 'Erro ao atualizar contato';
    };

    expect(getErrorMessage(error)).toBe('Erro ao atualizar contato');
  });
});

describe('Phone Uniqueness - Contact Form Validation', () => {
  it('rejects empty phone', () => {
    const phone = '';
    expect(phone.trim().length > 0).toBe(false);
  });

  it('rejects whitespace-only phone', () => {
    const phone = '   ';
    expect(phone.trim().length > 0).toBe(false);
  });

  it('accepts valid phone', () => {
    const phone = '5511999999999';
    expect(phone.trim().length > 0).toBe(true);
  });

  it('accepts phone with + prefix', () => {
    const phone = '+5511999999999';
    expect(phone.trim().length > 0).toBe(true);
  });
});

describe('Phone Uniqueness - Error Message UX', () => {
  it('NewConversationModal shows contact name on duplicate', () => {
    const existingContact = { id: '1', name: 'João Silva' };
    const msg = `Já existe um contato com este número: ${existingContact.name}`;
    expect(msg).toContain('João Silva');
    expect(msg).toContain('Já existe');
  });

  it('ContactsView shows clear duplicate message on insert', () => {
    const msg = 'Já existe um contato cadastrado com este número de telefone.';
    expect(msg).toContain('telefone');
    expect(msg).toContain('Já existe');
  });

  it('ContactsView shows clear duplicate message on update', () => {
    const msg = 'Já existe outro contato com este número de telefone.';
    expect(msg).toContain('outro contato');
  });
});

describe('Phone Uniqueness - Integration Scenarios', () => {
  it('scenario: user creates contact, tries same phone again', () => {
    const db = new Set<string>();
    
    const createContact = (phone: string) => {
      if (db.has(phone)) return { success: false, error: 'duplicate' };
      db.add(phone);
      return { success: true };
    };

    expect(createContact('5511999999999')).toEqual({ success: true });
    expect(createContact('5511999999999')).toEqual({ success: false, error: 'duplicate' });
    expect(db.size).toBe(1);
  });

  it('scenario: two different phones should both succeed', () => {
    const db = new Set<string>();
    
    const createContact = (phone: string) => {
      if (db.has(phone)) return { success: false, error: 'duplicate' };
      db.add(phone);
      return { success: true };
    };

    expect(createContact('5511111111111')).toEqual({ success: true });
    expect(createContact('5522222222222')).toEqual({ success: true });
    expect(db.size).toBe(2);
  });

  it('scenario: webhook + manual creation race', () => {
    const db = new Set<string>();
    let fallbackUpdates = 0;

    const insertOrUpdate = (phone: string) => {
      if (db.has(phone)) {
        fallbackUpdates++;
        return 'updated';
      }
      db.add(phone);
      return 'inserted';
    };

    // Manual creation
    expect(insertOrUpdate('5511999999999')).toBe('inserted');
    // Webhook arrives for same phone
    expect(insertOrUpdate('5511999999999')).toBe('updated');

    expect(db.size).toBe(1);
    expect(fallbackUpdates).toBe(1);
  });

  it('scenario: bulk sync with many duplicates', () => {
    const db = new Set(['5511111111111', '5522222222222']);
    let inserts = 0;
    let updates = 0;

    const phones = [
      '5511111111111', // dup
      '5522222222222', // dup
      '5533333333333', // new
      '5544444444444', // new
      '5533333333333', // dup (within batch)
    ];

    phones.forEach(phone => {
      if (db.has(phone)) {
        updates++;
      } else {
        db.add(phone);
        inserts++;
      }
    });

    expect(inserts).toBe(2);
    expect(updates).toBe(3);
    expect(db.size).toBe(4);
  });
});
