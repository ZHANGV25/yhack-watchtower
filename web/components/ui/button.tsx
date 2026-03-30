"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-none border-2 border-border text-sm font-medium whitespace-nowrap outline-none select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 active:translate-x-[1px] active:translate-y-[2px] active:!shadow-[inset_2px_2px_0_rgba(0,0,0,0.2)]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.25),inset_2px_2px_0_rgba(255,255,255,0.25),2px_3px_0_rgba(0,0,0,0.3)] hover:shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.2),inset_2px_2px_0_rgba(255,255,255,0.35),2px_3px_0_rgba(0,0,0,0.3)] hover:brightness-110",
        outline:
          "border-border bg-card shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.1),inset_1px_1px_0_rgba(255,255,255,0.3),2px_2px_0_rgba(0,0,0,0.15)] hover:bg-muted hover:shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.1),inset_1px_1px_0_rgba(255,255,255,0.4),2px_2px_0_rgba(0,0,0,0.15)]",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.1),inset_1px_1px_0_rgba(255,255,255,0.3),2px_2px_0_rgba(0,0,0,0.15)] hover:brightness-95",
        ghost:
          "border-transparent hover:bg-muted hover:border-border hover:shadow-[inset_-1px_-1px_0_rgba(0,0,0,0.08),inset_1px_1px_0_rgba(255,255,255,0.2),1px_1px_0_rgba(0,0,0,0.1)]",
        destructive:
          "bg-destructive text-primary-foreground shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.25),inset_2px_2px_0_rgba(255,255,255,0.2),2px_3px_0_rgba(0,0,0,0.3)] hover:brightness-110",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
