import * as React from "react"
import { cn } from "@/lib/utils"

const Table = ({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) => (
  <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
)

const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("[&_tr]:border-b", className)} {...props} />
)

const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />
)

const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("border-b transition-colors hover:bg-[hsl(var(--accent))]/10 dark:hover:bg-white/5", className)} {...props} />
)

const TableHead = ({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      "h-10 px-2 text-left align-middle font-medium text-neutral-600 [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
)

const TableCell = ({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn("p-2 align-middle", className)} {...props} />
)

const TableCaption = ({ className, ...props }: React.HTMLAttributes<HTMLTableCaptionElement>) => (
  <caption className={cn("mt-4 text-sm text-neutral-500", className)} {...props} />
)

export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption }
