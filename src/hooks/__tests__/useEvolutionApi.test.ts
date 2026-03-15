import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true }, error: null }),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/lib/logger', () => ({
  log: { error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { useEvolutionApi } from '@/hooks/useEvolutionApi';

describe('useEvolutionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes without error', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(result.current).toBeDefined();
  });

  it('exposes loading state', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes sendTextMessage function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendTextMessage).toBe('function');
  });

  it('exposes sendMediaMessage function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendMediaMessage).toBe('function');
  });

  it('exposes createInstance function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.createInstance).toBe('function');
  });

  it('exposes deleteInstance function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.deleteInstance).toBe('function');
  });

  it('exposes getInstanceStatus function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.getInstanceStatus).toBe('function');
  });

  it('exposes getQrCode function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.getQrCode).toBe('function');
  });

  it('exposes disconnectInstance function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.disconnectInstance).toBe('function');
  });

  it('exposes sendLocationMessage function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendLocationMessage).toBe('function');
  });

  it('exposes sendContactMessage function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendContactMessage).toBe('function');
  });

  it('exposes sendReaction function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendReaction).toBe('function');
  });

  it('exposes sendPoll function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendPoll).toBe('function');
  });

  it('exposes createGroup function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.createGroup).toBe('function');
  });

  it('exposes getGroupInfo function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.getGroupInfo).toBe('function');
  });

  it('exposes sendListMessage function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendListMessage).toBe('function');
  });

  it('exposes sendButtonMessage function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.sendButtonMessage).toBe('function');
  });

  it('exposes markMessageAsRead function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.markMessageAsRead).toBe('function');
  });

  it('exposes archiveChat function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.archiveChat).toBe('function');
  });

  it('exposes setPresence function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.setPresence).toBe('function');
  });

  it('exposes fetchProfilePicture function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.fetchProfilePicture).toBe('function');
  });

  it('exposes checkIsWhatsAppNumber function', () => {
    const { result } = renderHook(() => useEvolutionApi());
    expect(typeof result.current.checkIsWhatsAppNumber).toBe('function');
  });
});
