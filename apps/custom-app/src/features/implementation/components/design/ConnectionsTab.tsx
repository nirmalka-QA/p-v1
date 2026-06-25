import { useEffect, useState } from 'react'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import {
  Stack,
  Paper,
  Group,
  Text,
  TextInput,
  PasswordInput,
  Button,
  Select,
  Badge,
  ThemeIcon,
  ActionIcon,
  Anchor,
  Skeleton,
} from '@mantine/core'
import { IconBrandFigma, IconPlus, IconTrash, IconExternalLink, IconLink, IconPencil } from '@tabler/icons-react'
import { EmptyState } from '@wispr/ui'
import {
  useGetDesignAssetsQuery,
  useSaveDesignAssetsMutation,
} from '../../utility/services/implementationApi'
import {
  DESIGN_REFERENCE_CATEGORIES,
  DEFAULT_REFERENCE_CATEGORY,
} from '../../utility/constants/design'
import type { DesignReferenceLink, DesignReferenceCategory } from '../../utility/models/model'

interface ConnectionsTabProps {
  projectId: string
}

const CATEGORY_OPTIONS = DESIGN_REFERENCE_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))

function categoryConfig(id: DesignReferenceCategory) {
  return DESIGN_REFERENCE_CATEGORIES.find((c) => c.id === id) ?? DESIGN_REFERENCE_CATEGORIES[0]
}

