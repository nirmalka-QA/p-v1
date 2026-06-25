import { useNavigate } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { notifications } from '@mantine/notifications'
import { Button } from '@mantine/core'
import { IconArrowRight } from '@tabler/icons-react'
import { useGetStoriesQuery } from '../../features/utility/services/featuresApi'
import { useUpdateProjectMutation } from '@wispr/projects'
import { visibleStories } from '../../features/utility/helpers/helpers'
import { isImplStory } from '../utility/helpers/stories'
import { ROUTES } from '@wispr/contracts'

interface ContinueToTestButtonProps {
  projectId: string
}

/**
 * Phase-level gate: advance the project to Test once at least one story is
 * implemented. Self-contained so it can sit at the top of both the Stories
 * board and the Frontend/Backend workspace. Renders nothing until eligible.
 */
export function ContinueToTestButton({ projectId }: ContinueToTestButtonProps) {
  const navigate = useNavigate()
  const { data: stories = [] } = useGetStoriesQuery(projectId ?? skipToken)
  const [updateProject, { isLoading: advancing }] = useUpdateProjectMutation()

  const doneCount = visibleStories(stories).filter((s) => isImplStory(s) && s.status === 'done').length
  if (doneCount === 0) return null

  async function continueToTest() {
    try {
      await updateProject({ id: projectId, patch: { currentPhase: 'test' } }).unwrap()
    } catch {
      // non-fatal — still advance
    }
    notifications.show({
      color: 'teal',
      title: 'Advancing to Test',
      message: `${doneCount} implemented stor${doneCount === 1 ? 'y' : 'ies'} ready for testing.`,
    })
    navigate(ROUTES.test(projectId))
  }

  return (
    <Button variant="accent" rightSection={<IconArrowRight size={14} />} loading={advancing} onClick={continueToTest}>
      Continue to Test
    </Button>
  )
}
