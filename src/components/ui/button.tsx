import { type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 select-none",
    "font-sans font-bold text-base",
    "border-2 border-border rounded-sm",
    "h-11 md:h-10 px-4",
    "transition-[transform,box-shadow] duration-[80ms] ease-out",
    "focus-visible:outline-3 focus-visible:outline-ring focus-visible:outline-offset-2",
    "disabled:pointer-events-none disabled:shadow-none disabled:bg-muted disabled:text-muted-foreground",
    "[&_svg]:size-6 [&_svg]:shrink-0",
  ].join(" "),
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-hard-md hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0_0_var(--color-shadow)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground shadow-hard-md hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0_0_var(--color-shadow)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        destructive:
          "bg-destructive text-destructive-foreground font-bold shadow-hard-md hover:-translate-x-px hover:-translate-y-px hover:shadow-[6px_6px_0_0_var(--color-shadow)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        ghost:
          "bg-transparent border-transparent shadow-none hover:border-border",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant }), className)} {...props} />;
}
