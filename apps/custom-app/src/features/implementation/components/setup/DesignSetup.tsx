import { Stack, TextInput, PasswordInput, Textarea, Group, Text, Button, Paper, CloseButton, ThemeIcon, FileButton } from '@mantine/core'
import { IconBrandFigma, IconUpload, IconPhoto, IconFileTypePdf } from '@tabler/icons-react'
import type { UploadedFile } from '../../utility/models/model'

/** Design-system inputs draft (UI state). */
export interface DesignDraft {
  figmaUrl: string
  figmaToken: string
  notes: string
  uploads: UploadedFile[]
}

export const EMPTY_DESIGN_DRAFT: DesignDraft = { figmaUrl: '', figmaToken: '', notes: '', uploads: [] }

interface DesignSetupProps {
  value: DesignDraft
  onChange: (next: DesignDraft) => void
}

function toUploaded(file: File): UploadedFile {
  return {
    id: `da-${file.name}-${file.size}`,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    status: 'ready',
    uploadedAt: new Date().toISOString(),
    url: URL.createObjectURL(file),
  }
}

/** Design reference picker — Figma, free-form notes, and mockup uploads. Controlled. */
export function DesignSetup({ value, onChange }: DesignSetupProps) {
  const set = (patch: Partial<DesignDraft>) => onChange({ ...value, ...patch })

  function addFiles(files: File[]) {
    const incoming = files
      .map(toUploaded)
      .filter((f) => !value.uploads.some((u) => u.id === f.id))
    if (incoming.length) set({ uploads: [...value.uploads, ...incoming] })
  }

  return (
    <Stack gap="lg">
      <Stack gap="xs">
        <Group gap={6}>
          <IconBrandFigma size={15} />
          <Text size="sm" fw={600}>
            Figma
          </Text>
        </Group>
        <TextInput
          label="Figma file URL"
          placeholder="https://figma.com/file/…"
          value={value.figmaUrl}
          onChange={(e) => set({ figmaUrl: e.currentTarget.value })}
        />
        <PasswordInput
          label="Personal access token"
          placeholder="figd_…"
          value={value.figmaToken}
          onChange={(e) => set({ figmaToken: e.currentTarget.value })}
          description="Referenced when generating UI components. Stored with the project."
        />
      </Stack>

      <Stack gap="xs">
        <Text size="sm" fw={600}>
          Images &amp; mockups
        </Text>
        <FileButton onChange={addFiles} accept="image/png,image/jpeg,application/pdf" multiple>
          {(props) => (
            <Button {...props} variant="default" leftSection={<IconUpload size={14} />} w="fit-content">
              Upload references
            </Button>
          )}
        </FileButton>
        {value.uploads.length > 0 && (
          <Group gap={6}>
            {value.uploads.map((f) => (
              <Paper key={f.id} withBorder radius="sm" px="xs" py={4}>
                <Group gap={6} wrap="nowrap">
                  <ThemeIcon size={18} radius="sm" variant="light" color="gray">
                    {f.type.includes('pdf') ? <IconFileTypePdf size={12} /> : <IconPhoto size={12} />}
                  </ThemeIcon>
                  <Text size="xs" maw={160} truncate>
                    {f.name}
                  </Text>
                  <CloseButton
                    size="xs"
                    aria-label={`Remove ${f.name}`}
                    onClick={() => set({ uploads: value.uploads.filter((u) => u.id !== f.id) })}
                  />
                </Group>
              </Paper>
            ))}
          </Group>
        )}
      </Stack>

      <Textarea
        label="Design notes"
        placeholder="Describe your visual style — colours, spacing, component patterns, typography rules, anything the AI should know."
        autosize
        minRows={3}
        value={value.notes}
        onChange={(e) => set({ notes: e.currentTarget.value })}
      />
    </Stack>
  )
}
