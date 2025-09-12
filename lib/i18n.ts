import en from '@/messages/en.json'
import nl from '@/messages/nl.json'

export type Locale = 'en' | 'nl'

const dictionaries: Record<Locale, any> = { en, nl }

export function getDictionary(locale: Locale = 'en') {
  return dictionaries[locale]
}

