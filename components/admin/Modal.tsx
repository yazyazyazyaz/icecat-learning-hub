"use client";
import { useRef, useEffect } from "react";

export default function Modal({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    const onCancel = (e: Event) => { e.preventDefault(); onClose(); };
    d.addEventListener("cancel", onCancel);
    return () => d.removeEventListener("cancel", onCancel);
  }, [open, onClose]);
  return (
    <dialog ref={ref} className="rounded-2xl border p-0 w-full max-w-xl backdrop:bg-black/20">
      <div className="p-5 border-b">
        <div className="text-lg font-semibold">{title}</div>
      </div>
      <div className="p-5">{children}</div>
      <div className="p-4 border-t flex justify-end">
        <button className="px-3 py-1.5 rounded-full border" onClick={onClose}>Close</button>
      </div>
    </dialog>
  );
}

