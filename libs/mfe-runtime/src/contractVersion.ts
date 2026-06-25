import { CONTRACT_VERSION } from '@wispr/contracts'

const major = (version: string): string => version.split('.')[0] ?? ''

/**
 * Compatibility check for the shell↔remote contract. A remote advertises the
 * contract version it was built against; the host accepts it only when the major
 * versions match (semver: a major bump is a breaking contract change). On a
 * mismatch the host renders an "update required" fallback instead of mounting.
 */
export function isContractCompatible(
  remoteVersion: string,
  hostVersion: string = CONTRACT_VERSION,
): boolean {
  return major(remoteVersion) === major(hostVersion)
}
