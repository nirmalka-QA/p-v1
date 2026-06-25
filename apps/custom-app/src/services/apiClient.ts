// The shared axios instance from @wispr/services (configured at boot via
// configureServices — base URL, functions key, token, credentials). Re-exported
// as `apiClient` so feature services making direct axios calls (uploads,
// progressive/polling endpoints) keep one instance + one auth path.
export { http as apiClient } from '@wispr/services'
