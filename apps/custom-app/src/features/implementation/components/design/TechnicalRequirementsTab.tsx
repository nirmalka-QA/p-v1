import { useEffect, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'
import { Stack, Group, Text, Button, SegmentedControl, Skeleton } from '@mantine/core'
import { IconSparkles, IconDeviceFloppy } from '@tabler/icons-react'
import { AIPlaceholder } from '@wispr/ui'
import { MarkdownEditor } from '@wispr/ui'
import {
  useGetTechnicalRequirementsQuery,
  useSaveTechnicalRequirementsMutation,
  useGenerateTechnicalRequirementsMutation,
} from '../../utility/services/implementationApi'
import type { TechnicalRequirement, TechSpecScope } from '../../utility/models/model'

interface TechnicalRequirementsTabProps {
  projectId: string
  /** Auto-generate the spec for the current scope on first view when none exists yet (wizard). */
  autoGenerate?: boolean
  /** Restrict the editable scopes (e.g. only the areas chosen in the setup wizard). */
  scopes?: TechSpecScope[]
}

const SCOPE_LABEL: Record<TechSpecScope, string> = { frontend: 'Frontend', backend: 'Backend' }

/** Join the persisted sections for a scope into one editable markdown document. */
function toMarkdown(sections: TechnicalRequirement[]): string {
  return sections
    .map((s) => (s.title.trim() ? `## ${s.title.trim()}\n\n${s.content.trim()}` : s.content.trim()))
    .filter(Boolean)
    .join('\n\n')
}

/**
 * Technical Requirements — the project's technical specification per scope (frontend/backend).
 * AI-generated and editable; this is fed verbatim into code generation as the authoritative spec.
 */
export function TechnicalRequirementsTab({ projectId, autoGenerate = false, scopes }: TechnicalRequirementsTabProps) {
  const allowedScopes: TechSpecScope[] = scopes && scopes.length ? scopes : ['frontend', 'backend']
  const [scope, setScope] = useState<TechSpecScope>(allowedScopes[0])

  // Keep the selected scope within the allowed set (e.g. when the wizard restricts it).
  useEffect(() => {
    if (!allowedScopes.includes(scope)) setScope(allowedScopes[0])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowedScopes.join(',')])

  const { data: sections, isLoading, isFetching } = useGetTechnicalRequirementsQuery({ projectId, scope })
  const [generate, { isLoading: generating }] = useGenerateTechnicalRequirementsMutation()
  const [save, { isLoading: saving }] = useSaveTechnicalRequirementsMutation()

  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)
  // Remember which (scope) we've auto-generated for, so we do it once per scope.
  const autoGenScopes = useRef<Set<string>>(new Set())

  // Re-seed the editor whenever the loaded sections (or the selected scope) change.
  useEffect(() => {
    setContent(toMarkdown(sections ?? []))
    setDirty(false)
  }, [sections])

  // Wizard: auto-generate the spec for this scope once if it's empty (system drafts from the setup).
  useEffect(() => {
    if (!autoGenerate || isLoading || isFetching || generating) return
    if ((sections?.length ?? 0) > 0 || autoGenScopes.current.has(scope)) return
    autoGenScopes.current.add(scope)
    void runGenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, isLoading, isFetching, sections, scope])

  async function runGenerate() {
    try {
      const result = await generate({ projectId, scope }).unwrap()
      setContent(toMarkdown(result))
      setDirty(false)
      notifications.show({ color: 'teal', message: `${scope === 'frontend' ? 'Frontend' : 'Backend'} technical specification generated.` })
    } catch {
      notifications.show({ color: 'red', title: 'Generation failed', message: 'Please try again.' })
    }
  }

  async function persist() {
    try {
      await save({ projectId, scope, items: [{ title: '', content }] }).unwrap()
      setDirty(false)
      notifications.show({ color: 'teal', message: 'Technical specification saved.' })
    } catch {
      notifications.show({ color: 'red', title: 'Save failed', message: 'Please try again.' })
    }
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Scope
          </Text>
          {allowedScopes.length > 1 ? (
            <SegmentedControl
              value={scope}
              onChange={(v) => setScope(v as TechSpecScope)}
              data={allowedScopes.map((s) => ({ value: s, label: SCOPE_LABEL[s] }))}
            />
          ) : (
            <Text size="sm" fw={500}>
              {SCOPE_LABEL[scope]}
            </Text>
          )}
          <Text size="xs" c="dimmed">
            Fed into code generation as the authoritative technical specification for this scope.
          </Text>
        </Stack>
        <Button color="violet" leftSection={<IconSparkles size={15} />} onClick={runGenerate} loading={generating}>
          {content ? 'Regenerate' : 'Generate'}
        </Button>
      </Group>

      {isLoading || isFetching ? (
        <Skeleton height={360} radius="md" />
      ) : !content ? (
        <AIPlaceholder
          action="Generate technical specification"
          description="Draft the technical specification for this scope from your tech stack, Knowledge Base, and features. It steers code generation directly — review and edit before generating code."
          onTrigger={runGenerate}
          loading={generating}
        />
      ) : (
        <Stack gap="sm">
          <MarkdownEditor
            value={content}
            onChange={(v) => {
              setContent(v)
              setDirty(true)
            }}
            minHeight={420}
          />
          <Group>
            <Button
              variant="default"
              leftSection={<IconDeviceFloppy size={15} />}
              onClick={persist}
              loading={saving}
              disabled={!dirty}
            >
              Save
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  )
}
