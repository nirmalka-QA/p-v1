// Environment values.
//
// Production: read from public/config.js (window.__APP_CONFIG__), which the
// release "Replace tokens" task fills in per-environment. Local dev: read from
// .env.local via Vite's import.meta.env.
//
// The `import.meta.env.DEV` guard matters: in a production build Vite replaces
// it with `false`, so the entire dev branch — and the inlined VITE_* values —
// is dead-code-eliminated. That guarantees no #{...}# placeholders are ever
// baked into the compiled bundle, so the token task only ever needs to touch
// config.js, never /assets.

interface AppConfig {
  CLIENT_ID: string;
  API_URL: string;
  API_REDIRECT_URL: string;
  AUTHORITY: string;
  REDIRECT_URI: string;
  POST_LOGOUT_URI: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_OAUTH_REDIRECT_URI: string;
  GITHUB_OAUTH_LOGIN_URI: string;
  SCOPE: string;
  RESPONSE_TYPE: string;
  JIRA_CLIENT_ID: string;
  JIRA_OAUTH_REDIRECT_URI: string;
  JIRA_OAUTH_LOGIN_URI: string;
}

declare global {
  interface Window {
    __APP_CONFIG__?: Partial<AppConfig>;
  }
}

function resolveConfig(): AppConfig {
  if (import.meta.env.DEV) {
    return {
      CLIENT_ID: import.meta.env.VITE_CLIENT_ID,
      API_URL: import.meta.env.VITE_API_URL,
      API_REDIRECT_URL: import.meta.env.VITE_API_REDIRECT_URL,
      AUTHORITY: import.meta.env.VITE_AUTHORITY,
      REDIRECT_URI: import.meta.env.VITE_REDIRECT_URI,
      POST_LOGOUT_URI: import.meta.env.VITE_POST_LOGOUT_URI,
      GITHUB_CLIENT_ID: import.meta.env.VITE_GITHUB_CLIENT_ID,
      GITHUB_OAUTH_REDIRECT_URI: import.meta.env.VITE_GITHUB_OAUTH_REDIRECT_URI,
      GITHUB_OAUTH_LOGIN_URI: import.meta.env.VITE_GITHUB_OAUTH_LOGIN_URI,
      SCOPE: import.meta.env.VITE_SCOPE,
      RESPONSE_TYPE: import.meta.env.VITE_RESPONSE_TYPE,
      JIRA_CLIENT_ID: import.meta.env.VITE_JIRA_CLIENT_ID,
      JIRA_OAUTH_REDIRECT_URI: import.meta.env.VITE_JIRA_OAUTH_REDIRECT_URI,
      JIRA_OAUTH_LOGIN_URI: import.meta.env.VITE_JIRA_OAUTH_LOGIN_URI,
    };
  }
  return (window.__APP_CONFIG__ ?? {}) as AppConfig;
}

const config = resolveConfig();

export const clientId = config.CLIENT_ID;
export const apiUrl = config.API_URL;
export const redirectUrl = config.REDIRECT_URI;
export const authority = config.AUTHORITY;
export const postLogoutRedirectUri = config.POST_LOGOUT_URI;
export const githubClientId = config.GITHUB_CLIENT_ID;
export const githubOAuthRedirectUri = config.GITHUB_OAUTH_REDIRECT_URI;
export const githubOAuthLoginUri = config.GITHUB_OAUTH_LOGIN_URI;
export const scope = config.SCOPE;
export const jiraClientId = config.JIRA_CLIENT_ID;
export const jiraOAuthRedirectUri = config.JIRA_OAUTH_REDIRECT_URI;
export const jiraOAuthLoginUri = config.JIRA_OAUTH_LOGIN_URI;
