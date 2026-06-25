// Host environment values. Production: window.__APP_CONFIG__ from public/config.js
// (token-replaced per environment at release). Local dev: Vite import.meta.env.
//
// The host owns auth (OIDC) + the API connection; integration keys (GitHub/Jira)
// stay with the apps that use them.

interface AppConfig {
  CLIENT_ID: string
  AUTHORITY: string
  REDIRECT_URI: string
  POST_LOGOUT_URI: string
  SCOPE: string
  API_URL: string
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>
  }
}

// Read import.meta.env without depending on vite/client augmentation for VITE_* keys.
const viteEnv = (import.meta as unknown as {
  env: Record<string, string | undefined> & { DEV: boolean }
}).env

function resolveConfig(): AppConfig {
  if (viteEnv.DEV) {
    return {
      CLIENT_ID: viteEnv.VITE_CLIENT_ID ?? '',
      AUTHORITY: viteEnv.VITE_AUTHORITY ?? '',
      REDIRECT_URI: viteEnv.VITE_REDIRECT_URI ?? '',
      POST_LOGOUT_URI: viteEnv.VITE_POST_LOGOUT_URI ?? '',
      SCOPE: viteEnv.VITE_SCOPE ?? 'openid profile email offline_access',
      API_URL: viteEnv.VITE_API_URL ?? '',
    }
  }
  return (window.__APP_CONFIG__ ?? {}) as AppConfig
}

const config = resolveConfig()

export const clientId = config.CLIENT_ID
export const authority = config.AUTHORITY
export const redirectUrl = config.REDIRECT_URI
export const postLogoutRedirectUri = config.POST_LOGOUT_URI
export const scope = config.SCOPE
export const apiUrl = config.API_URL
