import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-full text-sm font-extrabold whitespace-nowrap transition-all hover:-translate-y-0.5 active:translate-y-px active:shadow-tekan motion-reduce:transform-none outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-teal-800 text-white shadow-[0_10px_22px_-8px_rgb(14_77_75/0.55)] hover:bg-teal",
        emas: "bg-emas text-tinta shadow-[0_10px_22px_-8px_rgb(168_118_26/0.6)] hover:brightness-105",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        outline:
          "border border-tinta/15 bg-white text-tinta shadow-[0_8px_18px_-10px_rgb(29_42_42/0.25)] hover:bg-amber-50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "rounded-full text-muted-foreground hover:bg-amber-50 hover:text-teal-800",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 py-2.5 has-[>svg]:px-4",
        xs: "h-6 gap-1 rounded-full px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-9 gap-1.5 rounded-full px-3.5 has-[>svg]:px-2.5",
        lg: "h-12 rounded-full px-7 text-base has-[>svg]:px-5",
        icon: "size-9",
        "icon-xs": "size-6 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

// forwardRef: proyek memakai React 18 (ref belum diteruskan otomatis seperti di React 19).
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }
>(function Button({ className, variant = "default", size = "default", asChild = false, ...props }, ref) {
  const Comp = asChild ? Slot.Root : "button"
  return (
    <Comp
      ref={ref}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

export { Button, buttonVariants }
