import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { notifications } from '@mantine/notifications'
import {
  Stepper,
  Stack,
  Group,
  Title,
  Text,
  Button,
  Box,
  ThemeIcon,
  Paper,
  Switch,
  Alert,
} from '@mantine/core'
import type { ComponentType } from 'react'
import {
  IconArrowRight,
  IconArrowLeft,
  IconCircleCheck,
  IconSparkles,
  IconLayoutDashboard,
  IconServer,
  IconDatabase,
  IconAlertTriangle,
} from '@tabler/icons-react'
import { AIProgressSteps } from '../../../components/ui/AIProgressSteps'
import { FrontendSetup } from './setup/FrontendSetup'
import { BackendSetup } from './setup/BackendSetup'
import { DatabaseSetup } from './setup/DatabaseSetup'
import { RepoSetup, EMPTY_REPO_DRAFT, type RepoDraft } from './setup/RepoSetup'
import { DesignSetup, EMPTY_DESIGN_DRAFT, type DesignDraft } from './setup/DesignSetup'
import { TechnicalRequirementsTab } from './design/TechnicalRequirementsTab'
import { selectionFromItems, itemsFromSelection, defaultSelection, type StackSelection } from '../utility/helpers/setup'
import { WIZARD_STEPS, STACK_CAT } from '../utility/constants/constants'
import {
  useGetTechStackQuery,
  useGetRepoQuery,
  useGetDesignAssetsQuery,
  useUpdateTechStackMutation,
  useConnectGithubRepoMutation,
  useSaveDesignAssetsMutation,
  useStartScaffoldMutation,
  useLazyGetScaffoldStatusQuery,
  implementationApi,
} from '../utility/services/implementationApi'
import type { ProjectType, AnalysisStep, CodeGenStep, TechSpecScope } from '../utility/models/model'
import type { AppDispatch } from '../../../app/store'
import { useJobProgress } from '../utility/hooks/useJobProgress'
import { ROUTES } from '@wispr/contracts'
import styles from '../utility/styles/implementation.module.css'

interface SetupWizardProps {
  projectId: string
  projectName: string
  projectType: ProjectType
  /** Skip / dismiss — hands the page back to the section views. */
  onClose: () => void
}

