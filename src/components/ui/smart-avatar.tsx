import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

interface SmartAvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  name?: string | null;
  phone?: string | null;
  fallbackClassName?: string;
}

// Generate a consistent gradient based on a string hash
function generateGradient(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Use hash to generate two hue values for gradient
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40 + Math.abs((hash >> 8) % 60)) % 360;
  
  return `linear-gradient(135deg, hsl(${hue1}, 70%, 55%), hsl(${hue2}, 65%, 50%))`;
}

// Get initials from name
function getInitials(name?: string | null): string {
  if (!name) return '';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const SmartAvatar = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  SmartAvatarProps
>(({ className, src, name, phone, fallbackClassName, ...props }, ref) => {
  const initials = getInitials(name);
  const gradientSource = phone || name || 'default';
  const gradient = generateGradient(gradientSource);
  const hasIdentifier = name || phone;
  
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name || 'Avatar'}
          className="aspect-square h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center rounded-full text-primary-foreground font-medium",
          fallbackClassName
        )}
        style={{ background: gradient }}
      >
        {initials ? (
          <span className="text-sm font-semibold drop-shadow-sm">{initials}</span>
        ) : (
          <User className="h-5 w-5 opacity-90" />
        )}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
});
SmartAvatar.displayName = "SmartAvatar";

// Variant with online status indicator
interface SmartAvatarWithStatusProps extends SmartAvatarProps {
  status?: 'online' | 'away' | 'offline';
  showStatus?: boolean;
}

const SmartAvatarWithStatus = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Root>,
  SmartAvatarWithStatusProps
>(({ status = 'offline', showStatus = true, className, ...props }, ref) => {
  const statusColors = {
    online: 'bg-success',
    away: 'bg-warning',
    offline: 'bg-muted-foreground/50',
  };
  
  return (
    <div className="relative">
      <SmartAvatar ref={ref} className={className} {...props} />
      {showStatus && (
        <span 
          className={cn(
            "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background",
            statusColors[status]
          )}
        />
      )}
    </div>
  );
});
SmartAvatarWithStatus.displayName = "SmartAvatarWithStatus";

export { SmartAvatar, SmartAvatarWithStatus, generateGradient, getInitials };
