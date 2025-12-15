import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-sm hover:shadow-[0_0_20px_hsl(var(--primary)/0.5)] hover:bg-primary/90 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:shadow-[0_0_20px_hsl(var(--destructive)/0.5)]",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground hover:border-secondary/50 hover:shadow-[0_0_15px_hsl(var(--secondary)/0.3)]",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:shadow-[0_0_20px_hsl(var(--secondary)/0.4)]",
        ghost: "hover:bg-accent hover:text-accent-foreground hover:shadow-[0_0_10px_hsl(var(--accent)/0.3)]",
        link: "text-primary underline-offset-4 hover:underline hover:text-primary/80",
        whatsapp: "bg-whatsapp text-white hover:bg-whatsapp-dark shadow-sm hover:shadow-[0_0_25px_hsl(var(--whatsapp)/0.6)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
        glowPurple: "bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-secondary/50 hover:shadow-[0_0_30px_hsl(var(--secondary)/0.6),0_0_60px_hsl(var(--secondary)/0.3)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-500",
        glowGradient: "bg-gradient-to-r from-primary to-secondary text-white border border-secondary/30 hover:shadow-[0_0_30px_hsl(var(--secondary)/0.5),0_0_60px_hsl(var(--primary)/0.3)] before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-500",
        neon: "bg-transparent border-2 border-secondary text-secondary hover:bg-secondary/10 hover:shadow-[0_0_20px_hsl(var(--secondary)/0.5),inset_0_0_20px_hsl(var(--secondary)/0.1)] hover:border-secondary",
        neonOutline: "bg-transparent border border-secondary/50 text-secondary hover:border-secondary hover:shadow-[0_0_25px_hsl(var(--secondary)/0.5),0_0_50px_hsl(var(--secondary)/0.2)] hover:text-secondary-foreground hover:bg-secondary/20 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-secondary/20 before:to-transparent before:translate-x-[-200%] hover:before:translate-x-[200%] before:transition-transform before:duration-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

// Motion button with built-in hover/tap animations and neon glow
interface MotionButtonProps
  extends Omit<HTMLMotionProps<"button">, "ref">,
    VariantProps<typeof buttonVariants> {}

const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ 
          scale: 1.02, 
          y: -2,
          transition: { duration: 0.2, ease: "easeOut" }
        }}
        whileTap={{ scale: 0.98 }}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
MotionButton.displayName = "MotionButton";

export { Button, MotionButton, buttonVariants };
