import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from '@mantine/form'
import { yupResolver } from 'mantine-form-yup-resolver'
import { notifications } from '@mantine/notifications'
import { Modal, Stepper, Box, Group, Button, Text } from '@mantine/core'
import { IconArrowLeft, IconArrowRight } from '@tabler/icons-react'
import { ROUTES } from '@wispr/contracts'
import type { ProjectType } from '@wispr/contracts'
import {
  useGetProjectTypeCatalogQuery,
  useGetStrategyTypesQuery,
  useGetStrategyPhasesQuery,
  useCreateProjectMutation,
  useInstantiateStrategyMutation,
  projectWizardSchema,
} from '@wispr/projects'
import type { ProjectWizardValues, ProjectType as IndustryType } from '@wispr/projects'
import { BasicsStep } from './steps/BasicsStep/BasicsStep'
import { ProjectTypeStep } from './steps/ProjectTypeStep/ProjectTypeStep'
import { PhasesStep } from './steps/PhasesStep/PhasesStep'
import { ReviewStep } from './steps/ReviewStep/ReviewStep'

interface ProjectCreateWizardProps {
  opened: boolean
  onClose: () => void
  workspaceId: string
  workspaceName: string
}

const INITIAL_VALUES: ProjectWizardValues = {
  name: '',
  description: '',
  projectType: '',
  industry: '',
  strategyType: '',
  phaseIds: [],
  logo: '',
}

// The federation type whose phase rail is configured at creation (gets a Phases step).
const STRATEGY = 'strategy'

type StepKey = 'basics' | 'type' | 'phases' | 'review'
const STEP_LABELS: Record<StepKey, string> = {
  basics: 'Basics',
  type: 'Project type',
  phases: 'Phases',
  review: 'Review',
}

/**
 * Create-project wizard (Basics → Project Type → [Phases] → Review). The chosen
 * federation project type drives which remote the project mounts; coming-soon types
 * are gated. A **strategy** type inserts a Phases step where the project's phase rail
 * is configured (template or custom) and persisted as project data. Creates the
 * project in the active workspace and lands the user in its Discovery phase.
 */
