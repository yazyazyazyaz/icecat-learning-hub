"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"

const createSchema = z.object({
  type: z.enum(["PDF","VIDEO","LINK","IMAGE","DOC","MDX"]).default("LINK"),
  title: z.string().min(2),
  url: z.string().url(),
})

export async function createAsset(formData: FormData | unknown) {
  // Require a signed-in user
  const session = await getServerSession(authOptions)
  if (!session?.user) throw new Error("Unauthorized")

  const input = formData instanceof FormData
    ? { type: String(formData.get("type")||"LINK"), title: String(formData.get("title")||""), url: String(formData.get("url")||"") }
    : (formData as any)

  const data = createSchema.parse(input)
  await db.asset.create({ data })
  return { ok: true }
}

