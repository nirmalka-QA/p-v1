import { User } from 'oidc-client-ts'
import { authority, clientId } from '../../../../environments/environments'

// oidc-client-ts persists the signed-in user under this key in the configured store.
const STORAGE_KEY = `oidc.user:${authority}:${clientId}`

/**
 * Reads the current access token from the OIDC store for attaching to API
 * requests (wired into @wispr/services via configureServices). Kept out of
 * Redux/component state so the token is never duplicated or rendered.
 */
export function getAccessToken(): string | null {
  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    return User.fromStorageString(raw).access_token ?? null
  } catch {
    return null
  }
}
