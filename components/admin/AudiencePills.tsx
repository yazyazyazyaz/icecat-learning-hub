"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";

export default function AudiencePills({ includeAll = true }: { includeAll?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = new URLSearchParams(useSearchParams() as any);
  const current = (sp.get("aud") || (includeAll ? "ALL" : "RETAILERS")).toUpperCase();

  const opt = includeAll ? ["ALL","RETAILERS","BRANDS"] : ["RETAILERS","BRANDS"];

  function set(a: string) {
    const next = new URLSearchParams(sp);
    next.set("aud", a);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const base = "tag-chip text-sm";
  const off  = "";
  const on   = "tag-chip--active";

  return (
    <div className="flex gap-2">
      {opt.map(a => (
        <button key={a} className={`${base} ${current===a ? on : off}`} onClick={() => set(a)}>{a==="ALL"?"All":`For ${a.charAt(0)}${a.slice(1).toLowerCase()}`}</button>
      ))}
    </div>
  );
}
