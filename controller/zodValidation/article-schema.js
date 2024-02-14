import { z } from 'zod'

const articleSchema = z.object({

  title: z.string({ required_error: 'Usa un string' }),
  description: z.string(),
  references: z.string().array(),
  genre: z.enum(['astronomy', 'medicine', 'miths', 'history']),
  intro: z.string(),
  conclusion: z.string()

})

export function verifyArticle (object) {
  return articleSchema.safeParse(object)
}

export function verifyArticlePartial (object) {
  return articleSchema.partial().safeParse(object)
}
