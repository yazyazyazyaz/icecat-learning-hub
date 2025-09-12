import * as React from "react"
import { cn } from "@/lib/utils"

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700",
        className
      )}
      {...props}
    />
  )}

export { Badge }

