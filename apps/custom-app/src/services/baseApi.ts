// The shared base RTK Query api (now carries the tag types via @wispr/contracts).
// Re-exported as `baseApi` so feature services keep doing baseApi.injectEndpoints
// against the one shared api / cache.
export { api as baseApi } from '@wispr/services'
