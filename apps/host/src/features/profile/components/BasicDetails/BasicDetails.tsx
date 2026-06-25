import type { ReactNode } from 'react'
import {
  Paper,
  Box,
  Group,
  Stack,
  Avatar,
  Title,
  Text,
  Badge,
  Button,
  ActionIcon,
  FileButton,
  SimpleGrid,
  Skeleton,
} from '@mantine/core'
import { IconAlertTriangle, IconCamera, IconTrash } from '@tabler/icons-react'
import { notifications } from '@mantine/notifications'
import { EmptyState } from '@wispr/ui'
import { useAppSelector } from '@wispr/store'
import {
  useGetProfileQuery,
  useUploadProfilePictureMutation,
  useRemoveProfilePictureMutation,
} from '../../utility/services/services'
import { toProfileView } from '../../utility/helpers/helpers'
import {
  ROLE_LABEL,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_IMAGE_ACCEPT,
  MAX_AVATAR_BYTES,
} from '../../utility/constants/constants'
import styles from './BasicDetails.module.css'

/** One label/value pair in the details grid. */
function DetailItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Stack gap={2}>
      <Text size="xs" c="dimmed" tt="uppercase" fw={700} lts={0.4}>
        {label}
      </Text>
      <Text size="sm" fw={500}>
        {value}
      </Text>
    </Stack>
  )
}

/**
 * The basic-details card: identity (name/email/role — authoritative from the
 * session) plus directory fields (designation, domain, reporting manager) from the
 * profile API, with an editable profile picture. Owns its own loading / error states.
 */
export function BasicDetails() {
  const sessionUser = useAppSelector((s) => s.session.user)
  const { data, isLoading, isError, refetch } = useGetProfileQuery()
  const [uploadPicture, uploadState] = useUploadProfilePictureMutation()
  const [removePicture, removeState] = useRemoveProfilePictureMutation()

  function handlePick(file: File | null) {
    if (!file) return
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      notifications.show({
        color: 'red',
        title: 'Unsupported file',
        message: 'Choose a PNG, JPG, WEBP or GIF image.',
      })
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      notifications.show({
        color: 'red',
        title: 'Image too large',
        message: 'Choose an image under 2 MB.',
      })
      return
    }
    const form = new FormData()
    form.append('file', file)
    uploadPicture(form)
      .unwrap()
      .then(() => notifications.show({ color: 'teal', message: 'Profile picture updated.' }))
      .catch(() =>
        notifications.show({
          color: 'red',
          title: 'Upload failed',
          message: 'Could not update your picture. Please try again.',
        }),
      )
  }

  function handleRemove() {
    removePicture()
      .unwrap()
      .then(() => notifications.show({ color: 'gray', message: 'Profile picture removed.' }))
      .catch(() =>
        notifications.show({
          color: 'red',
          title: 'Remove failed',
          message: 'Could not remove your picture. Please try again.',
        }),
      )
  }

  if (isLoading) {
    return (
      <Paper withBorder radius="md" p="lg">
        <Group gap="md" mb="lg">
          <Skeleton circle height={56} />
          <Stack gap={6} style={{ flex: 1 }}>
            <Skeleton height={20} width={200} radius="sm" />
            <Skeleton height={14} width={140} radius="sm" />
          </Stack>
        </Group>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          <Skeleton height={40} radius="sm" />
          <Skeleton height={40} radius="sm" />
          <Skeleton height={40} radius="sm" />
          <Skeleton height={40} radius="sm" />
        </SimpleGrid>
      </Paper>
    )
  }

  if (isError || !data) {
    return (
      <Paper withBorder radius="md" p="lg">
        <EmptyState
          icon={IconAlertTriangle}
          title="Couldn't load your profile"
          description="Something went wrong while fetching your details. Please try again."
          action={{ label: 'Retry', onClick: () => refetch() }}
        />
      </Paper>
    )
  }

  const role =
    sessionUser?.roles.includes('platformAdmin') ? 'platformAdmin' : sessionUser?.roles[0]
  const view = toProfileView(data, {
    name: sessionUser?.name,
    email: sessionUser?.email,
    role,
  })
  const manager = view.reportingManager

  return (
    <Paper withBorder radius="md" p="lg">
      <Group gap="md" mb="xl" wrap="nowrap" align="flex-start">
        <Box className={styles.avatarWrap ?? ''}>
          <Avatar
            src={view.avatarUrl ?? null}
            color={view.avatarColor}
            variant="filled"
            radius="xl"
            size={56}
          >
            {view.initials}
          </Avatar>
          <FileButton onChange={handlePick} accept={ACCEPTED_IMAGE_ACCEPT}>
            {(props) => (
              <ActionIcon
                {...props}
                className={styles.avatarEdit ?? ''}
                size="sm"
                radius="xl"
                variant="filled"
                color="violet"
                loading={uploadState.isLoading}
                aria-label="Change profile picture"
              >
                <IconCamera size={14} />
              </ActionIcon>
            )}
          </FileButton>
        </Box>
        <Stack gap={4} miw={0}>
          <Group gap="sm" align="center">
            <Title order={3} size="h4">
              {view.name}
            </Title>
            <Badge color="violet" variant="light">
              {ROLE_LABEL[view.role]}
            </Badge>
          </Group>
          <Text size="sm" c="dimmed">
            {view.designation}
          </Text>
          {view.avatarUrl && (
            <Button
              variant="subtle"
              color="gray"
              size="compact-xs"
              w="fit-content"
              leftSection={<IconTrash size={12} />}
              loading={removeState.isLoading}
              onClick={handleRemove}
            >
              Remove photo
            </Button>
          )}
        </Stack>
      </Group>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
        <DetailItem label="Email" value={view.email} />
        <DetailItem label="Designation" value={view.designation} />
        <DetailItem label="Domain" value={view.domain} />
        <DetailItem label="Role" value={ROLE_LABEL[view.role]} />
        <DetailItem
          label="Reporting manager"
          value={
            manager ? (
              <Text span size="sm" fw={500}>
                {manager.name}
                {manager.designation && (
                  <Text span c="dimmed" fw={400}>
                    {' '}
                    · {manager.designation}
                  </Text>
                )}
              </Text>
            ) : (
              '—'
            )
          }
        />
      </SimpleGrid>
    </Paper>
  )
}
