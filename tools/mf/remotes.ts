/**
 * Central definition of the federated remotes: the Module Federation name, the
 * Nx project name (= apps/<dir>), and the dev/preview port. Single source of
 * truth so the host MF config and the dev tooling stay in sync — add a remote
 * here once it exposes `./ProjectApp`.
 *
 * NOTE: keep this list and the host's project.json `implicitDependencies` in
 * step (project.json is JSON and can't import this file).
 */
export interface RemoteDef {
  /** Module Federation name — must be a valid JS identifier (underscores). */
  mfName: string;
  /** Nx project name / apps/<dir>. */
  project: string;
  /** Dev + preview port (strictPort). */
  port: number;
}

export const REMOTES: RemoteDef[] = [
  { mfName: 'custom_app', project: 'custom-app', port: 4201 },
  { mfName: 'data_pipeline', project: 'data-pipeline', port: 4202 },
  { mfName: 'strategy', project: 'strategy', port: 4203 },
];

/** The MF 2.0 manifest URL a host uses to load a remote at the given port. */
export const remoteEntry = (port: number): string =>
  `http://localhost:${port}/mf-manifest.json`;
