import type { ConfigFile } from '@rtk-query/codegen-openapi'

/**
 * RTK Query OpenAPI codegen. Generated endpoints are injected into the shared
 * base `api` (@wispr/services) so they share its cache and middleware.
 *
 * Currently points at a placeholder spec. To flip to the real backend, change
 * `schemaFile` to the delivered Swagger URL/file and run `npm run api:codegen`.
 * Paths are resolved relative to THIS config file.
 */
const config: ConfigFile = {
  schemaFile: './placeholder.json',
  apiFile: '../../libs/services/src/api.ts',
  apiImport: 'api',
  outputFile: '../../libs/services/src/generated/api.generated.ts',
  exportName: 'generatedApi',
  hooks: true,
}

export default config
