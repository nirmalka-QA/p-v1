import { useState } from 'react'
import {
  Card,
  Group,
  Text,
  Badge,
  Button,
  ActionIcon,
  Menu,
  UnstyledButton,
  Collapse,
  Stack,
  List,
  Tooltip,
} from '@mantine/core'
import {
  IconPencil,
  IconTrash,
  IconDotsVertical,
  IconChevronRight,
  IconChevronDown,
  IconSparkles,
} from '@tabler/icons-react'
import { StatusBadge } from '../../../components/ui/StatusBadge'
import {
  TEST_TYPE_LABEL,
  TEST_TYPE_COLOR,
  TEST_STATUS_OPTIONS,
} from '../utility/constants/constants'
import type { TestCase, TestStatus } from '../utility/models/model'
import styles from '../utility/styles/test.module.css'

interface TestCaseRowProps {
  testCase: TestCase
  /** Whether results can be recorded — only once the story is implemented/deployed (ADR-0028). */
  canExecute: boolean
  onEdit: (testCase: TestCase) => void
  onDelete: (testCase: TestCase) => void
  onSetStatus: (testCase: TestCase, status: TestStatus) => void
}

const EXEC_HINT = 'Available once the story is implemented'

/**
 * Single test-case row: type, title, and status with an expandable body holding
 * the numbered steps and expected result. Pass / Fail are one-click; the full
 * status set (incl. back to Pending) and edit / delete live in the row menu.
 */
export function TestCaseRow({ testCase, canExecute, onEdit, onDelete, onSetStatus }: TestCaseRowProps) {
  const [open, setOpen] = useState(false)

  return (
    <Card withBorder radius="md" padding="sm" className={styles.testCard}>
      <Group justify="space-between" wrap="nowrap" gap="sm">
        <Group gap="sm" wrap="nowrap" flex={1} miw={0}>
          <ActionIcon variant="subtle" color="gray" onClick={() => setOpen((v) => !v)} aria-label="Toggle details">
            {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          </ActionIcon>
          <Text size="xs" ff="monospace" c="dimmed">
            {testCase.id}
          </Text>
          <Badge size="xs" color={TEST_TYPE_COLOR[testCase.type]} variant="light" radius="sm">
            {TEST_TYPE_LABEL[testCase.type]}
          </Badge>
          <UnstyledButton className={styles.testTitleBtn} onClick={() => setOpen((v) => !v)} flex={1} miw={0}>
            <Text fw={600} size="sm" truncate>
              {testCase.title}
            </Text>
          </UnstyledButton>
          {testCase.fromImplementation && (
            <Badge
              size="xs"
              color="violet"
              variant="light"
              radius="sm"
              leftSection={<IconSparkles size={9} />}
              title="Unit test stub generated during Implementation"
            >
              From Implementation
            </Badge>
          )}
        </Group>

        <Group gap="sm" wrap="nowrap">
          <StatusBadge status={testCase.status} size="sm" />
          {testCase.status !== 'pass' && (
            <Tooltip label={EXEC_HINT} disabled={canExecute} withArrow>
              <Button
                size="compact-xs"
                variant="light"
                color="teal"
                disabled={!canExecute}
                onClick={() => onSetStatus(testCase, 'pass')}
              >
                Pass
              </Button>
            </Tooltip>
          )}
          {testCase.status !== 'fail' && (
            <Tooltip label={EXEC_HINT} disabled={canExecute} withArrow>
              <Button
                size="compact-xs"
                variant="light"
                color="red"
                disabled={!canExecute}
                onClick={() => onSetStatus(testCase, 'fail')}
              >
                Fail
              </Button>
            </Tooltip>
          )}
          <Menu position="bottom-end" withinPortal shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" aria-label="Test case actions">
                <IconDotsVertical size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item leftSection={<IconPencil size={14} />} onClick={() => onEdit(testCase)}>
                Edit
              </Menu.Item>
              <Menu.Label>Set status</Menu.Label>
              {TEST_STATUS_OPTIONS.map((opt) => {
                // Pass/Fail are "execution" results — locked until the story is implemented (ADR-0028).
                const execLocked = !canExecute && (opt.value === 'pass' || opt.value === 'fail')
                return (
                  <Menu.Item
                    key={opt.value}
                    disabled={opt.value === testCase.status || execLocked}
                    onClick={() => onSetStatus(testCase, opt.value)}
                  >
                    {opt.label}
                    {execLocked ? ' — implement first' : ''}
                  </Menu.Item>
                )
              })}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={() => onDelete(testCase)}>
                Delete
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>

      <Collapse expanded={open}>
        <Stack gap="sm" mt="sm" pl={40}>
          {testCase.steps.length > 0 && (
            <Stack gap={4}>
              <Text size="xs" fw={600} c="dimmed" tt="uppercase">
                Steps
              </Text>
              <List type="ordered" size="sm" spacing={4}>
                {testCase.steps.map((step, i) => (
                  <List.Item key={i}>{step}</List.Item>
                ))}
              </List>
            </Stack>
          )}
          <Stack gap={4}>
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Expected result
            </Text>
            <Text size="sm" lh={1.6}>
              {testCase.expectedResult}
            </Text>
          </Stack>
        </Stack>
      </Collapse>
    </Card>
  )
}
