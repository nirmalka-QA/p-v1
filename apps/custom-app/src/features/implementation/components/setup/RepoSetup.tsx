import { Stack, Radio, SimpleGrid, Group, Text, TextInput, Switch, PasswordInput, Anchor } from '@mantine/core'
import { ComingSoon } from '@wispr/ui'
import { REPO_PROVIDERS } from '../../utility/constants/constants'
import type { RepoProvider } from '../../utility/models/model'

/** Repository configuration draft (UI state). `provider: ''` means "connect later". */
export interface RepoDraft {
  provider: RepoProvider | ''
  organisation: string
  repoName: string
  defaultBranch: string
  isMonorepo: boolean
  frontendPath: string
  backendPath: string
  /** GitHub Personal Access Token (write scope) — enables real connect + generate-into-repo. */
  token: string
}

export const EMPTY_REPO_DRAFT: RepoDraft = {
  provider: '',
  organisation: '',
  repoName: '',
  defaultBranch: 'main',
  isMonorepo: false,
  frontendPath: 'apps/web',
  backendPath: 'apps/api',
  token: '',
}

const SKIP = 'skip'

interface RepoSetupProps {
  value: RepoDraft
  onChange: (next: RepoDraft) => void
}

/** Repository connection picker — provider cards + repo details. Controlled, UI-only. */
export function RepoSetup({ value, onChange }: RepoSetupProps) {
  const set = (patch: Partial<RepoDraft>) => onChange({ ...value, ...patch })
  const radioValue = value.provider === '' ? '' : value.provider

  return (
    <Stack gap="md">
      <Radio.Group
        label="Provider"
        value={radioValue || SKIP}
        onChange={(v) => set({ provider: v === SKIP ? '' : (v as RepoProvider) })}
      >
        <SimpleGrid cols={{ base: 2, sm: 3 }} mt="xs">
          {REPO_PROVIDERS.map((p) => (
            <Radio.Card key={p.value} value={p.value} p="sm" radius="md">
              <Group gap="xs" wrap="nowrap">
                <Radio.Indicator />
                <Text size="sm" fw={500}>
                  {p.label}
                </Text>
              </Group>
            </Radio.Card>
          ))}
          <Radio.Card value={SKIP} p="sm" radius="md">
            <Group gap="xs" wrap="nowrap">
              <Radio.Indicator />
              <Text size="sm" c="dimmed">
                I'll connect later
              </Text>
            </Group>
          </Radio.Card>
        </SimpleGrid>
      </Radio.Group>

      {value.provider !== '' && (
        <>
          <SimpleGrid cols={{ base: 1, sm: 2 }}>
            <TextInput
              label="Organisation / Workspace"
              placeholder="acme"
              value={value.organisation}
              onChange={(e) => set({ organisation: e.currentTarget.value })}
            />
            <TextInput
              label="Repository name"
              placeholder="acme/web"
              value={value.repoName}
              onChange={(e) => set({ repoName: e.currentTarget.value })}
            />
          </SimpleGrid>
          <TextInput
            label="Default branch"
            value={value.defaultBranch}
            onChange={(e) => set({ defaultBranch: e.currentTarget.value })}
            maw={240}
          />
          <Switch
            label="Monorepo (frontend and backend in one repo)"
            checked={value.isMonorepo}
            onChange={(e) => set({ isMonorepo: e.currentTarget.checked })}
          />
          {value.isMonorepo && (
            <SimpleGrid cols={{ base: 1, sm: 2 }}>
              <TextInput
                label="Frontend path"
                placeholder="apps/web"
                value={value.frontendPath}
                onChange={(e) => set({ frontendPath: e.currentTarget.value })}
              />
              <TextInput
                label="Backend path"
                placeholder="apps/api"
                value={value.backendPath}
                onChange={(e) => set({ backendPath: e.currentTarget.value })}
              />
            </SimpleGrid>
          )}
          {value.provider === 'github' ? (
            <PasswordInput
              label="GitHub Personal Access Token"
              description={
                <>
                  Fine-grained{' '}
                  <Anchor href="https://github.com/settings/tokens?type=beta" target="_blank" size="xs">
                    PAT
                  </Anchor>{' '}
                  with read + write (Contents, Pull requests) on the repo. Stored encrypted; needed to
                  browse the real repo and generate code into it. Leave blank to configure details only.
                </>
              }
              placeholder="github_pat_…"
              value={value.token}
              onChange={(e) => set({ token: e.currentTarget.value })}
            />
          ) : (
            <ComingSoon label="Live repo sync">
              Real connect + push is available for GitHub today. Other providers save details only for now.
            </ComingSoon>
          )}
        </>
      )}
    </Stack>
  )
}
