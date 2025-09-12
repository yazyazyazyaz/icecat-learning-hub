"use client";
import { useState } from "react";
import Modal from "./Modal";
import { createPresentation } from "@/actions/presentations";

export default function NewPresentationButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="px-4 py-2 rounded-full border bg-white hover:bg-gray-50" onClick={()=>setOpen(true)}>
        New presentation
      </button>
      <Modal open={open} onClose={()=>setOpen(false)} title="New presentation">
        <form action={async (fd: FormData)=>{ await createPresentation(fd); setOpen(false); }}>
          {/* Tags to categorize like Manuals */}
          <div className="mt-1 mb-3 flex flex-wrap items-center gap-3">
            <span className="text-sm text-neutral-700">Tags:</span>
            <label className="text-sm"><input type="checkbox" name="tags" value="For Retailers" className="mr-2" /> For Retailers</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="For Brands" className="mr-2" /> For Brands</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="Icecat Commerce" className="mr-2" /> Icecat Commerce</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="Amazon" className="mr-2" /> Amazon</label>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm mb-1">Title</label>
              <input name="title" required className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="Platform Overview" />
            </div>
            <div>
              <label className="block text-sm mb-1">File path (URL or internal)</label>
              <input name="path" required className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="/files/presentations/platform-overview.pdf" />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">Or upload file</label>
            <input name="file" type="file" accept=".pdf,.ppt,.pptx" className="w-full text-sm" />
            <p className="text-xs text-neutral-600 mt-1">If a file is selected, it will be uploaded and used instead of the path.</p>
          </div>
          <div className="mt-3">
            <label className="block text-sm mb-1">Short description (optional)</label>
            <input name="description" className="w-full px-3 py-2 border rounded-lg bg-white" placeholder="Architecture & services" />
          </div>
          <div className="mt-3 flex items-center gap-4">
            <span className="text-sm">Audience:</span>
            <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="audience" value="RETAILERS" defaultChecked /> For Retailers</label>
            <label className="inline-flex items-center gap-2 text-sm"><input type="radio" name="audience" value="BRANDS" /> For Brands</label>
          </div>
          <div className="mt-4 flex justify-end">
            <button className="px-4 py-2 rounded-full border">Create</button>
          </div>
        </form>
      </Modal>
    </>
  );
}
