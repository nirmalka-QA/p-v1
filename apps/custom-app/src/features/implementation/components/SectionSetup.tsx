import { useState, useEffect } from 'react'
import { Stack, Text, Group, Button, Paper } from '@mantine/core'
import { IconDeviceFloppy } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { FrontendSetup } from './setup/FrontendSetup'
import { BackendSetup } from './setup/BackendSetup'
import { DatabaseSetup } from './setup/DatabaseSetup'
import { useGetTechStackQuery, useUpdateTechStackMutation } from '../utility/services/implementationApi'
import {
  selectionFromItems,
  defaultSelection,
  mergeAreaItems,
  type StackSelection,
  type StackArea,
} from '../utility/helpers/setup'
import type { ProjectType } from '../utility/models/model'

interface SectionSetupProps {
  projectId: string
  projectType: ProjectType
  area: StackArea
  description: string
}

/**
 * Per-page setup for one stack area (Frontend / Backend / Database). Saving
 * merges only this area's choices, leaving the others untouched — so each section
 * can be configured independently of the wizard.
 */
export function SectionSetup({ projectId, projectType, area, description }: SectionSetupProps) {
  const { data: techStack } = useGetTechStackQuery(projectId)
  const [update, { isLoading }] = useUpdateTechStackMutation()
  const items = techStack?.items ?? []

  const [selection, setSelection] = useState<StackSelection>(() => defaultSelection(projectType))
  const [dirty, setDirty] = useState(false)

  // Seed from saved items until the user edits.
  useEffect(() => {
    if (!dirty) setSelection(selectionFromItems(items, projectType))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [techStack])

  const change = (next: StackSelection) => {
    setSelection(next)
    setDirty(true)
  }

  async function save() {
    try {
      await update({ projectId, items: mergeAreaItems(items, selection, area), type: projectType }).unwrap()
      setDirty(false)
      notifications.show({ color: 'teal', title: 'Saved', message: 'Your selection is saved.' })
    } catch {
      notifications.show({ color: 'red', title: 'Could not save', message: 'Please try again.' })
    }
  }

  const suggested = defaultSelection(projectType)

  return (
    <Paper withBorder radius="md" p="lg" maw={720}>
      <Stack gap="md">
        <Text size="sm" c="dimmed" lh={1.5}>
          {description}
        </Text>
        {area === 'frontend' && (
          <FrontendSetup value={selection} onChange={change} suggestedFramework={suggested.feFramework} />
        )}
        {area === 'backend' && (
          <BackendSetup value={selection} onChange={change} suggestedFramework={suggested.beFramework} />
        )}
        {area === 'database' && <DatabaseSetup value={selection} onChange={change} />}
        <Group justify="flex-end">
          <Button variant="accent" leftSection={<IconDeviceFloppy size={15} />} loading={isLoading} onClick={save}>
            Save
          </Button>
        </Group>
      </Stack>
    </Paper>
  )
}
