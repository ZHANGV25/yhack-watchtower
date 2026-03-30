"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex shrink-0 items-center border-2 border-border h-[20px] w-[36px] outline-none focus-visible:ring-2 focus-visible:ring-ring/50 data-checked:bg-chart-2 data-checked:border-chart-2 data-unchecked:bg-muted data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[14px] bg-card border border-border ring-0 group-data-[state=checked]/switch:translate-x-[16px] group-data-[state=unchecked]/switch:translate-x-0 data-checked:translate-x-[16px] data-unchecked:translate-x-0"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
