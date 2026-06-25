import { useLocation } from 'react-router-dom'
import { AIAssistantPanel as SharedAssistantPanel } from '@wispr/ui'
import { PHASE_LABEL } from '../../constants/phases'
import { useCurrentProject } from '@wispr/projects'
import { DictationButton } from '../ui/DictationButton'
import type { Phase } from '../../types'

const PHASE_ORDER_IDS: Phase[] = [
  'discovery',
  'planning',
  'features',
  'implementation',
  'test',
]

export function AIAssistantPanel() {
  const location = useLocation()
  const { project: currentProject } = useCurrentProject()

  const activePhase = PHASE_ORDER_IDS.find((p) => location.pathname.includes(`/${p}`))

  return (
    <SharedAssistantPanel
      {...(currentProject ? { projectName: currentProject.name } : {})}
      {...(activePhase ? { phaseLabel: PHASE_LABEL[activePhase] } : {})}
      dictationSlot={<DictationButton size="sm" disabled onTranscript={() => {}} />}
    />
  )
}
