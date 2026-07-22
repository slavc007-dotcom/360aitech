import { Analytics } from '@segment/analytics-node'

const analyticsSingleton = () => {
  // Segment (analytics-node) ni del trenutne faze (Supabase auth/DB) - fallback
  // preprečuje padec builda, dokler NEXT_PUBLIC_SEGMENT_WRITE_KEY ni nastavljen.
  return new Analytics({
    writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY || 'not-configured'
  })
}

declare global {
  var analyticsGlobal: undefined | ReturnType<typeof analyticsSingleton>
}

const analytics = globalThis.analyticsGlobal ?? analyticsSingleton()

export default analytics

if (process.env.NODE_ENV !== 'production') globalThis.analyticsGlobal = analytics