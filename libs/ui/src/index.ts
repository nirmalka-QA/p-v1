/**
 * @wispr/ui — the design system built on Mantine, shared at runtime as a
 * federation singleton. The host and every remote import these from one place.
 *
 * Holds the generic, domain-free primitives. Domain- or feature-coupled
 * components (e.g. StatusBadge, AIProgressSteps, DependencyGraph) stay with
 * their app until their shared types are extracted.
 *
 * Each component lives in its own folder under components/ with its co-located
 * styles (see CLAUDE.md "Component co-location").
 */
export { WisprThemeProvider } from './WisprThemeProvider/WisprThemeProvider'
export type { WisprThemeProviderProps } from './WisprThemeProvider/WisprThemeProvider'

export * from './components/AIPlaceholder/AIPlaceholder'
export * from './components/ComingSoon/ComingSoon'
export * from './components/ConfirmModal/ConfirmModal'
export * from './components/EditMenu/EditMenu'
export * from './components/EmptyState/EmptyState'
export * from './components/ListEditor/ListEditor'
export * from './components/MarkdownEditor/MarkdownEditor'
export * from './components/PageHeader/PageHeader'
export * from './components/OperationProgress/OperationProgress'
export * from './components/DiscoveryContextInput/DiscoveryContextInput'
export * from './components/DiscoveryContextInput/constants'
export * from './components/DiscoveryContextInput/helpers'
export * from './components/DiscoveryGuide/DiscoveryGuide'
export * from './components/AIAssistantPanel/AIAssistantPanel'
