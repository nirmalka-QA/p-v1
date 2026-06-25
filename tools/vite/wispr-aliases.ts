import { fileURLToPath } from 'node:url';

/**
 * Vite `resolve.alias` entries mapping @wispr/* to lib source (non-buildable
 * source libraries → instant HMR, no rebuild). Mirrors tsconfig.base.json paths.
 *
 * Targets are computed relative to THIS file (tools/vite/), so they resolve to
 * <root>/libs/* regardless of which app's vite.config.ts imports the array.
 */
const libSrc = (name: string) =>
  fileURLToPath(new URL(`../../libs/${name}/src/index.ts`, import.meta.url));

const LIB_NAMES = ['contracts', 'ui', 'tokens', 'services', 'store', 'mfe-runtime', 'projects', 'utils'];

export const wisprAliases = [
  // More-specific CSS subpath first so it wins over the barrel alias.
  {
    find: '@wispr/tokens/tokens.css',
    replacement: fileURLToPath(new URL('../../libs/tokens/src/tokens.css', import.meta.url)),
  },
  ...LIB_NAMES.map((name) => ({ find: `@wispr/${name}`, replacement: libSrc(name) })),
];
