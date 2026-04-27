import * as React from "react";
import { cn } from "@/components/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full min-h-[44px] rounded-[1rem] border border-input/80 bg-background/85 px-4 py-2.5 text-sm shadow-[inset_0_1px_0_hsl(0_0%_100%/0.6)] ring-offset-background transition-all placeholder:text-muted-foreground/90 focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
