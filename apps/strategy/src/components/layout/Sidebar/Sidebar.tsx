import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { skipToken } from '@reduxjs/toolkit/query'
import { Box, Text, UnstyledButton, Badge, ColorSwatch } from '@mantine/core'
import { IconFiles, IconHelpCircle } from '@tabler/icons-react'
import { useStrategyProject } from '../../../app/StrategyProjectContext'
import { activePhaseIdFromPath, progressOf, unresolvedCount } from '../../../features/phase/utility/helpers/helpers'
import { useGetKbQuery } from '../../../features/phase/utility/services/phaseStateApi'
import styles from './Sidebar.module.css'

const DISCOVERY_PHASE_ID = 'discovery'

/**
 * The strategy workspace sidebar — the active phase's views. For the Discovery phase it lists the knowledge-base
 * categories (the 6 discovery sections, with note counts) so the user browses the generated KB like the custom-app
 * project; other phases show the Documents view. Open Questions (with the unresolved count) is always present.
 */
export function Sidebar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { phases, state, phasePath, projectId, strategyName } = useStrategyProject()

  const activePhaseId = activePhaseIdFromPath(pathname) ?? phases[0]?.id
  const activePhase = phases.find((p) => p.id === activePhaseId)
  const isDiscovery = activePhase?.id === DISCOVERY_PHASE_ID
  const onQuestionsView = pathname.endsWith('/questions')
  const openCount = activePhase ? unresolvedCount(progressOf(state, activePhase.id)) : 0

  // KB categories drive the Discovery sidebar (the 6 sections are always returned, even before generation).
  const { data: kb } = useGetKbQuery(isDiscovery ? projectId : skipToken)
  const firstPopulated = kb?.sections.find((s) => s.notes.length > 0)?.id ?? kb?.sections[0]?.id
  const selectedSection = searchParams.get('section') ?? firstPopulated

  return (
    <Box className={styles.inner ?? ''}>
      {strategyName ? (
        <Box className={styles.section ?? ''}>
          <Text className={styles.label ?? ''}>Strategy</Text>
          <Text fw={600} size="sm">{strategyName}</Text>
        </Box>
      ) : null}

      {activePhase ? (
        <Box className={styles.section ?? ''}>
          <Text className={styles.label ?? ''}>{activePhase.name}</Text>

          {isDiscovery ? (
            (kb?.sections ?? []).map((s) => {
              const hasNotes = s.notes.length > 0
              const active = !onQuestionsView && s.id === selectedSection
              return (
                <UnstyledButton
                  key={s.id}
                  className={`${styles.item ?? ''} ${active ? (styles.itemActive ?? '') : ''}`}
                  onClick={() => navigate(`${phasePath(DISCOVERY_PHASE_ID)}?section=${s.id}`)}
                >
                  <ColorSwatch
                    size={8}
                    withShadow={false}
                    color={hasNotes ? 'var(--mantine-color-teal-6)' : 'var(--mantine-color-gray-5)'}
                  />
                  {s.label}
                  {hasNotes ? (
                    <Text size="xs" c="dimmed" ff="monospace" ml="auto">
                      {s.notes.length}
                    </Text>
                  ) : null}
                </UnstyledButton>
              )
            })
          ) : (
            <UnstyledButton
              className={`${styles.item ?? ''} ${!onQuestionsView ? (styles.itemActive ?? '') : ''}`}
              onClick={() => navigate(phasePath(activePhase.id))}
            >
              <IconFiles size={15} />
              Documents
            </UnstyledButton>
          )}

          <UnstyledButton
            className={`${styles.item ?? ''} ${onQuestionsView ? (styles.itemActive ?? '') : ''}`}
            onClick={() => navigate(`${phasePath(activePhase.id)}/questions`)}
          >
            <IconHelpCircle size={15} />
            Open Questions
            {openCount > 0 ? (
              <Badge size="sm" radius="sm" color="yellow" variant="light" ml="auto">
                {openCount}
              </Badge>
            ) : null}
          </UnstyledButton>
        </Box>
      ) : null}
    </Box>
  )
}
