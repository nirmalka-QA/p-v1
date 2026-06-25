import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { useAuth, hasAuthParams } from 'react-oidc-context'
import { Button, Center, Loader, Stack, Text } from '@mantine/core'
import { useAppDispatch, useAppSelector, setUser, clearSession } from '@wispr/store'
import { appEventBus, APP_EVENTS, setAccessToken } from '@wispr/services'
import type { Role, User } from '@wispr/contracts'
import { DEV_USER } from './utility/constants/constants'

// Backend-less preview bypass (opt-in). Off by default — even in `npm run dev`
// the real Entra/IAM OIDC flow runs first. Set VITE_DEV_AUTH=true only when you
// need to click through the UI without a backend; it seeds a mock user instead.
const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true'

interface OidcProfile {
  sub: string
  name?: string
  email?: string
  preferred_username?: string
  roles?: unknown
}

function toUser(profile: OidcProfile): User {
  const roles: Role[] = Array.isArray(profile.roles) ? (profile.roles as Role[]) : ['member']
  return {
    id: profile.sub,
    name: profile.name ?? profile.preferred_username ?? profile.email ?? 'User',
    email: profile.email ?? '',
    roles,
  }
}

/**
 * The app's auth gate. In production it runs the Entra OIDC flow (redirect to
 * sign in, exchange the code, sync the user into the shared session). In dev (or
 * a build with VITE_DEV_AUTH=true) it seeds a mock user so the app runs without
 * a backend. Logout is handled here (shared event bus → clear session + token +
 * end the OIDC session).
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.session.user)
  const triedSignin = useRef(false)

  useEffect(() => {
    const onLogout = (): void => {
      setAccessToken(null)
      dispatch(clearSession())
      if (!DEV_AUTH) void auth.signoutRedirect()
    }
    appEventBus.on(APP_EVENTS.authLogout, onLogout)
    return () => appEventBus.off(APP_EVENTS.authLogout, onLogout)
  }, [auth, dispatch])

  useEffect(() => {
    if (DEV_AUTH && !user) dispatch(setUser(DEV_USER))
  }, [user, dispatch])

  useEffect(() => {
    if (DEV_AUTH) return
    if (
      !hasAuthParams() &&
      !auth.isAuthenticated &&
      !auth.activeNavigator &&
      !auth.isLoading &&
      !auth.error &&
      !triedSignin.current
    ) {
      triedSignin.current = true
      void auth.signinRedirect()
    }
  }, [auth, auth.isAuthenticated, auth.activeNavigator, auth.isLoading, auth.error])

  useEffect(() => {
    if (!DEV_AUTH && auth.isAuthenticated && auth.user) {
      dispatch(setUser(toUser(auth.user.profile as OidcProfile)))
    }
  }, [auth.isAuthenticated, auth.user, dispatch])

  if (DEV_AUTH) {
    return user ? <>{children}</> : null
  }

  if (auth.error) {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="md" maw={360}>
          <Text fw={600}>Authentication error</Text>
          <Text size="sm" c="dimmed" ta="center">
            {auth.error.message}
          </Text>
          <Button
            variant="accent"
            onClick={() => {
              triedSignin.current = true
              void auth.signinRedirect()
            }}
          >
            Try signing in again
          </Button>
        </Stack>
      </Center>
    )
  }

  if (!auth.isAuthenticated) {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="sm">
          <Loader />
          <Text size="sm" c="dimmed">
            Redirecting to sign in…
          </Text>
        </Stack>
      </Center>
    )
  }

  return <>{children}</>
}
