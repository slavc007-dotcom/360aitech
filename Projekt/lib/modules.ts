export const MODULES = [
  { key: 'chat', label: 'AI Chat' },
  { key: 'email', label: 'E-pošta & Komunikacija' },
  { key: 'onboarding', label: 'Onboarding' },
  { key: 'support', label: 'Internal Support' },
  { key: 'legal', label: 'Pravni & Zakonodajni asistent' },
  { key: 'documents', label: 'Generiranje dokumentov' }
] as const

export type ModuleKey = (typeof MODULES)[number]['key']

export const MODULE_KEYS = MODULES.map(m => m.key) as ModuleKey[]
