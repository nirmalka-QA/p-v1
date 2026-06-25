import { Card, Title, Text, List, Divider, Group, Badge } from '@mantine/core'

export interface DiscoveryGuideSection {
  id: string
  label: string
}

export interface DiscoveryGuideProps {
  /** Sections the AI will create — shown as badges. */
  sections: DiscoveryGuideSection[]
  /** File extensions accepted by the input (without dot), e.g. ['pdf', 'docx']. */
  acceptedExtensions: string[]
}

/**
 * Helper panel shown beside the discovery form — explains the flow and previews
 * what the AI will structure from the uploaded context.
 */
export function DiscoveryGuide({ sections, acceptedExtensions }: DiscoveryGuideProps) {
  return (
    <Card withBorder radius="md" padding="lg">
      <Title order={4} size="h4" mb="xs">
        How this works
      </Title>
      <List type="ordered" size="sm" spacing="xs" c="dimmed">
        <List.Item>Add notes, paste context, or upload files — briefs, transcripts, requirements.</List.Item>
        <List.Item>The AI reads everything and organises it into a structured Knowledge Base.</List.Item>
        <List.Item>Review the sections — this becomes the shared context for every later phase.</List.Item>
      </List>

      <Divider my="md" />

      <Text size="sm" fw={600} mb="xs">
        Sections the AI will create
      </Text>
      <Group gap={6}>
        {sections.map((section) => (
          <Badge key={section.id} variant="light" color="gray" radius="sm" tt="none" fw={500}>
            {section.label}
          </Badge>
        ))}
      </Group>

      <Divider my="md" />

      <Text size="xs" c="dimmed" ff="monospace">
        Accepts: {acceptedExtensions.map((e) => e.replace('.', '').toUpperCase()).join(' · ')}
      </Text>
    </Card>
  )
}