interface StackAreas {
  frontend: boolean
  backend: boolean
  database: boolean
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
const LAST_STEP = WIZARD_STEPS.length - 1

const STEP_HEADERS = [
  'What are you building with?',
  'Connect your repository',
  'Add your design reference',
  'Technical requirements',
]
const STEP_DESCRIPTIONS = [
  'Add the areas you need — Frontend, Backend, Database. At least one (with a framework) is required.',
  'A connected GitHub repository with a write token is required — we scaffold and push into it.',
  'Optional. Anything you add here is folded into the technical specification below.',
  'Auto-drafted from your stack, Knowledge Base and design. Review and edit — this is the spec code generation follows.',
]

/** Blanks out the areas that aren't included so they aren't persisted. */
function applyAreas(stack: StackSelection, areas: StackAreas): StackSelection {
  return {
    feFramework: areas.frontend ? stack.feFramework : '',
    feLanguage: areas.frontend ? stack.feLanguage : '',
    uiLibrary: areas.frontend ? stack.uiLibrary : '',
    stateManagement: areas.frontend ? stack.stateManagement : '',
    beFramework: areas.backend ? stack.beFramework : '',
    beLanguage: areas.backend ? stack.beLanguage : '',
    orm: areas.backend ? stack.orm : '',
    database: areas.database ? stack.database : '',
  }
}

/** Map backend progress steps to the AIProgressSteps shape. */
function toAnalysisSteps(steps: CodeGenStep[]): AnalysisStep[] {
  return steps.map((s) => ({ id: s.key, label: s.label, status: s.status }))
}

/**
 * Give immediate feedback: if the backend reports every step as still pending
 * (nothing running yet), show the first one as active so the user sees motion
 * instead of an all-"waiting" list. The next poll replaces this with real state.
 */
function withActiveLead(steps: AnalysisStep[]): AnalysisStep[] {
  if (steps.length === 0 || steps.some((s) => s.status === 'running' || s.status === 'error')) {
    return steps
  }
  const idx = steps.findIndex((s) => s.status === 'pending')
  if (idx === -1) return steps
  return steps.map((s, i) => (i === idx ? { ...s, status: 'running' } : s))
}

/**
 * First-time Implementation setup. A 4-step wizard: tech stack (≥1 area required) →
 * connect repo (required) → design (optional) → technical requirements (auto-generated,
 * editable). "Finish & Scaffold" performs a REAL scaffold: it creates the empty project
 * and pushes it to the repo's `develop` branch (ADR-0025). Story code generation into the
 * repo is gated on this completing.
 */
export function SetupWizard({ projectId, projectType, onClose }: SetupWizardProps) {
  const navigate = useNavigate()
  const dispatch = useDispatch<AppDispatch>()
  const { data: techStack } = useGetTechStackQuery(projectId)
  const { data: repo } = useGetRepoQuery(projectId)
  const { data: design } = useGetDesignAssetsQuery(projectId)
  const [updateTechStack] = useUpdateTechStackMutation()
  const [connectGithub] = useConnectGithubRepoMutation()
  const [saveDesign] = useSaveDesignAssetsMutation()
  const [startScaffold] = useStartScaffoldMutation()
  const [fetchScaffoldStatus] = useLazyGetScaffoldStatusQuery()

  const [step, setStep] = useState(0)
  const [advancing, setAdvancing] = useState(false)
  const [stack, setStack] = useState<StackSelection>(() => defaultSelection(projectType))
  const [areas, setAreas] = useState<StackAreas>({ frontend: false, backend: false, database: false })
  const [repoDraft, setRepoDraft] = useState<RepoDraft>(EMPTY_REPO_DRAFT)
  const [designDraft, setDesignDraft] = useState<DesignDraft>(EMPTY_DESIGN_DRAFT)
  // Scaffold progress lives in the store so it survives navigating away and back.
  const job = useJobProgress(`scaffold:${projectId}`)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const suggested = defaultSelection(projectType)

  // Seed editable drafts from saved data when the wizard mounts.
  useEffect(() => {
    const items = techStack?.items ?? []
    const has = (cat: string) => items.some((i) => i.category === cat)
    setStep(0)
    setDone(false)
    setStack(selectionFromItems(items, projectType))
    setAreas({ frontend: has(STACK_CAT.feFramework), backend: has(STACK_CAT.beFramework), database: has(STACK_CAT.database) })
    setRepoDraft(
      repo
        ? {
            provider: repo.provider,
            organisation: repo.organisation ?? '',
            repoName: repo.repoName,
            defaultBranch: repo.branch,
            isMonorepo: Boolean(repo.isMonorepo),
            frontendPath: repo.frontendPath ?? 'apps/web',
            backendPath: repo.backendPath ?? 'apps/api',
            token: '',
          }
        : EMPTY_REPO_DRAFT,
    )
    setDesignDraft(
      design
        ? { figmaUrl: design.figmaUrl ?? '', figmaToken: '', notes: design.notes ?? '', uploads: design.uploads }
        : EMPTY_DESIGN_DRAFT,
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stackValid = (areas.frontend && Boolean(stack.feFramework)) || (areas.backend && Boolean(stack.beFramework))
  // The technical spec is generated only for the scopes actually chosen in the setup.
  const techScopes: TechSpecScope[] = [
    ...(areas.frontend && stack.feFramework ? (['frontend'] as const) : []),
    ...(areas.backend && stack.beFramework ? (['backend'] as const) : []),
  ]
  const repoValid =
    repoDraft.provider === 'github' &&
    repoDraft.organisation.trim().length > 0 &&
    repoDraft.repoName.trim().length > 0 &&
    repoDraft.token.trim().length > 0

  function canAdvance(current: number): boolean {
    if (current === 0) return stackValid
    if (current === 1) return repoValid
    return true
  }

  async function persistTechStack() {
    await updateTechStack({ projectId, items: itemsFromSelection(applyAreas(stack, areas)), type: projectType }).unwrap()
  }

  async function connectRepo() {
    await connectGithub({
      projectId,
      token: repoDraft.token.trim(),
      owner: repoDraft.organisation.trim(),
      repo: repoDraft.repoName.trim(),
      branch: repoDraft.defaultBranch.trim() || undefined,
      isMonorepo: repoDraft.isMonorepo,
      frontendPath: repoDraft.isMonorepo ? repoDraft.frontendPath : undefined,
      backendPath: repoDraft.isMonorepo ? repoDraft.backendPath : undefined,
    }).unwrap()
  }

  // Persist as we go so step 4's generation reads the real stack, and so a connected repo is required.
  async function handleNext() {
    setAdvancing(true)
    setError(null)
    try {
      if (step === 0) {
        await persistTechStack()
      } else if (step === 1) {
        await connectRepo()
      } else if (step === 2 && (designDraft.figmaUrl.trim() || designDraft.notes.trim() || designDraft.uploads.length)) {
        await saveDesign({
          projectId,
          patch: {
            figmaUrl: designDraft.figmaUrl.trim() || undefined,
            hasFigmaToken: Boolean(designDraft.figmaToken.trim()),
            notes: designDraft.notes.trim() || undefined,
            uploads: designDraft.uploads,
          },
        }).unwrap()
      }
      setStep((s) => s + 1)
    } catch {
      const message =
        step === 1
          ? 'Could not connect the repository — check the token has write access to it.'
          : 'Could not save your changes. Please try again.'
      setError(message)
      notifications.show({ color: 'red', title: 'Setup', message })
    } finally {
      setAdvancing(false)
    }
  }

  async function pollScaffold(jobId: string, initial: CodeGenStep[]) {
    job.push(withActiveLead(toAnalysisSteps(initial)))
    let status = 'running'
    while (status === 'running') {
      await sleep(2500)
      const next = await fetchScaffoldStatus({ projectId, jobId }).unwrap()
      job.push(withActiveLead(toAnalysisSteps(next.steps)))
      status = next.status
    }
    if (status !== 'completed') {
      throw new Error('Scaffold did not complete.')
    }
  }

  async function runScaffold() {
    job.begin('scaffold')
    setError(null)
    // Seed an immediate "running" step so the progress box isn't empty while the
    // start request and tech-stack/repo persistence are in flight.
    job.push([{ id: 'starting', label: 'Preparing scaffold…', status: 'running' }])
    try {
      // Everything must be persisted before the scaffold reads it (idempotent if already done).
      await persistTechStack()
      await connectRepo()
      const started = await startScaffold(projectId).unwrap()
      if (started.status === 'blocked') {
        setError(started.message ?? 'Cannot scaffold yet.')
        job.end()
        return
      }
      await pollScaffold(started.jobId, started.steps)
      setDone(true)
    } catch {
      setError('Scaffolding failed. Check the repository connection and try again.')
      notifications.show({ color: 'red', title: 'Scaffolding failed', message: 'Please try again.' })
    } finally {
      job.end()
    }
  }

  function viewCode() {
    // Scaffolding finished in this session — reflect 'ready' immediately so the
    // section pages don't show the "scaffolding in progress" notice while the
    // persisted setup state catches up. (getSetupState is invalidated at scaffold
    // *start*, when status is still in-progress, and isn't refetched on completion.)
    dispatch(
      implementationApi.util.updateQueryData('getSetupState', projectId, (draft) => {
        draft.scaffoldStatus = 'ready'
      }),
    )
    navigate(`${ROUTES.implementation(projectId)}/frontend`)
  }

  if (job.busy || done) {
    return (
      <Box maw={560} mx="auto" py="xl">
        {!done ? (
          <>
            <Title order={3} size="h3" mb={4}>
              Setting up your project
            </Title>
            <Text size="sm" c="dimmed" mb="lg">
              Scaffolding the empty project and pushing it to the <Text span fw={600} ff="monospace">develop</Text> branch.
            </Text>
            <Paper withBorder radius="md" p="lg">
              <AIProgressSteps steps={job.steps} />
            </Paper>
            {error && (
              <Alert color="red" mt="md" icon={<IconAlertTriangle size={16} />}>
                {error}
              </Alert>
            )}
          </>
        ) : (
          <Stack align="center" gap="md">
            <ThemeIcon size={64} radius="xl" color="teal" variant="light">
              <IconCircleCheck size={36} />
            </ThemeIcon>
            <Title order={3} size="h3" ta="center">
              Your project is scaffolded
            </Title>
            <Text size="sm" c="dimmed" ta="center">
              The empty project was pushed to <Text span fw={600} ff="monospace">develop</Text>. Browse it in the Code
              tab — story development branches off it from here.
            </Text>
            <Button variant="accent" onClick={viewCode}>
              View Code
            </Button>
          </Stack>
        )}
      </Box>
    )
  }

  return (
    <Box maw={920} mx="auto">
      <Title order={2} size="h2" mb={4}>
        Set up your project
      </Title>
      <Text size="sm" c="dimmed" mb="xl">
        Choose your stack, connect a repository, then scaffold the project. Scaffolding is required before
        any story is developed.
      </Text>

      <Stepper active={step} onStepClick={setStep} mb="xl">
        {WIZARD_STEPS.map((label) => (
          <Stepper.Step key={label} label={label} />
        ))}
      </Stepper>

      <Title order={4}>{STEP_HEADERS[step]}</Title>
      <Text size="sm" c="dimmed" mt={4} mb="lg">
        {STEP_DESCRIPTIONS[step]}
      </Text>

      <Box mb="xl">
        {step === 0 && (
          <Stack gap="md">
            <StackArea label="Frontend" icon={IconLayoutDashboard} enabled={areas.frontend} onToggle={(on) => setAreas((a) => ({ ...a, frontend: on }))}>
              <FrontendSetup value={stack} onChange={setStack} suggestedFramework={suggested.feFramework} />
            </StackArea>
            <StackArea label="Backend" icon={IconServer} enabled={areas.backend} onToggle={(on) => setAreas((a) => ({ ...a, backend: on }))}>
              <BackendSetup value={stack} onChange={setStack} suggestedFramework={suggested.beFramework} />
            </StackArea>
            <StackArea label="Database" icon={IconDatabase} enabled={areas.database} onToggle={(on) => setAreas((a) => ({ ...a, database: on }))}>
              <DatabaseSetup value={stack} onChange={setStack} />
            </StackArea>
            {!stackValid && (
              <Text size="xs" c="dimmed">
                Enable at least Frontend or Backend and pick its framework to continue.
              </Text>
            )}
          </Stack>
        )}

        {step === 1 && <RepoSetup value={repoDraft} onChange={setRepoDraft} />}
        {step === 2 && <DesignSetup value={designDraft} onChange={setDesignDraft} />}
        {step === 3 && <TechnicalRequirementsTab projectId={projectId} autoGenerate scopes={techScopes} />}
      </Box>

      {error && (
        <Alert color="red" mb="md" icon={<IconAlertTriangle size={16} />} withCloseButton onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Group justify="space-between" className={styles.wizardInlineFooter}>
        <Button variant="subtle" color="gray" leftSection={<IconArrowLeft size={14} />} onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
          Back
        </Button>
        <Group gap="sm">
          <Button variant="subtle" color="gray" onClick={onClose}>
            Skip setup
          </Button>
          {step < LAST_STEP ? (
            <Button variant="accent" rightSection={<IconArrowRight size={14} />} onClick={handleNext} loading={advancing} disabled={!canAdvance(step)}>
              Next
            </Button>
          ) : (
            <Button color="violet" leftSection={<IconSparkles size={15} />} onClick={runScaffold} disabled={!stackValid || !repoValid}>
              Finish &amp; Scaffold
            </Button>
          )}
        </Group>
      </Group>
    </Box>
  )
}

interface StackAreaProps {
  label: string
  icon: ComponentType<{ size?: number }>
  enabled: boolean
  onToggle: (on: boolean) => void
  children: React.ReactNode
}

/** Optional, removable tech-stack area (Frontend / Backend / Database). */
function StackArea({ label, icon: Icon, enabled, onToggle, children }: StackAreaProps) {
  return (
    <Paper withBorder radius="md" p="md" className={enabled ? styles.stackArea : `${styles.stackArea} ${styles.stackAreaOff}`}>
      <Group justify="space-between" mb={enabled ? 'md' : 0}>
        <Group gap="sm">
          <ThemeIcon size={30} radius="md" variant="light" color={enabled ? 'indigo' : 'gray'}>
            <Icon size={17} />
          </ThemeIcon>
          <Text fw={600}>{label}</Text>
        </Group>
        <Switch checked={enabled} onChange={(e) => onToggle(e.currentTarget.checked)} label={enabled ? 'Included' : 'Add'} />
      </Group>
      {enabled && children}
    </Paper>
  )
}