/** Connections & References — Figma link and external reference URLs. */
export function ConnectionsTab({ projectId }: ConnectionsTabProps) {
  const { data: design, isLoading } = useGetDesignAssetsQuery(projectId)
  const [saveDesign, { isLoading: saving }] = useSaveDesignAssetsMutation()

  const links = design?.referenceLinks ?? []
  const figmaConnected = Boolean(design?.figmaUrl)
  // Whether the Figma form is shown (adding a new link or editing the saved one).
  const [figmaEditing, setFigmaEditing] = useState(false)

  const figmaForm = useForm({
    initialValues: { figmaUrl: '', figmaToken: '' },
    validate: {
      figmaUrl: (v) => (/^https?:\/\/.+/.test(v.trim()) ? null : 'Enter the Figma file URL (https://…)'),
    },
  })
  // Seed the Figma form once the saved assets arrive (token never echoed back).
  useEffect(() => {
    if (design) figmaForm.setValues({ figmaUrl: design.figmaUrl ?? '', figmaToken: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design?.figmaUrl])

  function startFigmaEdit() {
    figmaForm.setValues({ figmaUrl: design?.figmaUrl ?? '', figmaToken: '' })
    setFigmaEditing(true)
  }

  function cancelFigmaEdit() {
    figmaForm.setValues({ figmaUrl: design?.figmaUrl ?? '', figmaToken: '' })
    setFigmaEditing(false)
  }

  async function disconnectFigma() {
    try {
      await saveDesign({ projectId, patch: { figmaUrl: undefined, hasFigmaToken: false } }).unwrap()
      setFigmaEditing(false)
      notifications.show({ color: 'gray', message: 'Figma disconnected.' })
    } catch {
      notifications.show({ color: 'red', title: 'Save failed', message: 'Please try again.' })
    }
  }

  const linkForm = useForm({
    initialValues: { label: '', url: '', category: DEFAULT_REFERENCE_CATEGORY as string },
    validate: {
      label: (v) => (v.trim().length === 0 ? 'Add a label' : null),
      url: (v) => (/^https?:\/\/.+/.test(v.trim()) ? null : 'Enter a valid URL (https://…)'),
    },
  })

  async function saveFigma(values: typeof figmaForm.values) {
    try {
      await saveDesign({
        projectId,
        patch: {
          figmaUrl: values.figmaUrl.trim() || undefined,
          hasFigmaToken: Boolean(values.figmaToken.trim()) || Boolean(design?.hasFigmaToken),
        },
      }).unwrap()
      notifications.show({ color: 'teal', message: 'Figma connection saved.' })
      setFigmaEditing(false)
    } catch {
      notifications.show({ color: 'red', title: 'Save failed', message: 'Please try again.' })
    }
  }

  async function persistLinks(next: DesignReferenceLink[]) {
    try {
      await saveDesign({ projectId, patch: { referenceLinks: next } }).unwrap()
    } catch {
      notifications.show({ color: 'red', title: 'Save failed', message: 'Please try again.' })
    }
  }

  async function addLink(values: typeof linkForm.values) {
    const next: DesignReferenceLink[] = [
      ...links,
      {
        id: crypto.randomUUID(),
        label: values.label.trim(),
        url: values.url.trim(),
        category: values.category as DesignReferenceCategory,
      },
    ]
    await persistLinks(next)
    linkForm.reset()
  }

  function removeLink(id: string) {
    void persistLinks(links.filter((l) => l.id !== id))
  }

  if (isLoading) return <Skeleton height={320} radius="md" />

  return (
    <Stack gap="xl">
      {/* Figma */}
      <Paper withBorder radius="md" p="md">
        <Group gap={8} mb="sm">
          <ThemeIcon size={24} radius="sm" variant="light" color="gray">
            <IconBrandFigma size={15} />
          </ThemeIcon>
          <Text fw={600}>Figma</Text>
          {figmaConnected && !figmaEditing && (
            <Badge size="sm" color="teal" variant="light">
              Connected
            </Badge>
          )}
        </Group>

        {figmaConnected && !figmaEditing ? (
          // Saved state — show the linked file with edit / disconnect.
          <Stack gap="sm">
            <Group gap="sm" wrap="nowrap">
              <Stack gap={2} flex={1} miw={0}>
                <Anchor href={design?.figmaUrl} target="_blank" rel="noreferrer" size="sm" truncate>
                  {design?.figmaUrl}
                </Anchor>
                {design?.hasFigmaToken && (
                  <Text size="xs" c="dimmed">
                    Access token saved
                  </Text>
                )}
              </Stack>
              <ActionIcon
                component="a"
                href={design?.figmaUrl}
                target="_blank"
                rel="noreferrer"
                variant="subtle"
                color="gray"
                aria-label="Open Figma file"
              >
                <IconExternalLink size={15} />
              </ActionIcon>
            </Group>
            <Group gap="sm">
              <Button
                variant="default"
                size="compact-sm"
                leftSection={<IconPencil size={14} />}
                onClick={startFigmaEdit}
              >
                Edit
              </Button>
              <Button
                variant="subtle"
                color="red"
                size="compact-sm"
                leftSection={<IconTrash size={14} />}
                onClick={disconnectFigma}
                loading={saving}
              >
                Disconnect
              </Button>
            </Group>
          </Stack>
        ) : figmaEditing ? (
          // Form — add or edit the connection.
          <form onSubmit={figmaForm.onSubmit(saveFigma)}>
            <Stack gap="sm">
              <TextInput
                label="Figma file URL"
                placeholder="https://figma.com/file/…"
                {...figmaForm.getInputProps('figmaUrl')}
              />
              <PasswordInput
                label="Personal access token"
                placeholder={design?.hasFigmaToken ? '•••••••• (saved)' : 'figd_…'}
                description="Referenced when generating UI components. Stored with the project."
                {...figmaForm.getInputProps('figmaToken')}
              />
              <Group gap="sm">
                <Button type="submit" variant="default" loading={saving}>
                  Save connection
                </Button>
                <Button variant="subtle" color="gray" onClick={cancelFigmaEdit}>
                  Cancel
                </Button>
              </Group>
            </Stack>
          </form>
        ) : (
          // Not connected — offer to add.
          <Stack gap="sm" align="flex-start">
            <Text size="sm" c="dimmed">
              Link a Figma file so generated UI can reference your designs.
            </Text>
            <Button variant="light" leftSection={<IconPlus size={14} />} onClick={startFigmaEdit}>
              Add Figma connection
            </Button>
          </Stack>
        )}
      </Paper>

      {/* Reference links */}
      <Stack gap="sm">
        <Text fw={600}>Reference links</Text>
        <Text size="sm" c="dimmed">
          Design system, brand guide, Storybook, or docs the AI and developers should follow. Included in the
          generated AI instructions.
        </Text>

        {links.length === 0 ? (
          <EmptyState
            icon={IconLink}
            title="No reference links yet"
            description="Add a URL to a design system, brand guide, or component library so it's captured in your AI instructions."
          />
        ) : (
          <Stack gap="xs">
            {links.map((link) => {
              const cfg = categoryConfig(link.category)
              const CatIcon = cfg.icon
              return (
                <Paper key={link.id} withBorder radius="sm" p="sm">
                  <Group gap="sm" wrap="nowrap">
                    <ThemeIcon size={28} radius="sm" variant="light" color="gray">
                      <CatIcon size={15} />
                    </ThemeIcon>
                    <Stack gap={0} flex={1} miw={0}>
                      <Group gap={6}>
                        <Text size="sm" fw={600} truncate>
                          {link.label}
                        </Text>
                        <Badge size="xs" variant="light" color="gray">
                          {cfg.label}
                        </Badge>
                      </Group>
                      <Anchor href={link.url} target="_blank" rel="noreferrer" size="xs" truncate>
                        {link.url}
                      </Anchor>
                    </Stack>
                    <ActionIcon
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noreferrer"
                      variant="subtle"
                      color="gray"
                      aria-label="Open link"
                    >
                      <IconExternalLink size={15} />
                    </ActionIcon>
                    <ActionIcon
                      variant="subtle"
                      color="gray"
                      onClick={() => removeLink(link.id)}
                      aria-label={`Remove ${link.label}`}
                    >
                      <IconTrash size={15} />
                    </ActionIcon>
                  </Group>
                </Paper>
              )
            })}
          </Stack>
        )}

        {/* Add link */}
        <Paper withBorder radius="sm" p="sm">
          <form onSubmit={linkForm.onSubmit(addLink)}>
            <Group gap="sm" align="flex-start" wrap="nowrap">
              <TextInput
                flex={1}
                label="Label"
                placeholder="Acme Design System"
                {...linkForm.getInputProps('label')}
              />
              <TextInput
                flex={1.4}
                label="URL"
                placeholder="https://…"
                {...linkForm.getInputProps('url')}
              />
              <Select
                label="Category"
                data={CATEGORY_OPTIONS}
                allowDeselect={false}
                w={180}
                {...linkForm.getInputProps('category')}
              />
              <Button
                type="submit"
                variant="light"
                mt={25}
                leftSection={<IconPlus size={14} />}
                loading={saving}
              >
                Add
              </Button>
            </Group>
          </form>
        </Paper>
      </Stack>
    </Stack>
  )
}
