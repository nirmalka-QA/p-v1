import { WebStorageStateStore } from 'oidc-client-ts'
import type { AuthProviderProps } from 'react-oidc-context'
import {
  authority,
  clientId,
  redirectUrl,
  postLogoutRedirectUri,
} from '../../../../environments/environments'

/**
 * OIDC config for the host (Entra ID, Authorization Code + PKCE). Auth is
 * host-only; the token is read by the data layer via the token helper.
 */
export const oidcConfig: AuthProviderProps = {
  // Fallbacks keep UserManager constructable when env is absent (dev/preview with
  // VITE_DEV_AUTH, where the OIDC flow is never exercised). Real env overrides.
  authority: authority ,
  client_id: clientId || 'dev-client',
  redirect_uri: redirectUrl || window.location.origin,
  post_logout_redirect_uri: postLogoutRedirectUri || window.location.origin,
  response_type: 'code', // Authorization Code Flow (+ PKCE by default)
  // The OIDC scope is fixed — VITE_SCOPE is a GitHub (repo) scope, not this one.
  scope: 'openid profile email offline_access',
  automaticSilentRenew: true,
  loadUserInfo: false,
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  // Strip ?code & ?state from the URL after sign-in.
  onSigninCallback: () => {
    window.history.replaceState({}, document.title, window.location.pathname)
  },
}
