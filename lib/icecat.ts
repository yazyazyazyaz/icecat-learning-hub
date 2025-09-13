import { z } from 'zod'

export const LANGS = [
  'EN','NL','FR','DE','IT','ES','DK','RU','US','BR','PT','ZH','SV','PL','CZ','HU','FI','EL','NO','TR','BG','RO','SR','UK','JA','CA','ES_AR','HR','AR','VI','KO','MK','SL','EN_SG','EN_ZA','ZH_TW','HE','LT','LV','EN_IN','DE_CH','ID','SK','FA','ES_MX','ET','DE_BE','FR_BE','NL_BE','TH','RU_UA','DE_AT','FR_CH','EN_NZ','EN_SA','EN_ID','EN_MY','HI','FR_CA','TE','TA','KN','EN_IE','ML','EN_AE','ES_CL','ES_PE','ES_CO','MR','BN','MS','EN_AU','IT_CH','EN_PH','EN_CA','EN_EG','AR_EG','AR_SA'
] as const

export const GRANULAR = [
  'essentialinfo','title','gallery','multimedia','videos','productstory','tours3d',
  'reasonstobuy','manuals','featuregroups','featurelogos','reviews','packaging','variants'
] as const

export const LiveRequestSchema = z.object({
  lang: z.string().min(2),
  shopname: z.string().min(2),
  GTIN: z.string().optional(),
  ProductCode: z.string().optional(),
  Brand: z.string().optional(),
  icecat_id: z.string().optional(),
  content: z.string().optional(),
  relationsLimit: z.coerce.number().optional(),
})

export type LiveRequest = z.infer<typeof LiveRequestSchema>

