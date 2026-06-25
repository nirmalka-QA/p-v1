import { Box, ScrollArea, Paper, Text } from '@mantine/core'
import type { DepGraphNode } from './dependencyGraph.helpers'

interface DependencyGraphProps {
  nodes: DepGraphNode[]
  /** Called with the clicked node's id. */
  onSelect: (id: string) => void
  /** Shown (dimmed) instead of an empty canvas when there are no nodes. */
  emptyHint?: string
}

const BOX_W = 108
const BOX_H = 34
const COL_STRIDE = 168
const ROW_STRIDE = 56
const PAD = 16

/**
 * Lightweight dependency graph: nodes laid out in dependency depth columns
 * (no-dependency nodes on the left, dependents flowing right) with arrows from
 * each dependency to the nodes that depend on it. Click a node to open it.
 *
 * Generic over its nodes ({@link DepGraphNode}), so it renders both story and
 * feature dependencies, and both the full set and a focused neighbourhood. A
 * `focal` node is emphasised so focused views read clearly.
 */
export function DependencyGraph({ nodes, onSelect, emptyHint }: DependencyGraphProps) {
  if (nodes.length === 0) {
    return (
      <Paper withBorder radius="md" p="md" mb="md">
        <Text size="sm" c="dimmed">
          {emptyHint ?? 'No dependencies to show.'}
        </Text>
      </Paper>
    )
  }

  const ids = new Set(nodes.map((n) => n.id))
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // Dependency depth (longest chain of in-set dependencies), cycle-safe.
  const depth = new Map<string, number>()
  const computing = new Set<string>()
  function depthOf(n: DepGraphNode): number {
    if (depth.has(n.id)) return depth.get(n.id)!
    if (computing.has(n.id)) return 0
    computing.add(n.id)
    const deps = n.dependencies.filter((d) => ids.has(d))
    const d = deps.length === 0 ? 0 : 1 + Math.max(...deps.map((id) => depthOf(byId.get(id)!)))
    computing.delete(n.id)
    depth.set(n.id, d)
    return d
  }
  nodes.forEach(depthOf)

  // Assign a row within each depth column, in order.
  const rowByCol = new Map<number, number>()
  const pos = new Map<string, { x: number; y: number }>()
  for (const n of nodes) {
    const col = depth.get(n.id) ?? 0
    const row = rowByCol.get(col) ?? 0
    rowByCol.set(col, row + 1)
    pos.set(n.id, { x: PAD + col * COL_STRIDE, y: PAD + row * ROW_STRIDE })
  }

  const cols = Math.max(...nodes.map((n) => (depth.get(n.id) ?? 0) + 1), 1)
  const maxRows = Math.max(...rowByCol.values(), 1)
  const width = PAD * 2 + cols * COL_STRIDE
  const height = PAD * 2 + maxRows * ROW_STRIDE

  return (
    <Paper withBorder radius="md" p="xs" mb="md">
      <ScrollArea type="auto">
        <Box w={width} miw="100%">
          <svg width={width} height={height} role="img" aria-label="Dependency graph">
            <defs>
              <marker id="dep-arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto">
                <path d="M0,0 L7,3 L0,6 Z" fill="var(--mantine-color-gray-5)" />
              </marker>
            </defs>

            {nodes.map((n) =>
              n.dependencies
                .filter((d) => ids.has(d))
                .map((depId) => {
                  const from = pos.get(depId)!
                  const to = pos.get(n.id)!
                  return (
                    <line
                      key={`${depId}-${n.id}`}
                      x1={from.x + BOX_W}
                      y1={from.y + BOX_H / 2}
                      x2={to.x}
                      y2={to.y + BOX_H / 2}
                      stroke="var(--mantine-color-gray-4)"
                      strokeWidth={1.5}
                      markerEnd="url(#dep-arrow)"
                    />
                  )
                }),
            )}

            {nodes.map((n) => {
              const p = pos.get(n.id)!
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`} cursor="pointer" onClick={() => onSelect(n.id)}>
                  <rect
                    width={BOX_W}
                    height={BOX_H}
                    rx={6}
                    fill={n.focal ? 'var(--mantine-color-indigo-light)' : 'var(--mantine-color-body)'}
                    stroke={n.focal ? 'var(--mantine-color-indigo-6)' : n.stroke}
                    strokeWidth={n.focal ? 2.5 : 1.5}
                  />
                  <text
                    x={BOX_W / 2}
                    y={BOX_H / 2 + 4}
                    textAnchor="middle"
                    fontSize="11"
                    fontFamily="monospace"
                    fontWeight={n.focal ? 700 : 400}
                    fill="var(--mantine-color-text)"
                  >
                    {n.label}
                  </text>
                </g>
              )
            })}
          </svg>
        </Box>
      </ScrollArea>
    </Paper>
  )
}
