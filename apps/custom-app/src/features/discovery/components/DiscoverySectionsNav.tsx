import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import {
  Box,
  TextInput,
  NavLink,
  Text,
  ColorSwatch,
  Divider,
  Stack,
  Group,
  ActionIcon,
  Button,
} from '@mantine/core'
import { IconSearch, IconFile, IconDownload, IconPlus } from '@tabler/icons-react'
import { useGetKbQuery, useGetUploadsQuery } from '../utility/services/discoveryApi'
import nav from '../../../components/layout/SidebarNav.module.css'

/**
 * Discovery sidebar: KB sections (with search) + a Sources list of uploaded
 * artifacts (downloadable) + an "Add more context" trigger. The selected
 * section and the add-context modal are both held in the URL.
 */
export function DiscoverySectionsNav() {
  const { projectId } = useParams<{ projectId: string }>()
  const { data: kb } = useGetKbQuery(projectId ?? skipToken)
  const { data: uploads = [] } = useGetUploadsQuery(projectId ?? skipToken)
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState('')

  if (!kb) return null

  const firstPopulated = kb.sections.find((s) => s.notes.length > 0)?.id ?? kb.sections[0]?.id
  const selected = searchParams.get('section') ?? firstPopulated

  const q = query.trim().toLowerCase()
  const filtered = q
    ? kb.sections.filter((s) => s.label.toLowerCase().includes(q))
    : kb.sections

  function selectSection(id: string) {
    const next = new URLSearchParams(searchParams)
    next.set('section', id)
    next.delete('add')
    setSearchParams(next)
  }

  function openAddContext() {
    const next = new URLSearchParams(searchParams)
    next.set('add', '1')
    setSearchParams(next)
  }

  return (
    <Box p="sm">
      <Button
        fullWidth
        variant="accent"
        
        mb="sm"
        leftSection={<IconPlus size={14} />}
        onClick={openAddContext}
      >
        Add more context
      </Button>

      <TextInput
        size="xs"
        placeholder="Search sections…"
        leftSection={<IconSearch size={13} />}
        value={query}
        onChange={(e) => setQuery(e.currentTarget.value)}
        mb="xs"
      />

      {filtered.map((section) => {
        const hasNotes = section.notes.length > 0
        return (
          <NavLink
            key={section.id}
            active={section.id === selected}
            color="gray"
            classNames={{ root: nav.navRoot, label: nav.navLabel }}
            label={section.label}
            onClick={() => selectSection(section.id)}
            leftSection={
              <ColorSwatch
                size={8}
                withShadow={false}
                color={hasNotes ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-gray-5)'}
              />
            }
            rightSection={
              hasNotes ? (
                <Text size="xs" c="dimmed" ff="monospace">
                  {section.notes.length}
                </Text>
              ) : null
            }
          />
        )
      })}

      {filtered.length === 0 && (
        <Text size="xs" c="dimmed" ta="center" mt="md">
          No sections match “{query}”.
        </Text>
      )}

      {/* ── Sources / artifacts ── */}
      <Divider my="sm" />
      <Group justify="space-between" px="xs" mb={6}>
        <Text size="xs" ff="monospace" tt="uppercase" fw={600} c="dimmed">
          Sources
        </Text>
        <Text size="xs" c="dimmed" ff="monospace">
          {uploads.length}
        </Text>
      </Group>

      {uploads.length === 0 ? (
        <Text size="xs" c="dimmed" px="xs">
          No files uploaded yet.
        </Text>
      ) : (
        <Stack gap={2} px={4}>
          {uploads.map((u) => (
            <Group key={u.id} gap={6} wrap="nowrap" justify="space-between">
              <Group gap={6} wrap="nowrap" flex={1} miw={0}>
                <IconFile size={13} />
                <Text size="xs" truncate>
                  {u.name}
                </Text>
              </Group>
              <ActionIcon
                component="a"
                href={u.url}
                download={u.name}
                variant="subtle"
                color="gray"
                size="sm"
                disabled={!u.url}
                aria-label={`Download ${u.name}`}
              >
                <IconDownload size={13} />
              </ActionIcon>
            </Group>
          ))}
        </Stack>
      )}
    </Box>
  )
}
