export const MODULE_KEYS = [
  'chat',
  'email',
  'onboarding',
  'support',
  'legal',
  'documents'
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]