export function ProjectCreateWizard({
  opened,
  onClose,
  workspaceId,
  workspaceName,
}: ProjectCreateWizardProps) {
  const navigate = useNavigate()
  const [active, setActive] = useState(0)
  const [typeError, setTypeError] = useState(false)
  const [phaseError, setPhaseError] = useState(false)
  // The chosen type drives selection state, the Next gate, and Review — so it lives
  // in React state (not the uncontrolled form, which wouldn't re-render on change).
  const [projectType, setProjectType] = useState<string>('')
  // "By category" selection: the chosen solution's id (for highlight) + display name.
  const [solutionId, setSolutionId] = useState<string | null>(null)
  const [solution, setSolution] = useState<string | null>(null)
  // Strategy phase configuration (only used when projectType === 'strategy').
  const [strategyType, setStrategyType] = useState<string>('')
  const [phaseIds, setPhaseIds] = useState<string[]>([])

  const { data: catalog = [], isLoading, isError, refetch } = useGetProjectTypeCatalogQuery()
  const [createProject, { isLoading: creating }] = useCreateProjectMutation()
  const [instantiateStrategy] = useInstantiateStrategyMutation()

  const isStrategy = projectType === STRATEGY
  // Strategy master data is only needed (fetched) once a strategy type is chosen.
  const { data: strategyTypes = [], isLoading: stTypesLoading, isError: stTypesError, refetch: stRefetch } =
    useGetStrategyTypesQuery(undefined, { skip: !isStrategy })
  const { data: strategyPhases = [], isLoading: stPhasesLoading } = useGetStrategyPhasesQuery(undefined, {
    skip: !isStrategy,
  })

  const form = useForm<ProjectWizardValues>({
    mode: 'uncontrolled',
    initialValues: INITIAL_VALUES,
    validate: yupResolver(projectWizardSchema),
  })

  // Reset to a clean slate every time the wizard opens.
  useEffect(() => {
    if (opened) {
      form.setValues(INITIAL_VALUES)
      form.resetDirty(INITIAL_VALUES)
      setActive(0)
      setTypeError(false)
      setPhaseError(false)
      setProjectType('')
      setSolutionId(null)
      setSolution(null)
      setStrategyType('')
      setPhaseIds([])
    }
    // form is stable; only react to open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened])

  // The step sequence depends on the chosen type: strategy adds a Phases step.
  const steps: StepKey[] = isStrategy
    ? ['basics', 'type', 'phases', 'review']
    : ['basics', 'type', 'review']
  const clampedActive = Math.min(active, steps.length - 1)
  const activeKey = steps[clampedActive] ?? 'basics'

  const selectedType = projectType
  const selectedEntry = catalog.find((e) => e.key === selectedType)

  // Clears strategy phase config when the chosen type isn't strategy.
  function resetStrategyIfNeeded(key: string) {
    if (key !== STRATEGY) {
      setStrategyType('')
      setPhaseIds([])
    }
  }

  // All-types mode: a federation type directly (clears any solution selection).
  function selectType(key: ProjectType) {
    setProjectType(key)
    setSolutionId(null)
    setSolution(null)
    setTypeError(false)
    resetStrategyIfNeeded(key)
  }

  // By-category mode: a solution that maps to a federation type.
  function selectSolution(id: string, maps: ProjectType, name: string) {
    setProjectType(maps)
    setSolutionId(id)
    setSolution(name)
    setTypeError(false)
    resetStrategyIfNeeded(maps)
  }

  function changePhases(selection: { strategyType: string; phaseIds: string[] }) {
    setStrategyType(selection.strategyType)
    setPhaseIds(selection.phaseIds)
    setPhaseError(false)
  }

  function goNext() {
    if (activeKey === 'basics') {
      const nameErr = form.validateField('name').hasError
      const descErr = form.validateField('description').hasError
      if (nameErr || descErr) return
      setActive(clampedActive + 1)
      return
    }
    if (activeKey === 'type') {
      if (!selectedEntry || selectedEntry.status !== 'available') {
        setTypeError(true)
        return
      }
      setActive(clampedActive + 1)
      return
    }
    if (activeKey === 'phases') {
      if (phaseIds.length === 0) {
        setPhaseError(true)
        return
      }
      setActive(clampedActive + 1)
      return
    }
    void submit()
  }

  async function submit() {
    const values = form.getValues()
    try {
      // Core stores NO strategy/phase data (the strategy capability schema owns it). Only the federation
      // projectType reaches Core; the chosen strategy is mapped onto the project via instantiate below.
      const result = await createProject({
        name: values.name.trim(),
        description: values.description.trim(),
        projectType: projectType as ProjectType,
        workspaceId,
        ...(values.industry ? { industry: values.industry as IndustryType } : {}),
        ...(values.logo ? { logo: values.logo } : {}),
      }).unwrap()

      // Strategy projects: map the chosen strategy onto the new project in the strategy module (the capability
      // schema owns the phases — Core never sees them). Awaited before navigating so the workspace opens with its
      // rail already instantiated; instantiate is idempotent server-side.
      if (isStrategy) {
        const template = strategyTypes.find((t) => t.key === strategyType)
        await instantiateStrategy(
          template
            ? { projectId: result.projectId, strategyTemplateId: template.id }
            : {
                projectId: result.projectId,
                phases: phaseIds.map((id, index) => ({
                  phaseTemplateId: id,
                  required: true,
                  dependsOn: phaseIds.slice(Math.max(0, index - 1), index),
                  ordinal: index,
                })),
              },
        ).unwrap()
      }

      notifications.show({
        color: 'teal',
        title: 'Project created',
        message: 'Your project is ready — starting in Discovery.',
      })
      onClose()
      navigate(ROUTES.discovery(result.projectId))
    } catch {
      notifications.show({
        color: 'red',
        title: 'Could not create project',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  const strategyTypeName = strategyTypes.find((t) => t.key === strategyType)?.name ?? null
  const nextLabel =
    activeKey === 'review'
      ? 'Create project'
      : activeKey === 'type' && isStrategy
        ? 'Configure phases'
        : 'Next'

  function renderStep(key: StepKey) {
    if (key === 'basics') return <BasicsStep form={form} />
    if (key === 'type') {
      return (
        <>
          <ProjectTypeStep
            catalog={catalog}
            isLoading={isLoading}
            isError={isError}
            refetch={refetch}
            selectedType={selectedType}
            selectedSolutionId={solutionId}
            onSelectType={selectType}
            onSelectSolution={selectSolution}
          />
          {typeError ? (
            <Text size="sm" c="red" mt="xs">
              Select an available project type to continue.
            </Text>
          ) : null}
        </>
      )
    }
    if (key === 'phases') {
      return (
        <>
          <PhasesStep
            strategyTypes={strategyTypes}
            phases={strategyPhases}
            isLoading={stTypesLoading || stPhasesLoading}
            isError={stTypesError}
            refetch={stRefetch}
            strategyType={strategyType}
            phaseIds={phaseIds}
            onChange={changePhases}
          />
          {phaseError ? (
            <Text size="sm" c="red" mt="xs">
              Pick a strategy type or build a phase set to continue.
            </Text>
          ) : null}
        </>
      )
    }
    return (
      <ReviewStep
        values={form.getValues()}
        workspaceName={workspaceName}
        entry={selectedEntry}
        solution={solution}
        phaseIds={isStrategy ? phaseIds : []}
        phases={strategyPhases}
        strategyTypeName={strategyTypeName}
      />
    )
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      size="lg"
      title={
        <Box>
          <Text fw={600} fz={16}>
            Create a new project
          </Text>
          <Text size="sm" c="dimmed" mt={2}>
            In {workspaceName} — a few details to begin.
          </Text>
        </Box>
      }
    >
      <Stepper active={clampedActive} onStepClick={setActive} size="sm" mb="lg">
        {steps.map((key, index) => (
          <Stepper.Step key={key} label={STEP_LABELS[key]} allowStepSelect={index < clampedActive}>
            <Box mt="md">{renderStep(key)}</Box>
          </Stepper.Step>
        ))}
      </Stepper>

      <Group justify="space-between" mt="lg">
        {clampedActive === 0 ? (
          <Box />
        ) : (
          <Button
            variant="default"
            leftSection={<IconArrowLeft size={14} />}
            onClick={() => setActive((s) => Math.max(0, s - 1))}
          >
            Back
          </Button>
        )}
        <Button
          variant="accent"
          loading={creating}
          rightSection={activeKey === 'review' ? undefined : <IconArrowRight size={14} />}
          onClick={goNext}
        >
          {nextLabel}
        </Button>
      </Group>
    </Modal>
  )
}
