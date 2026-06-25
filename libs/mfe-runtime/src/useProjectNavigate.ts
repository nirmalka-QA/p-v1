import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Navigation helper for remotes. A remote uses relative routes internally, but
 * to move within its own space (or be given an absolute app path) it goes
 * through here so everything is resolved against its `basePath` (e.g. /p/123).
 * Navigation OUT of a remote should use the contract's `onNavigate` instead.
 */
export function useProjectNavigate(basePath: string): (path: string) => void {
  const navigate = useNavigate()
  return useCallback(
    (path: string) => {
      const relative = path.startsWith('/') ? path : `/${path}`
      navigate(`${basePath}${relative}`)
    },
    [navigate, basePath],
  )
}
