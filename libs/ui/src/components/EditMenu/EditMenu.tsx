import { Menu, Button } from '@mantine/core'
import { IconPencil, IconSparkles, IconChevronDown } from '@tabler/icons-react'

interface EditMenuProps {
  onManual: () => void
  onAI: () => void
  label?: string
  buttonVariant?: string
}

/**
 * "Edit ▾" control offering two paths: edit manually (opens a form) or edit
 * with AI (opens the AI enhancement dialog). Shared by every place that edits
 * AI-generated content.
 */
export function EditMenu({ onManual, onAI, label = 'Edit', buttonVariant = 'default' }: EditMenuProps) {
  return (
    <Menu position="bottom-end" withinPortal shadow="md">
      <Menu.Target>
        <Button
          variant={buttonVariant}
          leftSection={<IconPencil size={14} />}
          rightSection={<IconChevronDown size={14} />}
        >
          {label}
        </Button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconPencil size={14} />} onClick={onManual}>
          Edit manually
        </Menu.Item>
        <Menu.Item leftSection={<IconSparkles size={14} />} color="violet" onClick={onAI}>
          Edit with AI
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )
}
