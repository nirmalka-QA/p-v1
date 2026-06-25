import { Group, Select, TextInput } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { STORY_STATUS_OPTIONS, FILTER_ALL } from '../utility/constants/constants'
import type { StoryFilters as Filters } from '../utility/helpers/helpers'

interface StoryFiltersProps {
  filters: Filters
  onChange: (filters: Filters) => void
  /** Assignees present on the current feature's stories. */
  assignees: string[]
}

/** Filter bar for the story list — status, assignee, and a title search (§7.5). */
export function StoryFilters({ filters, onChange, assignees }: StoryFiltersProps) {
  return (
    <Group gap="sm" wrap="wrap">
      <TextInput
        size="xs"
        w={200}
        placeholder="Search stories…"
        leftSection={<IconSearch size={13} />}
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.currentTarget.value })}
      />
      <Select
        size="xs"
        w={160}
        aria-label="Filter by status"
        data={[{ value: FILTER_ALL, label: 'All statuses' }, ...STORY_STATUS_OPTIONS]}
        value={filters.status}
        onChange={(v) => onChange({ ...filters, status: v ?? FILTER_ALL })}
        allowDeselect={false}
      />
      <Select
        size="xs"
        w={160}
        aria-label="Filter by assignee"
        data={[
          { value: FILTER_ALL, label: 'All assignees' },
          ...assignees.map((a) => ({ value: a, label: a })),
        ]}
        value={filters.assignee}
        onChange={(v) => onChange({ ...filters, assignee: v ?? FILTER_ALL })}
        allowDeselect={false}
      />
    </Group>
  )
}
