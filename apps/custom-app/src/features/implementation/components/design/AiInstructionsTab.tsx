import { useEffect, useState } from 'react'
import { notifications } from '@mantine/notifications'
import {
  Stack,
  Group,
  Text,
  Button,
  SegmentedControl,
  CopyButton,
  Skeleton,
} from '@mantine/core'
import { IconSparkles, IconCopy, IconCheck, IconDownload, IconDeviceFloppy } from '@tabler/icons-react'
import { AIPlaceholder } from '@wispr/ui'
import { MarkdownEditor } from '@wispr/ui'
import {
  useGetDesignAssetsQuery,
  useGenerateAiInstructionsMutation,
  useSaveDesignAssetsMutation,
} from '../../utility/services/implementationApi'
import { AI_FORMAT_OPTIONS } from '../../utility/constants/design'
import { SYSTEM_CONVENTIONS } from '../../utility/constants/constants'
import { AI_FORMAT_FILENAME, type AiInstructionFormat } from '../../utility/helpers/mockAiInstructions'
import { downloadTextFile } from '../../utility/helpers/download'

interface AiInstructionsTabProps {
  projectId: string
  projectName: string
}

const CONVENTIONS = SYSTEM_CONVENTIONS.map(({ label, value }) => ({ label, value }))
const FORMAT_DATA = AI_FORMAT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))

/** AI Instructions — generate CLAUDE.md / .cursorrules / copilot-instructions.md. */
export function AiInstructionsTab({ projectId, projectName }: AiInstructionsTabProps) {
  const { data: design, isLoading } = useGetDesignAssetsQuery(projectId)
  const [generate, { isLoading: generating }] = useGenerateAiInstructionsMutation()
  const [saveDesign, { isLoading: saving }] = useSaveDesignAssetsMutation()

  const [format, setFormat] = useState<AiInstructionFormat>('claude')
  const [content, setContent] = useState('')
  const [dirty, setDirty] = useState(false)

  // Seed from saved assets when they load.
  useEffect(() => {
    if (!design) return
    setFormat(design.aiInstructionsFormat ?? 'claude')
    setContent(design.aiInstructionsContent ?? '')
    setDirty(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.aiInstructionsContent, design?.aiInstructionsFormat])

  const filename = AI_FORMAT_FILENAME[format]

  async function runGenerate() {
    try {
      const result = await generate({ projectId, projectName, format, conventions: CONVENTIONS }).unwrap()
      setContent(result.aiInstructionsContent ?? '')
      setDirty(false)
      notifications.show({ color: 'teal', message: `${filename} generated.` })
    } catch {
      notifications.show({ color: 'red', title: 'Generation failed', message: 'Please try again.' })
    }
  }

  async function save() {
    try {
      await saveDesign({
        projectId,
        patch: { aiInstructionsContent: content, aiInstructionsFormat: format },
      }).unwrap()
      setDirty(false)
      notifications.show({ color: 'teal', message: 'Instructions saved.' })
    } catch {
      notifications.show({ color: 'red', title: 'Save failed', message: 'Please try again.' })
    }
  }

  if (isLoading) return <Skeleton height={360} radius="md" />

  return (
    <Stack gap="md">
      <Group justify="space-between" align="flex-end">
        <Stack gap={4}>
          <Text size="sm" fw={600}>
            Target format
          </Text>
          <SegmentedControl
            value={format}
            onChange={(v) => setFormat(v as AiInstructionFormat)}
            data={FORMAT_DATA}
          />
          <Text size="xs" c="dimmed" ff="monospace">
            Writes to {filename}
          </Text>
        </Stack>
        <Button
          color="violet"
          leftSection={<IconSparkles size={15} />}
          onClick={runGenerate}
          loading={generating}
        >
          {content ? 'Regenerate' : 'Generate'}
        </Button>
      </Group>

      {!content ? (
        <AIPlaceholder
          action="Generate AI instructions"
          description="Assemble your tech stack, repository, conventions, references, and design notes into a single instruction file your AI coding tool follows."
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
              onClick={save}
              loading={saving}
              disabled={!dirty}
            >
              Save
            </Button>
            <CopyButton value={content} timeout={1500}>
              {({ copied, copy }) => (
                <Button
                  variant="subtle"
                  color={copied ? 'teal' : 'gray'}
                  leftSection={copied ? <IconCheck size={15} /> : <IconCopy size={15} />}
                  onClick={copy}
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              )}
            </CopyButton>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconDownload size={15} />}
              onClick={() => downloadTextFile(filename, content)}
            >
              Download
            </Button>
          </Group>
        </Stack>
      )}
    </Stack>
  )
}
