import { createSharedConfig } from '../../tools/mf/shared';

/**
 * data-pipeline remote MF config. Exposes exactly one entry — `./ProjectApp`,
 * the React component implementing the shell↔remote contract. Same shared block
 * as the host (so it uses the host's singletons in composed mode).
 */
export const mfConfig = {
  name: 'data_pipeline',
  dts: false,
  filename: 'remoteEntry.js',
  manifest: true,
  exposes: { './ProjectApp': './src/ProjectApp.tsx' },
  shared: createSharedConfig(),
};

export default mfConfig;
