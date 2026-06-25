import { createSharedConfig } from '../../tools/mf/shared';

/** strategy remote MF config — exposes `./ProjectApp`; shared block matches the host. */
export const mfConfig = {
  name: 'strategy',
  dts: false,
  filename: 'remoteEntry.js',
  manifest: true,
  exposes: { './ProjectApp': './src/ProjectApp.tsx' },
  shared: createSharedConfig(),
};

export default mfConfig;
