import { Table, Group, Stack, Text, Badge, Menu, ActionIcon, Tooltip } from '@mantine/core'
import {
  IconDots,
  IconPencil,
  IconCopy,
  IconTrash,
  IconLock,
} from '@tabler/icons-react'
import type { StrategyTemplate } from '../../utility/models/strategyTemplate'
import { countOutputs, relativeTime } from '../../utility/helpers/strategyTemplate'

interface StrategyTemplatesTableProps {
  templates: StrategyTemplate[]
  busy?: boolean
  onEdit: (template: StrategyTemplate) => void
  onDuplicate: (template: StrategyTemplate) => void
  onDelete: (template: StrategyTemplate) => void
}

/**
 * The strategy templates table: name + scope, phase/output counts, authorship,
 * last-updated, and a per-row actions menu. System templates show a lock + only
 * offer Duplicate; tenant templates are fully editable. Pure presentation — the
 * manager owns confirmation + mutations.
 */
export function StrategyTemplatesTable({
  templates,
  busy = false,
  onEdit,
  onDuplicate,
  onDelete,
}: StrategyTemplatesTableProps) {
  return (
    <Table.ScrollContainer minWidth={820}>
      <Table verticalSpacing="sm" highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Template</Table.Th>
            <Table.Th>Phases</Table.Th>
            <Table.Th>Outputs</Table.Th>
            <Table.Th>Created by</Table.Th>
            <Table.Th>Updated</Table.Th>
            <Table.Th w={48} />
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {templates.map((template) => {
            const isSystem = template.scope === 'system'
            return (
              <Table.Tr key={template.id}>
                <Table.Td>
                  <Stack gap={2} miw={0}>
                    <Group gap="xs" wrap="nowrap">
                      <Text size="sm" fw={600} truncate>
                        {template.name}
                      </Text>
                      {isSystem ? (
                        <Tooltip label="System template — read-only. Duplicate to customise.">
                          <Badge
                            color="gray"
                            variant="light"
                            size="sm"
                            radius="sm"
                            leftSection={<IconLock size={11} />}
                          >
                            System
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Badge color="violet" variant="light" size="sm" radius="sm">
                          Custom
                        </Badge>
                      )}
                    </Group>
                    {template.description && (
                      <Text size="xs" c="dimmed" truncate>
                        {template.description}
                      </Text>
                    )}
                  </Stack>
                </Table.Td>

                <Table.Td>
                  <Text size="sm">{template.phases.length}</Text>
                </Table.Td>

                <Table.Td>
                  <Text size="sm">{countOutputs(template)}</Text>
                </Table.Td>

                <Table.Td>
                  <Text size="sm" {...(isSystem ? { c: 'dimmed' } : {})}>
                    {template.createdBy}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Tooltip
                    label={template.updatedAt ? new Date(template.updatedAt).toLocaleString() : 'Unknown'}
                    disabled={!template.updatedAt}
                  >
                    <Text size="sm" c="dimmed">
                      {relativeTime(template.updatedAt)}
                      {template.updatedBy && template.updatedBy !== 'System' && (
                        <Text span size="xs" c="dimmed">
                          {' '}
                          · {template.updatedBy}
                        </Text>
                      )}
                    </Text>
                  </Tooltip>
                </Table.Td>

                <Table.Td>
                  <Menu position="bottom-end" withinPortal shadow="md" width={200}>
                    <Menu.Target>
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        aria-label={`Actions for ${template.name}`}
                      >
                        <IconDots size={18} />
                      </ActionIcon>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item
                        leftSection={isSystem ? <IconLock size={16} /> : <IconPencil size={16} />}
                        disabled={isSystem}
                        onClick={() => onEdit(template)}
                      >
                        {isSystem ? 'Read-only' : 'Edit'}
                      </Menu.Item>
                      <Menu.Item
                        leftSection={<IconCopy size={16} />}
                        disabled={busy}
                        onClick={() => onDuplicate(template)}
                      >
                        Duplicate
                      </Menu.Item>
                      <Menu.Divider />
                      <Menu.Item
                        leftSection={<IconTrash size={16} />}
                        color="red"
                        disabled={isSystem}
                        onClick={() => onDelete(template)}
                      >
                        Delete
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
    </Table.ScrollContainer>
  )
}
