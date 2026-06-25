import { Button } from '@mantine/core'
import { IconDownload, IconRefresh, IconSparkles } from '@tabler/icons-react'
import { formatDateTime } from '../../utility/helpers/helpers'
import { FileItem } from '../FileItem/FileItem'

interface OutputDocItemProps {
  name: string
  format: string
  generated: boolean
  generatedAt?: string | undefined
  locked: boolean
  canGenerate: boolean
  onGenerate: () => void
  onDownload: () => void
}

/**
 * One output document chip — before generation a Generate action sits where the ⋯ menu
 * would; after generation it shows timestamp metadata + a ⋯ menu (Download, Regenerate).
 */
export function OutputDocItem({ name, format, generated, generatedAt, locked, canGenerate, onGenerate, onDownload }: OutputDocItemProps) {
  const meta = formatDateTime(generatedAt)

  if (generated) {
    return (
      <FileItem
        accent
        name={name}
        meta={meta ? `${format} · Generated ${meta}` : format}
        actions={[
          { label: 'Download', icon: <IconDownload size={15} />, onClick: onDownload },
          { label: 'Regenerate', icon: <IconRefresh size={15} />, onClick: onGenerate, disabled: locked },
        ]}
      />
    )
  }

  return (
    <FileItem
      accent
      name={name}
      meta={format}
      action={
        <Button
          size="compact-sm"
          variant="light"
          color="violet"
          leftSection={<IconSparkles size={14} />}
          disabled={locked || !canGenerate}
          onClick={onGenerate}
        >
          Generate
        </Button>
      }
    />
  )
}
