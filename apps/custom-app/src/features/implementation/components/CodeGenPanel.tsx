import { useState, useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import { Group, Stack, Text, Button, Paper, Skeleton, Anchor, Modal, Tooltip, Menu, ActionIcon, List, Box } from '@mantine/core'
import { IconCircleCheck, IconAlertTriangle, IconRefresh, IconBrandGithub, IconDownload, IconGitPullRequest, IconDots, IconHelp } from '@tabler/icons-react'
import { AIPlaceholder } from '@wispr/ui'
import { EmptyState } from '@wispr/ui'
import { AIProgressSteps } from '../../../components/ui/AIProgressSteps'
import { CodeEditor } from './CodeEditor'
import { ImplementationPlanPanel } from './ImplementationPlanPanel'
import { CodeChatPanel, type ChatMessage } from './CodeChatPanel'
import {
  useGetGeneratedCodeQuery,
  useStartGenerateCodeMutation,
  useLazyGetCodeGenerationStatusQuery,
  useStartRepoCommitMutation,
  useIterateRepoCommitMutation,
  useLazyGetRepoCommitStatusQuery,
  useOpenPrMutation,
  usePlanImplementationMutation,
  useGetImplementationPlanQuery,
  useApproveImplementationPlanMutation,
  useGetStoryRepoCommitQuery,
  useGetSetupStateQuery,
} from '../utility/services/implementationApi'
import { useJobProgress } from '../utility/hooks/useJobProgress'
import { downloadFilesAsZip } from '../utility/helpers/download'
import { downloadRunnableProject } from '../utility/helpers/runnableProject'
import type { Story, AnalysisStep, CodeGenStep, CodeScope, BuildReport } from '../utility/models/model'
import styles from '../utility/styles/implementation.module.css'

interface CodeGenPanelProps {
  projectId: string
  story: Story
  /** Which side of the stack this page generates (frontend | backend | fullstack). */
  scope: CodeScope
  /** Per-area commit preference (owned by Workbench): when true, open the PR automatically after a push. */
  autoCommit: boolean
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** Maps backend progress steps to the AIProgressSteps shape, deriving real elapsed seconds. */
function toAnalysisSteps(steps: CodeGenStep[]): AnalysisStep[] {
  return steps.map((s) => {
    let estimatedSeconds: number | undefined
    if (s.startedAt && s.endedAt) {
      const ms = new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime()
      if (ms >= 0) estimatedSeconds = Math.max(0.1, Math.round(ms / 100) / 10)
    }
    return { id: s.key, label: s.label, status: s.status, estimatedSeconds }
  })
}

/** Code generation for the selected story: generate, view, download, mark implemented (§8.3). */
export function CodeGenPanel({ projectId, story, scope, autoCommit }: CodeGenPanelProps) {
  const { data: code, isLoading, isError, refetch } = useGetGeneratedCodeQuery({ projectId, storyId: story.id, scope })
  const [startGenerateCode] = useStartGenerateCodeMutation()
  const [fetchGenStatus] = useLazyGetCodeGenerationStatusQuery()
  const [startRepoCommit] = useStartRepoCommitMutation()
  const [iterateRepoCommit] = useIterateRepoCommitMutation()
  const [fetchRepoStatus] = useLazyGetRepoCommitStatusQuery()
  const [openPr, { isLoading: openingPr }] = useOpenPrMutation()
  const [planImplementation, { isLoading: planning }] = usePlanImplementationMutation()
  const [approveImplementationPlan] = useApproveImplementationPlanMutation()
  const { data: plan } = useGetImplementationPlanQuery({ projectId, storyId: story.id, scope })
  const planApproved = !!plan && ['approved', 'implementing', 'pushed', 'pr_open'].includes(plan.status)
  const [helpOpen, setHelpOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])

  // Progress lives in the store (keyed per story+scope) so it survives navigation.
  const job = useJobProgress(`${projectId}:${story.id}:${scope}`)
  const [prUrl, setPrUrl] = useState<string | null>(null)
  // The pushed branch awaiting a (manual) PR — ADR-0027. Set after a successful push.
  const [pushedBranch, setPushedBranch] = useState<string | null>(null)
  const [buildReport, setBuildReport] = useState<BuildReport | null>(null)

  // Persisted last repo generation (survives refresh) — seeds the PR link + build report.
  const { data: lastCommit } = useGetStoryRepoCommitQuery({ projectId, storyId: story.id, scope })
  // Scaffold-first guardrail (ADR-0025): repo code-gen is gated until the project is scaffolded.
  const { data: setup } = useGetSetupStateQuery(projectId)
  const scaffolded = setup?.scaffoldStatus === 'ready'
  // Dependency start-gate (ADR-0026): a story cannot generate into the repo until every
  // story it depends on is done. The server enforces this too (409 blocked); the UI mirrors it.
  const depsBlocked = (story.blockedBy?.length ?? 0) > 0
  const repoReady = scaffolded && !depsBlocked
  const repoBlockReason = !scaffolded
    ? 'Scaffold the project in Setup first'
    : depsBlocked
      ? `Blocked by ${(story.blockedBy ?? []).join(', ')} — finish those first`
      : ''
  useEffect(() => {
    if (lastCommit) {
      setPrUrl(lastCommit.prUrl ?? null)
      setBuildReport(lastCommit.build ?? null)
      setPushedBranch(lastCommit.branch ?? null)
    }
  }, [lastCommit])

  const implemented = story.status === 'done'

  // Real-repo path (ADR-0022 P2): generate into the connected GitHub repo and open a PR.
  // Poll a started repo job to completion, streaming step progress; returns the final pr/build.
  async function pollRepoJob(started: { jobId: string; status: string; steps: CodeGenStep[]; prUrl?: string | null; branch?: string | null; build?: BuildReport | null }) {
    job.push(toAnalysisSteps(started.steps))
    let status = started.status
    let jobId = started.jobId
    let pr = started.prUrl ?? null
    let branch = started.branch ?? null
    let build = started.build ?? null
    while (status === 'running') {
      await sleep(2000)
      const next = await fetchRepoStatus({ projectId, jobId }).unwrap()
      job.push(toAnalysisSteps(next.steps))
      status = next.status
      jobId = next.jobId
      branch = next.branch ?? branch
      pr = next.prUrl ?? pr
      build = next.build ?? build
    }
    return { status, pr, branch, build }
  }

  // Surfaces the backend's blocked/failed message (scaffold / dependency / not-merged guards) from a
  // 409 ResponseDto, falling back to a generic message.
  function serverMessage(err: unknown, fallback: string): string {
    const data = (err as { data?: { message?: string } })?.data
    return data?.message?.trim() || fallback
  }

  async function runRepoCommit() {
    job.begin('repo')
    setPrUrl(null)
    setBuildReport(null)
    try {
      const started = await startRepoCommit({ projectId, storyId: story.id, scope }).unwrap()
      const { status, pr, branch, build } = await pollRepoJob(started)
      if (status === 'completed') {
        setPrUrl(pr)
        setPushedBranch(branch)
        setBuildReport(build)
        // Auto-commit: open the PR right away; otherwise leave it for manual review.
        if (autoCommit && !pr && branch) {
          notifications.show({ color: 'teal', title: 'Pushed to GitHub', message: `Pushed branch ${branch}. Opening a pull request…` })
          await runOpenPr()
        } else {
          notifications.show({ color: 'teal', title: 'Pushed to GitHub', message: branch ? `Pushed branch ${branch}. Open the pull request when ready.` : 'Pushed the generated code.' })
        }
      } else {
        notifications.show({ color: 'red', title: 'Push failed', message: 'Connect a GitHub repo with a write token, then retry.' })
      }
    } catch (err) {
      // Blocked guards (scaffold / dependencies not done / dependency code not merged) arrive as 409.
      notifications.show({ color: 'red', title: 'Cannot start implementation', message: serverMessage(err, 'Connect a GitHub repo with a write token, then retry.') })
    } finally {
      job.end()
    }
  }

  // Shared iterate core (ADR-0022 P4 / ADR-0027): modify the pushed branch with instructions.
  async function iterateCore(text: string): Promise<{ ok: boolean; note: string }> {
    job.begin('iterate')
    try {
      const started = await iterateRepoCommit({ projectId, storyId: story.id, scope, instructions: text }).unwrap()
      const { status, pr, branch, build } = await pollRepoJob(started)
      if (status === 'completed') {
        if (pr) setPrUrl(pr) // iterate doesn't open PRs (ADR-0027); keep any existing PR link
        if (branch) setPushedBranch(branch)
        setBuildReport(build)
        return { ok: true, note: build ? `Done — branch updated. Build: ${build.summary}` : 'Done — branch updated.' }
      }
      return { ok: false, note: 'Iteration failed. Please try again.' }
    } catch (err) {
      return { ok: false, note: serverMessage(err, 'Iteration failed.') }
    } finally {
      job.end()
    }
  }

  // Post-generation chat (ADR-0027/0028): a change/fix request. After a repo push it iterates the
  // branch; before a push it re-generates the in-WISPR preview with the instructions.
  async function sendChat(text: string) {
    setChatMessages((prev) => [...prev, { role: 'user', content: text }])
    const note = pushedBranch ? (await iterateCore(text)).note : await previewFix(text)
    setChatMessages((prev) => [...prev, { role: 'assistant', content: note }])
  }

  // Re-generate the in-WISPR preview applying a fix/refine prompt (ADR-0028). Returns a chat note.
  async function previewFix(text: string): Promise<string> {
    job.begin('generate')
    try {
      const started = await startGenerateCode({ projectId, storyId: story.id, scope, instructions: text }).unwrap()
      job.push(toAnalysisSteps(started.steps))
      let status = started.status
      let jobId = started.jobId
      while (status === 'running') {
        await sleep(1500)
        const next = await fetchGenStatus({ projectId, jobId }).unwrap()
        job.push(toAnalysisSteps(next.steps))
        status = next.status
        jobId = next.jobId
      }
      if (status === 'completed') {
        await refetch()
        return 'Done — re-generated the preview with your changes.'
      }
      return 'Generation failed. Please try again.'
    } catch (err) {
      return serverMessage(err, 'Generation failed.')
    } finally {
      job.end()
    }
  }

  // ADR-0027: open the PR for the pushed branch into develop — manual, from WISPR.
  async function runOpenPr() {
    try {
      const result = await openPr({ projectId, storyId: story.id, scope }).unwrap()
      if (result.status === 'completed' && result.prUrl) {
        setPrUrl(result.prUrl)
        notifications.show({ color: 'teal', title: 'Pull request opened', message: 'Opened a PR into develop.' })
      } else {
        notifications.show({ color: 'red', title: 'Could not open PR', message: result.message ?? 'Please try again.' })
      }
    } catch (err) {
      notifications.show({ color: 'red', title: 'Could not open PR', message: serverMessage(err, 'Please try again.') })
    }
  }

  // ADR-0027: produce the AI implementation plan for review before generation.
  async function runPlan() {
    try {
      await planImplementation({ projectId, storyId: story.id, scope }).unwrap()
      notifications.show({ color: 'violet', title: 'Plan ready', message: 'Review the implementation plan, then approve to build.' })
    } catch (err) {
      notifications.show({ color: 'red', title: 'Could not plan', message: serverMessage(err, 'Please try again.') })
    }
  }

  // Approve the plan (opens the gate), then start generation.
  async function approveAndImplement() {
    try {
      await approveImplementationPlan({ projectId, storyId: story.id, scope }).unwrap()
    } catch (err) {
      notifications.show({ color: 'red', title: 'Could not approve plan', message: serverMessage(err, 'Please try again.') })
      return
    }
    await runRepoCommit()
  }

  // Start a progressive build for this story, then poll real per-step progress from the backend
  // (mirrors Discovery / Planning / Features generation; ADR-0020).
  async function runGenerate() {
    job.begin('generate')
    try {
      const started = await startGenerateCode({ projectId, storyId: story.id, scope }).unwrap()
      job.push(toAnalysisSteps(started.steps))

      let status = started.status
      let jobId = started.jobId
      while (status === 'running') {
        await sleep(1500)
        const next = await fetchGenStatus({ projectId, jobId }).unwrap()
        job.push(toAnalysisSteps(next.steps))
        status = next.status
        jobId = next.jobId
      }

      if (status === 'completed') {
        await refetch()
        notifications.show({
          color: 'teal',
          title: 'Code generated',
          message: `Files generated for ${story.id} from the story and your tech stack.`,
        })
      } else {
        notifications.show({ color: 'red', title: 'Code generation failed', message: 'Please try again.' })
      }
    } catch {
      notifications.show({ color: 'red', title: 'Code generation failed', message: 'Please try again.' })
    } finally {
      job.end()
    }
  }

  function handleDownloadAll() {
    if (code) downloadFilesAsZip(`${story.id}-code`, code.files)
  }

  function handleDownloadRunnable() {
    if (code) downloadRunnableProject(`${story.id}-${scope}`, code.files)
  }

  // ── Action area, regrouped (presentation only) ──
  // A read-only PR link, one state-aware primary button, a Repository menu for
  // the rest of the repo/PR actions, and an overflow menu for utilities.
  const viewPrLink = prUrl ? (
    <Anchor href={prUrl} target="_blank" size="sm" fw={500}>
      <Group gap={4} wrap="nowrap">
        <IconBrandGithub size={14} /> View pull request
      </Group>
    </Anchor>
  ) : null

  // State-aware code action: Commit to repo (gated on an approved plan, done from the
  // story bar) → Open Pull Request. Independent of the story's Implemented status —
  // marking the story done must not hide the repo actions. Plan & Mark live in the story bar.
  const primaryButton = prUrl ? null : pushedBranch ? (
    <Button variant="filled" color="teal" leftSection={<IconGitPullRequest size={15} />} onClick={() => void runOpenPr()} loading={openingPr}>
      Open Pull Request
    </Button>
  ) : (
    <Tooltip
      label={!repoReady ? repoBlockReason : 'Plan & approve the implementation first (in the story bar)'}
      disabled={repoReady && planApproved}
      withArrow
    >
      <Button
        variant="outline"
         size="compact-sm"
        leftSection={<IconBrandGithub size={15} />}
        onClick={() => void runRepoCommit()}
        loading={job.busy}
        disabled={!repoReady || !planApproved}
        data-disabled={!repoReady || !planApproved || undefined}
      >
        Commit to repo
      </Button>
    </Tooltip>
  )

  // Utilities — Download / Regenerate / Help (and more in future).
  const utilityMenu = (
    <Menu position="bottom-end" withinPortal>
      <Menu.Target>
        <ActionIcon variant="default" size="lg" aria-label="More actions">
          <IconDots size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconRefresh size={14} />} onClick={runGenerate}>
          Regenerate
        </Menu.Item>
        <Menu.Item leftSection={<IconDownload size={14} />} onClick={handleDownloadRunnable}>
          Download runnable project
        </Menu.Item>
        <Menu.Item leftSection={<IconHelp size={14} />} onClick={() => setHelpOpen(true)}>
          Help
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  )

  if (isLoading) {
    return (
      <Stack gap="sm">
        <Skeleton height={24} width={180} radius="sm" />
        <Skeleton height={300} radius="md" />
      </Stack>
    )
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load generated code"
        description="Something went wrong fetching the code for this story."
        action={{ label: 'Retry', onClick: () => void refetch() }}
      />
    )
  }

  if (job.busy) {
    const repoBusy = job.kind === 'repo' || job.kind === 'iterate'
    return (
      <Paper withBorder radius="md" p="lg" maw={560}>
        <Text fw={600} mb={4}>
          {repoBusy ? 'Generating into the repository…' : 'Generating code…'}
        </Text>
        <Text size="sm" c="dimmed" mb="lg">
          {repoBusy
            ? 'Cloning the repo, writing files, committing and opening a pull request.'
            : 'Using the story, acceptance criteria, Knowledge Base, and tech stack.'}
        </Text>
        <AIProgressSteps steps={job.steps} />
      </Paper>
    )
  }

  // No code yet → AI preview generation is the primary action; the repo path follows the same
  // plan → approve → generate → open-PR gate (ADR-0027) as the code-present view.
  if (!code) {
    return (
      <Stack gap="sm" maw={620}>
        <AIPlaceholder
          action="Generate Code"
          description={`Generate ${scope} files for ${story.id} using the acceptance criteria, Knowledge Base, and configured tech stack.`}
          onTrigger={runGenerate}
        />

        {plan && !planApproved && (
          <ImplementationPlanPanel
            plan={plan}
            onApproveAndImplement={() => void approveAndImplement()}
            onReplan={() => void runPlan()}
            busy={job.busy}
            planning={planning}
          />
        )}

        <Group gap="sm" wrap="wrap">
          {viewPrLink}
          {primaryButton}
        </Group>

        {/* After a push (no in-WISPR preview), the change/fix chat iterates the branch (ADR-0028). */}
        {pushedBranch && (
          <CodeChatPanel messages={chatMessages} onSend={(t) => void sendChat(t)} busy={job.busy} />
        )}
      </Stack>
    )
  }

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap" gap="sm">
        <Group gap="xs">
          <Text size="sm" c="dimmed">
            {code.files.length} file{code.files.length === 1 ? '' : 's'} generated
          </Text>
          {implemented && (
            <Group gap={4} c="teal">
              <IconCircleCheck size={15} />
              <Text size="sm" fw={500}>
                Implemented
              </Text>
            </Group>
          )}
        </Group>
        <Group gap="sm" wrap="nowrap">
          {viewPrLink}
          {primaryButton}
          {utilityMenu}
        </Group>
      </Group>

      {/* Approval gate (ADR-0027): show the plan for review until it's approved. */}
      {plan && !planApproved && (
        <ImplementationPlanPanel
          plan={plan}
          onApproveAndImplement={() => void approveAndImplement()}
          onReplan={() => void runPlan()}
          busy={job.busy}
          planning={planning}
        />
      )}

      {buildReport && buildReport.status !== 'skipped' && (
        <Paper withBorder radius="md" p="sm" bg={buildReport.status === 'passed' ? 'var(--mantine-color-teal-light)' : 'var(--mantine-color-red-light)'}>
          <Group gap="xs" mb={buildReport.steps.length ? 6 : 0}>
            {buildReport.status === 'passed' ? <IconCircleCheck size={15} /> : <IconAlertTriangle size={15} />}
            <Text size="sm" fw={600}>
              Build &amp; test: {buildReport.summary}
            </Text>
          </Group>
          {buildReport.steps.map((s) => (
            <Box key={s.name} mb={!s.ok && s.output ? 6 : 0}>
              <Text size="xs" c="dimmed">
                {s.ok ? '✅' : '❌'} {s.name}
              </Text>
              {/* Surface the error output for failed steps so the user can understand the issue. */}
              {!s.ok && s.output && (
                <Box
                  component="pre"
                  style={{
                    margin: '4px 0 0',
                    padding: 8,
                    maxHeight: 220,
                    overflow: 'auto',
                    background: 'var(--mantine-color-dark-8)',
                    color: 'var(--mantine-color-gray-3)',
                    borderRadius: 6,
                    fontSize: 11,
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {s.output}
                </Box>
              )}
            </Box>
          ))}
        </Paper>
      )}

      {/* One surface: change requests on the left, the live code on the right. Each request
          re-generates the preview (or iterates the branch after a push) — scoped to this story. */}
      <Paper withBorder radius="md" className={styles.workbench}>
        <Box className={styles.workbenchRow}>
          <Box className={styles.workbenchChat}>
            <CodeChatPanel embedded messages={chatMessages} onSend={(t) => void sendChat(t)} busy={job.busy} />
          </Box>
          <Box className={styles.workbenchCode}>
            <CodeEditor embedded files={code.files} onDownloadAll={handleDownloadAll} />
          </Box>
        </Box>
      </Paper>

      <Modal opened={helpOpen} onClose={() => setHelpOpen(false)} title="Working in the develop workspace" centered>
        <List size="sm" spacing="sm">
          <List.Item>Use the story bar above to <b>Plan</b>, open <b>Review</b> (click the story name), or <b>Mark as Implemented</b>.</List.Item>
          <List.Item>Generate a preview here, then <b>Commit to repo</b> once the plan is approved, and <b>Open Pull Request</b> when ready.</List.Item>
          <List.Item>Use the <b>Change requests</b> chat on the left to refine the code — each request updates this story.</List.Item>
          <List.Item>Toggle <b>Auto-commit</b> (gear, top-right) to open the PR automatically after a push.</List.Item>
        </List>
      </Modal>
    </Stack>
  )
}
