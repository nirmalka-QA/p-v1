import { useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  Stack,
  Group,
  Text,
  Paper,
  SimpleGrid,
  ColorSwatch,
  Code,
  Button,
  Textarea,
  Collapse,
  Skeleton,
  Title,
  Table,
} from '@mantine/core'
import { IconPalette, IconCodePlus, IconCheck } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import {
  useGetDesignAssetsQuery,
  useSaveDesignAssetsMutation,
} from '../../utility/services/implementationApi'
import {
  parseDesignTokens,
  tokenCount,
  type DesignTokenEntry,
} from '../../utility/helpers/designTokens'

interface TokensTabProps {
  projectId: string
}

/** Design Tokens — colour swatches, type scale, spacing & radii, with JSON import. */
export function TokensTab({ projectId }: TokensTabProps) {
  const { data: design, isLoading } = useGetDesignAssetsQuery(projectId)
  const [saveDesign, { isLoading: saving }] = useSaveDesignAssetsMutation()
  const [importOpen, setImportOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)

  const parsed = parseDesignTokens(design?.tokens)
  const total = tokenCount(parsed)

  async function importTokens() {
    setError(null)
    let value: Record<string, unknown>
    try {
      value = JSON.parse(raw)
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new Error('Tokens must be a JSON object.')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid JSON.')
      return
    }
    try {
      await saveDesign({ projectId, patch: { tokens: value } }).unwrap()
      notifications.show({ color: 'teal', message: 'Design tokens imported.' })
      setRaw('')
      setImportOpen(false)
    } catch {
      notifications.show({ color: 'red', title: 'Import failed', message: 'Please try again.' })
    }
  }

  if (isLoading) return <Skeleton height={320} radius="md" />

  const importPanel = (
    <Collapse expanded={importOpen}>
      <Paper withBorder radius="md" p="md" mt="sm">
        <Stack gap="sm">
          <Text size="sm" c="dimmed">
            Paste a design-tokens JSON object (colours, typography, spacing, radii). Nested groups are flattened
            to dotted names.
          </Text>
          <Textarea
            placeholder={'{\n  "color": { "primary": "#4c6ef5" },\n  "radius": { "md": "8px" }\n}'}
            autosize
            minRows={6}
            maxRows={16}
            value={raw}
            onChange={(e) => setRaw(e.currentTarget.value)}
            error={error}
          />
          <Group>
            <Button variant="light" loading={saving} onClick={importTokens} disabled={!raw.trim()}>
              Import tokens
            </Button>
            <Button variant="subtle" color="gray" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Collapse>
  )

  if (total === 0) {
    return (
      <Stack gap="sm">
        <EmptyState
          icon={IconPalette}
          title="No design tokens yet"
          description="Import your colour, typography, spacing, and radius tokens as JSON so generated code uses your real values."
          action={{ label: 'Import tokens', onClick: () => setImportOpen(true) }}
        />
        {importPanel}
      </Stack>
    )
  }

  return (
    <Stack gap="xl">
      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          {total} token{total === 1 ? '' : 's'} across {Object.values(parsed).filter((g) => g.length).length} group(s)
        </Text>
        <Button
          variant="light"
          size="compact-sm"
          leftSection={<IconCodePlus size={14} />}
          onClick={() => setImportOpen((o) => !o)}
        >
          Replace via JSON
        </Button>
      </Group>
      {importPanel}

      {parsed.colors.length > 0 && (
        <TokenGroup title="Colours">
          <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
            {parsed.colors.map((t) => (
              <Paper key={t.name} withBorder radius="sm" p="xs">
                <Group gap="xs" wrap="nowrap">
                  <ColorSwatch color={t.value} size={28} radius="sm" />
                  <Stack gap={0} miw={0}>
                    <Text size="xs" fw={600} truncate>
                      {t.name}
                    </Text>
                    <Text size="xs" c="dimmed" ff="monospace" truncate>
                      {t.value}
                    </Text>
                  </Stack>
                </Group>
              </Paper>
            ))}
          </SimpleGrid>
        </TokenGroup>
      )}

      {parsed.typography.length > 0 && <TokenTable title="Typography" entries={parsed.typography} />}
      {parsed.spacing.length > 0 && <TokenTable title="Spacing & sizing" entries={parsed.spacing} />}
      {parsed.radii.length > 0 && <TokenTable title="Radii" entries={parsed.radii} />}
      {parsed.other.length > 0 && <TokenTable title="Other" entries={parsed.other} />}

      {importOpen && total > 0 && (
        <Text size="xs" c="dimmed">
          <IconCheck size={12} /> Importing replaces the current tokens.
        </Text>
      )}
    </Stack>
  )
}

function TokenGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Stack gap="sm">
      <Title order={5} fw={600}>
        {title}
      </Title>
      {children}
    </Stack>
  )
}

function TokenTable({ title, entries }: { title: string; entries: DesignTokenEntry[] }) {
  return (
    <TokenGroup title={title}>
      <Paper withBorder radius="sm">
        <Table withRowBorders verticalSpacing={6} horizontalSpacing="sm">
          <Table.Tbody>
            {entries.map((t) => (
              <Table.Tr key={t.name}>
                <Table.Td>
                  <Text size="sm" truncate>
                    {t.name}
                  </Text>
                </Table.Td>
                <Table.Td ta="right" w="40%">
                  <Code>{t.value}</Code>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Paper>
    </TokenGroup>
  )
}
