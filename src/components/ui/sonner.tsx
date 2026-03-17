import { useTheme } from '@/hooks/useTheme';
import { Toaster as Sonner, toast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();

  return (
    <Sonner
      theme={resolvedTheme}
      className="toaster group"
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      duration={4000}
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-card group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-xl group-[.toaster]:rounded-xl',
          description: 'group-[.toast]:text-muted-foreground',
          actionButton: 'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:rounded-lg group-[.toast]:font-medium',
          cancelButton: 'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:rounded-lg',
          closeButton: 'group-[.toast]:bg-card group-[.toast]:border-border group-[.toast]:text-foreground',
          success: 'group-[.toaster]:bg-success/10 group-[.toaster]:border-success/30 group-[.toaster]:text-success',
          error: 'group-[.toaster]:bg-destructive/10 group-[.toaster]:border-destructive/30 group-[.toaster]:text-destructive',
          warning: 'group-[.toaster]:bg-warning/10 group-[.toaster]:border-warning/30 group-[.toaster]:text-warning',
          info: 'group-[.toaster]:bg-info/10 group-[.toaster]:border-info/30 group-[.toaster]:text-info',
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
