export const MODULE_KEYS = [
  'chat',
  'email',
  'onboarding',
  'support',
  'legal',
  'documents'
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

// Moduli, ki jih trenutno poganja baza znanja (RAG) - chat/email/documents so
// ločene funkcionalnosti, ki (še) ne uporabljajo tega mehanizma.
export const KNOWLEDGE_MODULE_KEYS = ['onboarding', 'support', 'legal'] as const

export type KnowledgeModuleKey = (typeof KNOWLEDGE_MODULE_KEYS)[number]

export function isKnowledgeModule(value: string): value is KnowledgeModuleKey {
  return (KNOWLEDGE_MODULE_KEYS as readonly string[]).includes(value)
}
