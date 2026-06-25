import { Box, Text, Button } from '@mantine/core'
import styles from './projectSettings.module.css'

interface Integration {
  label: string
  cls: string
  glyph: string
  linked: boolean
}

const INTEGRATIONS: Integration[] = [
  { label: 'GitHub', cls: styles.gh ?? '', glyph: 'GH', linked: true },
  { label: 'Figma', cls: styles.fg ?? '', glyph: 'Fi', linked: false },
  { label: 'Slack', cls: styles.sl ?? '', glyph: 'Sl', linked: false },
  { label: 'Vercel', cls: styles.vc ?? '', glyph: '▲', linked: false },
  { label: 'AWS', cls: styles.aw ?? '', glyph: 'aws', linked: false },
  { label: 'Linear', cls: styles.ln ?? '', glyph: 'L', linked: false },
  { label: 'Sentry', cls: styles.sn ?? '', glyph: 'S', linked: false },
  { label: 'Notion', cls: styles.no ?? '', glyph: 'N', linked: false },
]

export function IntegrationsSettings() {
  return (
    <Box>
      <Text size="sm" c="dimmed" mb="md">
        Connect WISPR to the tools your team already uses.
      </Text>

      {INTEGRATIONS.map((int) => (
        <Box key={int.label} className={styles.intRow ?? ''}>
          <Box className={styles.intLeft ?? ''}>
            <Box className={`${styles.glyph ?? ''} ${int.cls}`}>{int.glyph}</Box>
            <Text size="sm" fw={500}>
              {int.label}
            </Text>
          </Box>
          <Button
            variant={int.linked ? 'default' : 'light'}
            color={int.linked ? 'gray' : 'indigo'}
            size="compact-sm"
          >
            {int.linked ? 'Disconnect' : 'Connect'}
          </Button>
        </Box>
      ))}
    </Box>
  )
}
