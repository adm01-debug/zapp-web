import { motion } from 'framer-motion';
import { ExternalLink, Phone, MessageSquare, ChevronRight, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { InteractiveMessage as InteractiveMessageType, InteractiveButton } from '@/types/chat';

interface InteractiveMessageProps {
  interactive: InteractiveMessageType;
  isSent: boolean;
  onButtonClick?: (button: InteractiveButton) => void;
  disabled?: boolean;
}

export function InteractiveMessageDisplay({ 
  interactive, 
  isSent,
  onButtonClick,
  disabled = false
}: InteractiveMessageProps) {
  const handleButtonClick = (button: InteractiveButton) => {
    if (disabled) return;
    
    if (button.type === 'url' && button.url) {
      window.open(button.url, '_blank', 'noopener,noreferrer');
    } else if (button.type === 'phone' && button.phoneNumber) {
      window.open(`tel:${button.phoneNumber}`, '_self');
    } else if (button.type === 'reply') {
      onButtonClick?.(button);
    }
  };

  const getButtonIcon = (button: InteractiveButton) => {
    switch (button.type) {
      case 'url':
        return <ExternalLink className="w-3.5 h-3.5" />;
      case 'phone':
        return <Phone className="w-3.5 h-3.5" />;
      case 'reply':
        return <MessageSquare className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      {interactive.header && (
        <div className="mb-2">
          {interactive.header.type === 'text' && (
            <p className={cn(
              "font-semibold text-sm",
              isSent ? "text-primary-foreground" : "text-foreground"
            )}>
              {interactive.header.text}
            </p>
          )}
          {interactive.header.type === 'image' && interactive.header.mediaUrl && (
            <img 
              src={interactive.header.mediaUrl} 
              alt="Header" 
              className="rounded-lg max-w-full h-auto mb-2"
            />
          )}
        </div>
      )}

      {/* Body */}
      <p className={cn(
        "text-sm whitespace-pre-wrap",
        isSent ? "text-primary-foreground" : "text-foreground"
      )}>
        {interactive.body}
      </p>

      {/* Footer */}
      {interactive.footer && (
        <p className={cn(
          "text-xs mt-1",
          isSent ? "text-primary-foreground/70" : "text-muted-foreground"
        )}>
          {interactive.footer}
        </p>
      )}

      {/* Buttons */}
      {interactive.type === 'buttons' && interactive.buttons && (
        <div className="flex flex-col gap-1.5 mt-3 pt-2 border-t border-current/10">
          {interactive.buttons.map((button, index) => (
            <motion.button
              key={button.id}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: disabled ? 1 : 1.02 }}
              whileTap={{ scale: disabled ? 1 : 0.98 }}
              onClick={() => handleButtonClick(button)}
              disabled={disabled}
              className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                isSent 
                  ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
                  : "bg-primary/10 hover:bg-primary/20 text-primary",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              {getButtonIcon(button)}
              <span>{button.title}</span>
              {button.type === 'url' && <ChevronRight className="w-3 h-3 ml-auto" />}
            </motion.button>
          ))}
        </div>
      )}

      {/* List Button */}
      {interactive.type === 'list' && interactive.listButtonText && (
        <motion.button
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: disabled ? 1 : 1.02 }}
          whileTap={{ scale: disabled ? 1 : 0.98 }}
          disabled={disabled}
          className={cn(
            "flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium mt-3 border transition-all",
            isSent 
              ? "border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" 
              : "border-primary/30 text-primary hover:bg-primary/5",
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          <List className="w-4 h-4" />
          {interactive.listButtonText}
        </motion.button>
      )}
    </div>
  );
}

// Button Response Badge (when user clicks a button)
interface ButtonResponseBadgeProps {
  buttonTitle: string;
  isSent: boolean;
}

export function ButtonResponseBadge({ buttonTitle, isSent }: ButtonResponseBadgeProps) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs mb-1",
      isSent 
        ? "bg-primary-foreground/20 text-primary-foreground" 
        : "bg-primary/10 text-primary"
    )}>
      <MessageSquare className="w-3 h-3" />
      <span>Resposta: {buttonTitle}</span>
    </div>
  );
}
