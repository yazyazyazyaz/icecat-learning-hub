"use client";
import { useState } from "react";
import Modal from "./Modal";
import { updatePresentation } from "@/actions/presentations";

export default function EditPresentationButton({
  p,
}: {
  p: { id: string; title: string; path: string; description: string | null; audience: "RETAILERS"|"BRANDS"; tags?: string[] };
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="px-3 py-1.5 rounded-full border hover:bg-gray-50" onClick={()=>setOpen(true)}>Edit</button>
      <Modal open={open} onClose={()=>setOpen(false)} title="Edit presentation">
        <form action={async (fd: FormData)=>{ await updatePresentation(fd); setOpen(false); }}>
          <input type="hidden" name="id" defaultValue={p.id} />
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <input name="title" defaultValue={p.title} required className="w-full px-3 py-2 border rounded-lg bg-white" />
            </div>
            <div>
              <label className="block text-sm mb-1">File path (URL or internal)</label>
              <input name="path" defaultValue={p.path} required className="w-full px-3 py-2 border rounded-lg bg-white" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">Short description (optional)</label>
            <input name="description" defaultValue={p.description ?? ""} className="w-full px-3 py-2 border rounded-lg bg-white" />
          </div>
          <div className="mt-3 mb-1 flex flex-wrap items-center gap-3">
            <span className="text-sm text-neutral-700">Tags:</span>
            <label className="text-sm"><input type="checkbox" name="tags" value="For Retailers" className="mr-2" defaultChecked={p.tags?.includes("For Retailers")}/> For Retailers</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="For Brands" className="mr-2" defaultChecked={p.tags?.includes("For Brands")}/> For Brands</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="Icecat Commerce" className="mr-2" defaultChecked={p.tags?.includes("Icecat Commerce")}/> Icecat Commerce</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="Amazon" className="mr-2" defaultChecked={p.tags?.includes("Amazon")}/> Amazon</label>
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-sm">Audience:</span>
            <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="audience" value="RETAILERS" defaultChecked={p.audience==="RETAILERS"} /> For Retailers</label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="audience" value="BRANDS" defaultChecked={p.audience==="BRANDS"} /> For Brands</label>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="px-4 py-2 rounded-full border">Save</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
