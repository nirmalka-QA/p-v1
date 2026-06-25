import type { ReactNode } from 'react'
import { Container } from '@mantine/core'

interface PageContainerProps {
  children: ReactNode
  /** Mantine Container size (max content width). Defaults to "xl" (~1320px). */
  size?: string | number
  /** Let content span the full work-area width (e.g. wide two-panel layouts). */
  fluid?: boolean
}

/**
 * Centers the main content of a page within a bounded container, leaving the
 * sidebar and AI assistant panel hugging the edges of the shell. Used for the
 * projects listing and every phase's work area.
 */
export function PageContainer({ children, size = 'xl', fluid = false }: PageContainerProps) {
  return (
    <Container size={size} fluid={fluid} w="100%" px="xl" pt="xl" pb={60}>
      {children}
    </Container>
  )
}
