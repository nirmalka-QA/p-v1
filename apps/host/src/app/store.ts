import { makeStore } from '@wispr/store'

/**
 * The ONE Redux store for the whole platform, created only here in the host.
 * Remotes consume it via react-redux (a federation singleton) and never call
 * makeStore() themselves.
 */
export const store = makeStore()
