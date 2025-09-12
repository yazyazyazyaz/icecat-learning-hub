"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import path from 'path';
import { promises as fs } from 'fs';
import { hasRole } from "@/lib/rbac";

export async function createPresentation(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasRole((session.user as any).role, ["ADMIN" as any, "TRAINER" as any])) throw new Error("Forbidden");

  const title = (formData.get("title") as string)?.trim();
  let filePath  = (formData.get("path")  as string)?.trim();
  const audience = ((formData.get("audience") as string)?.toUpperCase() as "RETAILERS" | "BRANDS");
  const description = (formData.get("description") as string)?.trim() || null;
  const tagsInput = (formData.getAll("tags") || []).map((t)=>String(t));
  const uc = String(formData.get('usecase') || '').trim();
  const ucNew = String(formData.get('usecase_new') || '').trim();
  const ucFinal = uc === 'custom' ? ucNew : uc;
  const file = formData.get('file') as unknown as File | null;

  if (file && typeof file === 'object' && 'arrayBuffer' in file && (file as any).size > 0) {
    const bytes = Buffer.from(await (file as File).arrayBuffer());
    const ext = path.extname((file as any).name || '') || '.pdf';
    const safeName = (file as any).name?.replace(/[^a-zA-Z0-9._-]/g, '_') || `presentation${ext}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', 'presentations');
    await fs.mkdir(dir, { recursive: true });
    const fileName = `${Date.now()}_${safeName}`;
    const abs = path.join(dir, fileName);
    await fs.writeFile(abs, bytes);
    filePath = `/uploads/presentations/${fileName}`;
  }

  if (!title || !filePath || !audience) throw new Error("Missing fields");

  const tags = (() => {
    const t = tagsInput.filter((x) => !x.startsWith('usecase:'));
    if (ucFinal) t.push(`usecase:${ucFinal}`);
    return t;
  })();

  await prisma.presentation.upsert({
    where: { title_audience: { title, audience } },
    update: { path: filePath, description, tags },
    create: {
      title,
      path: filePath,
      description,
      audience,
      tags,
      createdById: (session.user as any).id ?? undefined,
    },
  });

  revalidatePath("/admin/presentations");
  revalidatePath("/editor/presentations");
  revalidatePath("/presentations");
}

export async function deletePresentation(id: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasRole((session.user as any).role, ["ADMIN" as any, "TRAINER" as any])) throw new Error("Forbidden");

  await prisma.presentation.delete({ where: { id } });
  revalidatePath("/editor/presentations");
  revalidatePath("/presentations");
}

export async function updatePresentation(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasRole((session.user as any).role, ["ADMIN" as any, "TRAINER" as any])) throw new Error("Forbidden");

  const id = (formData.get("id") as string) || "";
  const title = (formData.get("title") as string)?.trim();
  const path  = (formData.get("path")  as string)?.trim();
  const audience = ((formData.get("audience") as string)?.toUpperCase() as "RETAILERS" | "BRANDS");
  const description = (formData.get("description") as string)?.trim() || null;
  const tagsInput = (formData.getAll("tags") || []).map((t)=>String(t));
  const uc = String(formData.get('usecase') || '').trim();
  const ucNew = String(formData.get('usecase_new') || '').trim();
  const ucFinal = uc === 'custom' ? ucNew : uc;

  if (!id || !title || !path || !audience) throw new Error("Missing fields");

  const prev = await prisma.presentation.findUnique({ where: { id }, select: { tags: true } });
  let tags = (prev?.tags || []).filter((t) => !t.startsWith('usecase:'));
  for (const t of tagsInput) if (!t.startsWith('usecase:')) tags.push(t);
  if (ucFinal) tags = tags.filter((t)=>!t.startsWith('usecase:')).concat([`usecase:${ucFinal}`]);

  await prisma.presentation.update({
    where: { id },
    data: { title, path, description, audience, tags },
  });

  revalidatePath("/admin/presentations");
  revalidatePath("/editor/presentations");
  revalidatePath("/presentations");
}

export async function updatePresentationUseCase(formData: FormData) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");
  if (!hasRole((session.user as any).role, ["ADMIN" as any, "TRAINER" as any])) throw new Error("Forbidden");

  const id = (formData.get("id") as string) || "";
  const uc = String(formData.get('usecase') || '').trim();
  const ucNew = String(formData.get('usecase_new') || '').trim();
  const ucFinal = uc === 'custom' ? ucNew : uc;
  if (!id) throw new Error("Missing id");

  const prev = await prisma.presentation.findUnique({ where: { id }, select: { tags: true } });
  let tags = (prev?.tags || []).filter((t) => !t.startsWith('usecase:'));
  if (ucFinal) tags.push(`usecase:${ucFinal}`);

  await prisma.presentation.update({ where: { id }, data: { tags } });
  revalidatePath('/admin/presentations');
  revalidatePath('/editor/presentations');
  revalidatePath('/presentations');
}
