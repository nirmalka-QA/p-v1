/**
 * Single source of truth for the Module Federation `shared` block. The host and
 * EVERY remote must declare the same shared config so React, the router, the
 * Redux bindings, Mantine and the runtime @wispr/* libs resolve to one instance
 * at runtime (MF singletons). Imported by each app's module-federation.config.ts.
 */

const singleton = () => ({ singleton: true });

// @wispr/* are source libraries with no package.json version, so MF would
// register them as "version 0" and singleton resolution fails. Pin a version
// (must be identical across host + remotes) so they resolve as singletons.
const LIB_VERSION = '1.0.0';
const lib = () => ({
  singleton: true,
  version: LIB_VERSION,
  requiredVersion: `^${LIB_VERSION}`,
});

export function createSharedConfig() {
  return {
    react: singleton(),
    'react-dom': singleton(),
    'react-router-dom': singleton(),
    '@reduxjs/toolkit': singleton(),
    'react-redux': singleton(),
    '@mantine/core': singleton(),
    '@mantine/hooks': singleton(),
    '@wispr/services': lib(),
    '@wispr/store': lib(),
    '@wispr/mfe-runtime': lib(),
    '@wispr/projects': lib(),
    '@wispr/ui': lib(),
    '@wispr/tokens': lib(),
    '@wispr/contracts': lib(),
  };
}
