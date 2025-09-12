import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const contentDir = path.join(process.cwd(), 'content')

export function listLessonFiles() {
  if (!fs.existsSync(contentDir)) return []
  return fs.readdirSync(contentDir).filter((f) => f.endsWith('.mdx') || f.endsWith('.md'))
}

export function loadLessonFrontmatterBySlug(slug: string) {
  const files = listLessonFiles()
  const file = files.find((f) => f.replace(/\.(mdx|md)$/i, '') === slug)
  if (!file) return null
  const full = path.join(contentDir, file)
  const raw = fs.readFileSync(full, 'utf8')
  const { data } = matter(raw)
  return data as Record<string, unknown>
}

export function loadLessonMdxBySlug(slug: string) {
  const files = listLessonFiles()
  const file = files.find((f) => f.replace(/\.(mdx|md)$/i, '') === slug)
  if (!file) return null
  const full = path.join(contentDir, file)
  const raw = fs.readFileSync(full, 'utf8')
  const { data, content } = matter(raw)
  return { frontmatter: data as Record<string, unknown>, content }
}

