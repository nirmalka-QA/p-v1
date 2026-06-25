import { NavLink } from '@mantine/core'
import { IconFolder, IconFileCode } from '@tabler/icons-react'
import type { RepoFile } from '../utility/models/model'
import styles from '../utility/styles/implementation.module.css'

interface RepoFileTreeProps {
  nodes: RepoFile[]
  selectedPath: string | null
  onSelect: (path: string) => void
}

const navClasses = { root: styles.explorerItem, label: styles.explorerLabel }

/** Recursive, read-only repository file tree (§8.4). Directories stay expanded. */
export function RepoFileTree({ nodes, selectedPath, onSelect }: RepoFileTreeProps) {
  return (
    <>
      {nodes.map((node) =>
        node.type === 'directory' ? (
          <NavLink
            key={node.path}
            label={node.name}
            classNames={navClasses}
            leftSection={<IconFolder size={15} />}
            defaultOpened
            childrenOffset={16}
          >
            {node.children && (
              <RepoFileTree nodes={node.children} selectedPath={selectedPath} onSelect={onSelect} />
            )}
          </NavLink>
        ) : (
          <NavLink
            key={node.path}
            label={node.name}
            classNames={navClasses}
            leftSection={<IconFileCode size={15} />}
            active={node.path === selectedPath}
            onClick={() => onSelect(node.path)}
          />
        ),
      )}
    </>
  )
}
