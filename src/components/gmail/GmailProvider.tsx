import { createContext, useContext, type ReactNode } from 'react';
import { useGmail } from '@/hooks/useGmail';

type GmailContextValue = ReturnType<typeof useGmail>;

const GmailContext = createContext<GmailContextValue | null>(null);

export function GmailProvider({ children, accountId }: { children: ReactNode; accountId?: string }) {
  const gmail = useGmail(accountId);
  return <GmailContext.Provider value={gmail}>{children}</GmailContext.Provider>;
}

export function useGmailContext(): GmailContextValue {
  const ctx = useContext(GmailContext);
  if (!ctx) {
    throw new Error('useGmailContext must be used within a GmailProvider');
  }
  return ctx;
}
