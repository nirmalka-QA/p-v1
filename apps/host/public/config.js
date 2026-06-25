// Runtime environment configuration.
//
// The release "Replace tokens" task fills in these #{...}# placeholders
// per-environment and MUST target ONLY this file (e.g. pattern **/config.js).
// It must never scan the compiled JS bundle in /assets — doing so re-encodes
// the whole file (multibyte corruption) and false-matches vendor data such as
// CodeMirror's @lezer parser table.
//
// Read at runtime via window.__APP_CONFIG__ in src/environments/environments.ts.
// In local dev these literal tokens are ignored; values come from .env.local.
// NOTE: every key here must match the AppConfig fields read in
// src/environments/environments.ts — a key that is read but missing here resolves
// to `undefined` in a production build (dev reads .env.local instead).
window.__APP_CONFIG__ = {
  // Identity / OIDC sign-in
  CLIENT_ID: "#{CLIENT_ID}#",
  AUTHORITY: "#{AUTHORITY}#",
  REDIRECT_URI: "#{REDIRECT_URI}#",
  POST_LOGOUT_URI: "#{POST_LOGOUT_URI}#",
  SCOPE: "#{SCOPE}#",
  RESPONSE_TYPE: "#{RESPONSE_TYPE}#",

  // API endpoints
  API_URL: "#{API_URL}#",
  API_REDIRECT_URL: "#{API_REDIRECT_URL}#",

  // GitHub OAuth (repo connect)
  GITHUB_CLIENT_ID: "#{GITHUB_CLIENT_ID}#",
  GITHUB_OAUTH_REDIRECT_URI: "#{GITHUB_OAUTH_REDIRECT_URI}#",
  GITHUB_OAUTH_LOGIN_URI: "#{GITHUB_OAUTH_LOGIN_URI}#",

  // Jira OAuth
  JIRA_CLIENT_ID: "#{JIRA_CLIENT_ID}#",
  JIRA_OAUTH_REDIRECT_URI: "#{JIRA_OAUTH_REDIRECT_URI}#",
  JIRA_OAUTH_LOGIN_URI: "#{JIRA_OAUTH_LOGIN_URI}#",
};
