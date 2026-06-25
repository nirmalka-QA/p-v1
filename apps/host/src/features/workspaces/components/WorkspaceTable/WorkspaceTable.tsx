import { Table, Box, Group, Avatar, Text, Badge } from '@mantine/core'
import { IconChevronRight } from '@tabler/icons-react'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { workspaceInitials, memberColor } from '../../utility/helpers/helpers'
import { projectTypeTag, projectTypeColor } from '../../../projects/utility/constants/constants'
import type { WorkspaceListItem } from '../../utility/models/model'
import styles from './WorkspaceTable.module.css'

dayjs.extend(relativeTime)

interface WorkspaceTableProps {
  workspaces: WorkspaceListItem[]
  onOpen: (id: string) => void
}

/** The workspace list as a table — one row per workspace, click to open. Matches
 *  the prototype's `.ws-table` (mono headers, ID pill, type chips, created-by avatar). */
export function WorkspaceTable({ workspaces, onOpen }: WorkspaceTableProps) {
  return (
    <Box className={styles.wrap ?? ''}>
      <Table.ScrollContainer minWidth={720}>
        <Table className={styles.table ?? ''} verticalSpacing={0} horizontalSpacing={0}>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Workspace ID</Table.Th>
              <Table.Th>Workspace Name</Table.Th>
              <Table.Th>Projects</Table.Th>
              <Table.Th>Project Types</Table.Th>
              <Table.Th>Created by</Table.Th>
              <Table.Th>Last updated</Table.Th>
              <Table.Th aria-label="Open" />
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {workspaces.map((w) => (
              <Table.Tr key={w.id} className={styles.row ?? ''} onClick={() => onOpen(w.id)}>
                <Table.Td>
                  <Text span className={styles.wsId ?? ''}>
                    {w.id}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Box className={styles.nameCell ?? ''}>
                    <Avatar
                      color={w.colorSeed}
                      variant="filled"
                      radius={9}
                      size={30}
                      ff="monospace"
                      fz={11}
                      fw={700}
                    >
                      {workspaceInitials(w.name)}
                    </Avatar>
                    <Text span className={styles.name ?? ''}>
                      {w.name}
                    </Text>
                  </Box>
                </Table.Td>
                <Table.Td>
                  <Text span className={styles.count ?? ''}>
                    {w.projectCount}
                  </Text>
                </Table.Td>
                <Table.Td>
                  {w.typeCounts.length ? (
                    <Box className={styles.types ?? ''}>
                      {w.typeCounts.map((t) => (
                        <Badge
                          key={t.projectType}
                          variant="light"
                          color={projectTypeColor(t.projectType)}
                          radius="sm"
                          className={styles.typeChip ?? ''}
                        >
                          {projectTypeTag(t.projectType)}
                          <Text span className={styles.typeChipN ?? ''}>
                            {t.count}
                          </Text>
                        </Badge>
                      ))}
                    </Box>
                  ) : (
                    <Text span c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  {w.createdBy ? (
                    <Group gap={8} wrap="nowrap">
                      <Avatar
                        color={memberColor(w.createdBy)}
                        variant="filled"
                        radius="xl"
                        size={22}
                        ff="monospace"
                        fz={8}
                        fw={700}
                      >
                        {workspaceInitials(w.createdBy)}
                      </Avatar>
                      <Text span className={styles.createdBy ?? ''}>
                        {w.createdBy}
                      </Text>
                    </Group>
                  ) : (
                    <Text span c="dimmed">
                      —
                    </Text>
                  )}
                </Table.Td>
                <Table.Td>
                  <Text span className={styles.upd ?? ''}>
                    {w.updatedAt ? dayjs(w.updatedAt).fromNow() : '—'}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <IconChevronRight size={16} className={styles.chevron ?? ''} />
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </Table.ScrollContainer>
    </Box>
  )
}
