import { describe, it, expect } from 'vitest'
import { loadLessonFrontmatterBySlug } from '@/lib/mdx'

describe('MDX loader', () => {
  it('loads frontmatter by slug', () => {
    const fm = loadLessonFrontmatterBySlug('intro')
    expect(fm).toBeTruthy()
    expect((fm as any)?.title).toBe('Company Introduction')
  })
})

