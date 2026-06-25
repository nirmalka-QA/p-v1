import { Paper, Stack, Group, Text, Badge, Button, List, Divider, ThemeIcon } from '@mantine/core'
import { IconSparkles, IconCircleCheck, IconFileCode, IconRecycle, IconClockPause, IconPlayerPlay } from '@tabler/icons-react'
import type { ImplementationPlan } from '../utility/models/model'

interface ImplementationPlanPanelProps {
  plan: ImplementationPlan
  /** Approve the plan and start implementation. */
  onApproveAndImplement: () => void
  /** Re-generate the plan. */
  onReplan: () => void
  busy: boolean
  planning: boolean
}

/**
 * The AI implementation plan (ADR-0027), shown for review before any code is generated. The user
 * approves it (which starts generation) or asks for a fresh plan. Once a plan is approved the gate
 * is open and generation proceeds.
 */
export function ImplementationPlanPanel({ plan, onApproveAndImplement, onReplan, busy, planning }: ImplementationPlanPanelProps) {
  const approved = plan.status === 'approved' || plan.status === 'implementing' || plan.status === 'pushed' || plan.status === 'pr_open'

  return (
    <Paper withBorder radius="md" p="md" bg="var(--cl-bg-elev)">
      <Group justify="space-between" mb="sm" wrap="wrap">
        <Group gap="xs">
          <ThemeIcon size={24} radius="xl" color="violet" variant="light">
            <IconSparkles size={14} />
          </ThemeIcon>
          <Text fw={600}>Implementation plan</Text>
          {approved ? (
            <Badge color="teal" variant="light" radius="sm" leftSection={<IconCircleCheck size={11} />}>
              Approved
            </Badge>
          ) : (
            <Badge color="violet" variant="light" radius="sm">
              Awaiting approval
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <Button variant="subtle" color="gray" size="compact-sm" leftSection={<IconSparkles size={13} />} onClick={onReplan} loading={planning}>
            Re-plan
          </Button>
          {!approved && (
            <Button color="teal" size="compact-sm" leftSection={<IconPlayerPlay size={13} />} onClick={onApproveAndImplement} loading={busy}>
              Approve &amp; implement
            </Button>
          )}
        </Group>
      </Group>

      {plan.summary && (
        <Text size="sm" c="dimmed" lh={1.6} mb="sm">
          {plan.summary}
        </Text>
      )}

      <Stack gap="sm">
        {plan.willBuild.length > 0 && (
          <PlanList icon={<IconPlayerPlay size={14} />} color="indigo" title="Will build" items={plan.willBuild} />
        )}
        {plan.reuse.length > 0 && (
          <PlanList icon={<IconRecycle size={14} />} color="teal" title="Reuses existing" items={plan.reuse} />
        )}
        {plan.filesToTouch.length > 0 && (
          <PlanList icon={<IconFileCode size={14} />} color="gray" title="Files / areas to touch" items={plan.filesToTouch} mono />
        )}
        {plan.deferred.length > 0 && (
          <>
            <Divider />
            <Group gap={6} mb={2}>
              <IconClockPause size={14} />
              <Text size="xs" fw={600} tt="uppercase" c="dimmed" ff="monospace">
                Deferred to future stories
              </Text>
            </Group>
            <Stack gap={6}>
              {plan.deferred.map((d, i) => (
                <Text key={i} size="sm" c="dimmed" lh={1.5}>
                  <Text span fw={500}>
                    {d.title}
                  </Text>
                  {d.reason ? ` — ${d.reason}` : ''}
                  {d.dependsOn.length > 0 ? ` (depends on ${d.dependsOn.join(', ')})` : ''}
                </Text>
              ))}
            </Stack>
          </>
        )}
      </Stack>
    </Paper>
  )
}

function PlanList({ icon, color, title, items, mono }: { icon: React.ReactNode; color: string; title: string; items: string[]; mono?: boolean }) {
  return (
    <div>
      <Group gap={6} mb={4}>
        <ThemeIcon size={18} radius="sm" color={color} variant="light">
          {icon}
        </ThemeIcon>
        <Text size="xs" fw={600} tt="uppercase" c="dimmed" ff="monospace">
          {title}
        </Text>
      </Group>
      <List size="sm" spacing={2} c="dimmed" withPadding>
        {items.map((it, i) => (
          <List.Item key={i}>
            <Text size="sm" ff={mono ? 'monospace' : undefined} c="dimmed">
              {it}
            </Text>
          </List.Item>
        ))}
      </List>
    </div>
  )
}
