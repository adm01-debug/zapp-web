/**
 * Shared utilities for Gmail components.
 */

/** Extract initials from a name or email for avatars */
export function getInitials(name: string | null | undefined, email?: string): string {
  if (name) {
    return name.split(' ').filter(w => w.length > 0).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
  if (email) return email[0]?.toUpperCase() || '?';
  return '?';
}

/** Format a date string for display in thread lists */
export function formatThreadDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

/** Format a date string for display in message cards (more detailed) */
export function formatMessageDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';

  const now = new Date();
  const diff = now.getTime() - date.getTime();

  if (diff < 86400000 && date.getDate() === now.getDate()) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diff < 604800000) {
    return date.toLocaleDateString('pt-BR', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Format file size in human-readable format */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/** Truncate an address list with "e mais N" suffix */
export function truncateAddresses(addresses: string[], maxShow = 3): string {
  if (addresses.length <= maxShow) return addresses.join(', ');
  return `${addresses.slice(0, maxShow).join(', ')} e mais ${addresses.length - maxShow}`;
}

/** Maximum attachment size per file (25MB — Gmail limit) */
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

/** Validate email format */
export function isValidEmail(email: string): boolean {
  const cleaned = email.replace(/.*</, '').replace(/>.*/, '').trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned);
}
