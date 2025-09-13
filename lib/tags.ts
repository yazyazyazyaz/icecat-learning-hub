export const TAG = {
  TRAINING: (slug: string) => `training:${slug}`,
  LESSON: (slug: string) => `lesson:${slug}`,
  QUIZ: (id: string) => `quiz:${id}`,
} as const;

