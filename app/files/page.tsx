import Link from "next/link"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/db"
import { createAsset } from "@/actions/assets"
import { createUpload } from "@/actions/uploads"

export default async function FilesHubPage({ searchParams }: { searchParams?: { type?: string } }) {
  const typeParam = (searchParams?.type || "").toUpperCase()
  const validTypes = ["PDF","VIDEO","LINK","IMAGE","DOC","MDX"] as const
  const type = (validTypes as readonly string[]).includes(typeParam) ? (typeParam as any) : undefined
  let assets: any[] = []
  try {
    assets = await db.asset.findMany({
      where: type ? { type: type as any } : {},
      orderBy: { id: 'desc' }
    })
  } catch (e) {
    console.error('FilesHubPage: DB unavailable', e)
    assets = []
  }

  return (
    <div className="grid gap-6">

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-sm p-4">
        <form action={async (fd: FormData) => { 'use server'; await createAsset(fd) }} className="grid gap-3 md:grid-cols-4 items-end">
          <div className="md:col-span-1">
            <label className="block text-sm mb-1">Type</label>
            <select name="type" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm">
              <option value="LINK">Link</option>
              <option value="PDF">PDF</option>
              <option value="DOC">Doc</option>
              <option value="IMAGE">Image</option>
              <option value="VIDEO">Video</option>
            </select>
          </div>
          <div className="md:col-span-1">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required placeholder="Brand assets" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">URL</label>
            <input name="url" required placeholder="https://…" className="w-full rounded-2xl border border-[hsl(var(--border))] bg-white px-3 py-2 text-sm" />
          </div>
          <div>
            <button className="inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-neutral-100/60">Add</button>
          </div>
        </form>
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-sm p-4">
        <h2 className="text-sm font-medium mb-3">Upload document (file or path + tags)</h2>
        <form action={async (fd: FormData) => { 'use server'; fd.append('kind','DOCUMENT'); await createUpload(fd) }} className="grid gap-3 md:grid-cols-5 items-end text-[15px]">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Title</label>
            <input name="title" required className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm bg-[hsl(var(--surface))]" />
          </div>
          <div className="md:col-span-3">
            <label className="block text-sm mb-1">File path (URL or internal path)</label>
            <input name="path" required className="w-full rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm bg-[hsl(var(--surface))]" placeholder="/files/docs/policy.pdf" />
          </div>
          <div className="md:col-span-5">
            <label className="block text-sm mb-1">Or upload file</label>
            <input name="file" type="file" className="text-sm" />
            <p className="text-xs text-neutral-600 mt-1">If a file is selected, it will be uploaded and used instead of the path.</p>
          </div>
          <div className="md:col-span-5 flex flex-wrap items-center gap-3">
            <span className="text-sm text-neutral-600">Tags:</span>
            <label className="text-sm"><input type="checkbox" name="tags" value="internal" className="mr-2"/> Internal</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="legal" className="mr-2"/> Legal</label>
            <label className="text-sm"><input type="checkbox" name="tags" value="policy" className="mr-2"/> Policy</label>
            <button className="ml-auto inline-flex items-center rounded-2xl border border-[hsl(var(--border))] px-3 py-2 text-sm hover:bg-[hsl(var(--accent))]/10 dark:hover:bg-white/10">Save</button>
          </div>
        </form>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-600">Filter:</span>
        <Link className={`tag-chip ${!type? 'tag-chip--active':''}`} href="/files">All</Link>
        {validTypes.map((t) => (
          <Link key={t} className={`tag-chip ${type===t? 'tag-chip--active':''}`} href={`/files?type=${t}`}>{t}</Link>
        ))}
      </div>

      <div className="rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] shadow-sm">
        <Table>
          <TableCaption>{type ? `${type} only` : 'All types'}</TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Link</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell><a className="underline" href={a.url} target="_blank" rel="noreferrer">Open</a></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
