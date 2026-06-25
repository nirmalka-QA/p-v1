import { createSharedConfig } from '../../tools/mf/shared';

/**
 * custom-app remote MF config. Exposes `./ProjectApp` (the project workspace).
 * bundleAllCSS ships the remote's CSS (Mantine extras + CSS modules) with the
 * exposed module so it styles correctly when mounted in the host.
 */
export const mfConfig = {
  name: 'custom_app',
  dts: false,
  filename: 'remoteEntry.js',
  manifest: true,
  bundleAllCSS: true,
  exposes: { './ProjectApp': './src/ProjectApp.tsx' },
  shared: createSharedConfig(),
};

export default mfConfig;
