import { Box, Stack } from '@mantine/core'
import { PageHeader } from '@wispr/ui'
import { MockDataBanner } from '../../components/ui/MockDataBanner/MockDataBanner'
import { BasicDetails } from './components/BasicDetails/BasicDetails'
import { ProjectsSection } from './components/ProjectsSection/ProjectsSection'

/**
 * The signed-in user's profile (`/profile`) — host-owned, reached from the top-bar
 * profile menu. Two sections: basic details (identity + directory fields) and the
 * project history (every project worked on, with active/closed status). Any
 * authenticated user sees their own profile (ProtectedRoute guarantees auth).
 */
export function ProfilePage() {
  return (
    <Box maw={1080} mx="auto" w="100%" px={28} pt={44} pb={80}>
      <PageHeader title="Profile" description="Your details and the projects you've worked on." />
      <Stack gap="lg" mt="lg">
        <MockDataBanner surface="profile data" />
        <BasicDetails />
        <ProjectsSection />
      </Stack>
    </Box>
  )
}
