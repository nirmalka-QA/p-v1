import { useMemo, useState } from 'react'
import { Anchor, Button, Group, Stack, TextInput, Skeleton, Box } from '@mantine/core'
import {
  IconSearch,
  IconPlus,
  IconAlertTriangle,
  IconTemplate,
  IconArrowLeft,
} from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { EmptyState, ConfirmModal, PageHeader } from '@wispr/ui'
import {
  useGetStrategyTemplatesQuery,
  useDuplicateStrategyTemplateMutation,
  useDeleteStrategyTemplateMutation,
} from '../../utility/services/strategyTemplatesApi'
import type { StrategyTemplate } from '../../utility/models/strategyTemplate'
import { StrategyTemplatesTable } from './StrategyTemplatesTable'
import { StrategyTemplateEditor } from './StrategyTemplateEditor'

interface StrategyTemplatesManagerProps {
  /** Return to the project-type registry landing grid. */
  onBack: () => void
}

/** The editor target: a fresh template, an edit, or a pre-filled duplicate-in-editor. */
type EditorState =
  | { mode: 'create' }
  | { mode: 'edit'; template: StrategyTemplate }
  | null

/**
 * Strategy template management — author reusable templates (phases + the
 * documents each phase consumes and generates). Owns the query lifecycle,
 * client-side search, the create/edit drawer, and the duplicate / delete actions.
 * System templates are read-only (duplicate to customise); tenant templates are
 * fully editable.
 */
export function StrategyTemplatesManager({ onBack }: StrategyTemplatesManagerProps) {
  const { data, isLoading, isError, refetch } = useGetStrategyTemplatesQuery()
  const [duplicate, duplicateState] = useDuplicateStrategyTemplateMutation()
  const [remove, removeState] = useDeleteStrategyTemplateMutation()

  const [search, setSearch] = useState('')
  const [editor, setEditor] = useState<EditorState>(null)
  const [pendingDelete, setPendingDelete] = useState<StrategyTemplate | null>(null)

  const templates = useMemo(() => data ?? [], [data])
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return templates
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q),
    )
  }, [templates, search])

  async function onDuplicate(template: StrategyTemplate) {
    try {
      await duplicate(template.id).unwrap()
      notifications.show({ color: 'teal', message: `Duplicated "${template.name}".` })
    } catch {
      notifications.show({ color: 'red', title: 'Duplicate failed', message: 'Please try again.' })
    }
  }

  async function confirmDelete() {
    if (!pendingDelete) return
    try {
      await remove(pendingDelete.id).unwrap()
      notifications.show({ color: 'gray', message: `Deleted "${pendingDelete.name}".` })
      setPendingDelete(null)
    } catch {
      notifications.show({ color: 'red', title: 'Delete failed', message: 'Please try again.' })
    }
  }

  const backLink = (
    <Anchor component="button" type="button" size="sm" c="dimmed" onClick={onBack}>
      <Group gap={4} wrap="nowrap">
        <IconArrowLeft size={14} />
        Project-type registry
      </Group>
    </Anchor>
  )

  return (
    <Stack gap="lg">
      <Box>
        {backLink}
        <Box mt="xs">
          <PageHeader
            title="Strategy templates"
            description="Reusable strategy blueprints. Each template is an ordered set of phases, and each phase defines the documents it needs and the documents the AI generates."
            actions={
              <Button leftSection={<IconPlus size={16} />} onClick={() => setEditor({ mode: 'create' })}>
                New template
              </Button>
            }
          />
        </Box>
      </Box>

      {isLoading ? (
        <Stack gap="sm">
          <Skeleton height={40} radius="md" />
          <Skeleton height={56} radius="md" />
          <Skeleton height={56} radius="md" />
        </Stack>
      ) : isError ? (
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load templates"
          description="Something went wrong while fetching strategy templates. Please try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={IconTemplate}
          title="No strategy templates yet"
          description="Create your first template to define the phases and the documents a strategy project will generate."
          action={{ label: 'New template', onClick: () => setEditor({ mode: 'create' }) }}
        />
      ) : (
        <Stack gap="md">
          <Group justify="space-between" wrap="wrap">
            <TextInput
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              placeholder="Search templates"
              leftSection={<IconSearch size={16} />}
              w={300}
            />
          </Group>

          {filtered.length === 0 ? (
            <EmptyState
              icon={IconSearch}
              title="No matching templates"
              description="No templates match your search. Try a different name."
            />
          ) : (
            <StrategyTemplatesTable
              templates={filtered}
              busy={duplicateState.isLoading}
              onEdit={(template) => setEditor({ mode: 'edit', template })}
              onDuplicate={onDuplicate}
              onDelete={(template) => setPendingDelete(template)}
            />
          )}
        </Stack>
      )}

      {editor && (
        <StrategyTemplateEditor
          opened
          mode={editor.mode}
          template={editor.mode === 'edit' ? editor.template : undefined}
          onClose={() => setEditor(null)}
          onSaved={(name) => {
            setEditor(null)
            notifications.show({ color: 'teal', message: `Saved "${name}".` })
          }}
        />
      )}

      <ConfirmModal
        opened={pendingDelete !== null}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        loading={removeState.isLoading}
        danger
        title="Delete template?"
        message={
          pendingDelete
            ? `"${pendingDelete.name}" and its ${pendingDelete.phases.length} phase(s) will be removed. Projects already created from it are unaffected.`
            : ''
        }
        confirmLabel="Delete"
      />
    </Stack>
  )
}
