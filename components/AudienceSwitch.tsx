"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

export default function AudienceSwitch() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = (sp.get("audience") ?? "RETAILERS").toUpperCase();

  function hrefFor(aud: "RETAILERS" | "BRANDS") {
    const p = new URLSearchParams(sp);
    p.set("audience", aud);
    return `${pathname}?${p.toString()}`;
  }

  const base = "tag-chip text-sm";
  const off  = "";
  const on   = "tag-chip--active";

  return (
    <div className="flex gap-2">
      <Link href={hrefFor("RETAILERS")} className={`${base} ${current === "RETAILERS" ? on : off}`}>For Retailers</Link>
      <Link href={hrefFor("BRANDS")}    className={`${base} ${current === "BRANDS"    ? on : off}`}>For Brands</Link>
    </div>
  );
}
