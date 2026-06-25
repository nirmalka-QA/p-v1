import { useState } from 'react'
import type { ReactNode } from 'react'
import { Menu, ActionIcon } from '@mantine/core'
import { IconDots } from '@tabler/icons-react'

/** One option in an overflow (⋯) menu. */
export interface MenuAction {
  label: string
  icon: ReactNode
  onClick: () => void
  color?: string
  disabled?: boolean
  /** Require a second click (inline "Click again to …") before firing — no dialog. */
  confirm?: boolean
  /** The armed label for a confirm action (defaults to "Click again to delete"). */
  confirmLabel?: string
}

interface ActionMenuProps {
  actions: MenuAction[]
  ariaLabel?: string
}

/**
 * A shared "⋯" overflow menu. Any action marked `confirm` uses an inline two-click
 * confirm — the first click arms it (label swaps, menu stays open), the second fires;
 * dismissing the menu resets it. No confirmation dialog.
 */
export function ActionMenu({ actions, ariaLabel = 'More actions' }: ActionMenuProps) {
  const [armed, setArmed] = useState<string | null>(null)
  if (actions.length === 0) return null

  return (
    <Menu position="bottom-end" withinPortal onClose={() => setArmed(null)}>
      <Menu.Target>
        <ActionIcon variant="subtle" color="gray" aria-label={ariaLabel}>
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        {actions.map((item) => {
          if (item.confirm) {
            const isArmed = armed === item.label
            return (
              <Menu.Item
                key={item.label}
                leftSection={item.icon}
                color={item.color ?? 'red'}
                disabled={item.disabled ?? false}
                closeMenuOnClick={isArmed}
                onClick={() => {
                  if (isArmed) {
                    item.onClick()
                    setArmed(null)
                  } else {
                    setArmed(item.label)
                  }
                }}
              >
                {isArmed ? (item.confirmLabel ?? 'Click again to delete') : item.label}
              </Menu.Item>
            )
          }
          return (
            <Menu.Item
              key={item.label}
              leftSection={item.icon}
              onClick={item.onClick}
              disabled={item.disabled ?? false}
              {...(item.color ? { color: item.color } : {})}
            >
              {item.label}
            </Menu.Item>
          )
        })}
      </Menu.Dropdown>
    </Menu>
  )
}
