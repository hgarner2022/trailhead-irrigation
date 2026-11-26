import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"
import { forwardRef } from "react"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        default: "bg-primary-dark text-white hover:bg-primary-deep shadow-sm",
        secondary: "bg-navy text-white hover:bg-navy-light shadow-sm",
        outline: "border border-border bg-background hover:bg-stone text-foreground",
        ghost: "hover:bg-stone text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        /** the colour of something hard to take back (cancel a visit, cancel the pass, delete) */
        destructive: "bg-destructive text-white hover:bg-destructive/90 shadow-sm",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 px-3 text-xs rounded-md",
        lg: "h-12 px-6 text-base rounded-lg",
        xl: "h-14 px-8 text-lg rounded-xl",
        icon: "h-10 w-10",
        // The app's other heights, so no screen types `min-h-11` or `h-9` on a Button (docs/DESIGN.md, "Button sizes").
        /** 36: a toolbar button (Columns, Export, Clear filters) */
        compact: "h-9 px-3 text-sm rounded-md",
        /** 44: anything a phone or a tablet must hit (a page's primary, a footer, a dialog's buttons) */
        touch: "h-11 px-5 py-2",
        /** 44 with `sm`'s 12px text and corner: a small button that must still be 44 high (Edit on a line, Remove on a photo) */
        "touch-sm": "h-11 px-3 text-xs rounded-md",
        /** 44 x 44: an icon-only button that must be 44 */
        "touch-icon": "h-11 w-11",
        /** 44 below `md`, the default 40 from `md`: a laptop form's button that must still be hit on a phone (Save, Discard) */
        adaptive: "h-11 px-5 py-2 md:h-10",
        /** 44 below `md`, `sm`'s 32 from `md` (Preview, a field's help) */
        "adaptive-sm": "h-11 px-3 text-xs rounded-md md:h-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Render the child element (an anchor, a Link) with the button's classes instead of a <button> */
  asChild?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button"
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
