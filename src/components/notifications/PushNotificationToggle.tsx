import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { cn } from '@/lib/utils';

/**
 * Compact push notification toggle button.
 * Drop anywhere in the UI for quick enable/disable.
 */
export function PushNotificationToggle({ className }: { className?: string }) {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    toggleSubscription,
  } = usePushNotifications();

  // Show the button even when not supported, but disable it
  const notSupported = !isSupported;

  const disabled = isLoading || permission === 'denied' || notSupported;

  const label = isSubscribed
    ? 'Desativar notificações push'
    : 'Ativar notificações push';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative h-9 w-9 rounded-lg transition-colors',
            isSubscribed && 'text-primary',
            className,
          )}
          onClick={() => toggleSubscription()}
          disabled={disabled}
          aria-label={label}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isSubscribed ? (
            <>
              <Bell className="h-4 w-4" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            </>
          ) : (
            <BellOff className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p>{permission === 'denied' ? 'Permissão bloqueada no navegador' : label}</p>
      </TooltipContent>
    </Tooltip>
  );
}
