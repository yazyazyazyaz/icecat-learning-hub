"use client";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export default function SearchBox({ placeholder="Search title/path…" }: { placeholder?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [q, setQ] = useState(sp.get("q") || "");
  useEffect(() => setQ(sp.get("q") || ""), [sp]);
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(sp as any);
    if (q) next.set("q", q); else next.delete("q");
    router.replace(`${pathname}?${next.toString()}`);
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2">
      <input
        value={q} onChange={(e)=>setQ(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 border rounded-lg bg-white min-w-[220px]"
      />
      <button className="px-3 py-2 rounded-full border">Search</button>
    </form>
  );
}

