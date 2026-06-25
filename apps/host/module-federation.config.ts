import { createSharedConfig } from '../../tools/mf/shared';
import { REMOTES, remoteEntry } from '../../tools/mf/remotes';

/**
 * Host Module Federation config (the Vite + MF 2.0 equivalent of an @nx/webpack
 * `ModuleFederationConfig`). The host consumes each remote by its MF 2.0 manifest
 * URL; the actual URLs are resolved at runtime from public/registry.json, but the
 * remotes must also be declared here so the plugin sets up the shared scope.
 */
const remotes = Object.fromEntries(
  REMOTES.map((r) => [
    r.mfName,
    { type: 'module', name: r.mfName, entry: remoteEntry(r.port) },
  ]),
);

export const mfConfig = {
  name: 'host',
  // No remote type-hint generation yet; avoids the dev-only dts-plugin warning.
  dts: false,
  remotes,
  shared: createSharedConfig(),
};

export default mfConfig;
