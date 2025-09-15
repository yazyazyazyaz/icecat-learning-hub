/* scripts/seed_learning_paths.ts */
import data from "@/data/learningPaths";
import { prisma } from "@/lib/db";

function orderFor(title: string) {
  const pref = ["Onboarding week","Third week","Fourth week","BONUS"];
  const ix = pref.indexOf(title);
  return ix >= 0 ? ix : 999;
}

async function main() {
  for (const p of (data as unknown as any[])) {
    const path = await (prisma as any).learningPath.upsert({
      where: { slug: (p as any).slug },
      update: { title: (p as any).title, sortOrder: orderFor((p as any).title) },
      create: { slug: (p as any).slug, title: (p as any).title, sortOrder: orderFor((p as any).title) },
    });

    for (const t of (p as any).items || []) {
      await (prisma as any).learningTask.upsert({
        where: { pathId_day_title: { pathId: path.id, day: (t as any).day, title: (t as any).title } as any },
        update: {
          programMd: (t as any).programMd ?? null,
          noteMd: (t as any).noteMd ?? null,
          trainer: (t as any).trainer ?? null,
          attachments: (t as any).attachments ?? [],
          position: (t as any).position ?? 0,
        },
        create: {
          pathId: path.id,
          day: (t as any).day,
          title: (t as any).title,
          programMd: (t as any).programMd ?? null,
          noteMd: (t as any).noteMd ?? null,
          trainer: (t as any).trainer ?? null,
          attachments: (t as any).attachments ?? [],
          position: (t as any).position ?? 0,
        },
      });
    }
  }
  console.log("Learning paths imported.");
}

main().catch((e) => { console.error(e); process.exit(1); });
