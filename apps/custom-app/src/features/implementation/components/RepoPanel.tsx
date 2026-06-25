import { useState, useEffect } from "react";
import { notifications } from "@mantine/notifications";
import {
  Box,
  Group,
  Title,
  Text,
  Badge,
  Paper,
  Skeleton,
  ThemeIcon,
  TextInput,
  PasswordInput,
  Button,
  Stack,
  Anchor,
  Select,
  Tooltip,
  ActionIcon,
} from "@mantine/core";
import {
  IconBrandGithub,
  IconGitBranch,
  IconAlertTriangle,
  IconRefresh,
} from "@tabler/icons-react";
import { EmptyState } from '@wispr/ui';

import {
  useGetRepoQuery,
  useConnectGithubRepoMutation,
  useGetRepoBranchesQuery,
  useSwitchRepoBranchMutation,
  useGetRepoFileQuery,
} from "../utility/services/implementationApi";
import { firstFilePath } from "../utility/helpers/helpers";
import { skipToken } from "@reduxjs/toolkit/query";
import { CodeEditor } from "./CodeEditor";
import { RepoFileTree } from "./RepoFileTree";

interface RepoPanelProps {
  projectId: string;
  projectName: string;
}

/** Repository viewer (§8.4): connect, browse the file tree, read files (read-only). */
export function RepoPanel({ projectId, projectName }: RepoPanelProps) {
  const {
    data: repo,
    isLoading,
    isError,
    refetch,
  } = useGetRepoQuery(projectId);
  const { data: branches = [] } = useGetRepoBranchesQuery(projectId);
  const [connectGithub, { isLoading: connecting }] =
    useConnectGithubRepoMutation();
  const [switchBranch, { isLoading: switching }] =
    useSwitchRepoBranchMutation();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const [owner, setOwner] = useState("");
  const [repoName, setRepoName] = useState(projectName);
  const [branch, setBranch] = useState("");
  const [token, setToken] = useState("");
  const [showConnect, setShowConnect] = useState(false);

  function openConnect() {
    setOwner(repo?.organisation ?? "");
    setRepoName(repo?.repoName ?? projectName);
    setBranch(repo?.branch ?? "");
    setToken("");
    setShowConnect(true);
  }

  // Default to the first file once a repo is connected.
  useEffect(() => {
    if (repo && !selectedPath) setSelectedPath(firstFilePath(repo.fileTree));
  }, [repo, selectedPath]);

  const { data: file, isFetching: fileLoading } = useGetRepoFileQuery(
    selectedPath ? { projectId, path: selectedPath } : skipToken,
  )

  async function handleConnectGithub() {
    if (!owner.trim() || !repoName.trim() || !token.trim()) {
      notifications.show({
        color: "red",
        title: "Missing details",
        message: "Owner, repository and token are required.",
      });
      return;
    }
    try {
      await connectGithub({
        projectId,
        token: token.trim(),
        owner: owner.trim(),
        repo: repoName.trim(),
        branch: branch.trim() || undefined,
      }).unwrap();
      setToken("");
      setSelectedPath(null);
      setShowConnect(false);
      notifications.show({
        color: "teal",
        title: "GitHub connected",
        message: "Loaded the repository file tree.",
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Could not connect",
        message: "Check the token has access to the repository.",
      });
    }
  }

  async function changeBranch(next: string | null) {
    if (!next || next === repo?.branch) return;
    try {
      await switchBranch({ projectId, branch: next }).unwrap();
      setSelectedPath(null);
      notifications.show({
        color: "teal",
        title: "Branch switched",
        message: `Now viewing ${next}.`,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Could not switch branch",
        message: "Please try again.",
      });
    }
  }

  async function syncBranch() {
    if (!repo?.branch) return;
    try {
      await switchBranch({ projectId, branch: repo.branch }).unwrap();
      setSelectedPath(null);
      notifications.show({
        color: "teal",
        title: "Synced",
        message: `Pulled the latest ${repo.branch} from origin.`,
      });
    } catch {
      notifications.show({
        color: "red",
        title: "Sync failed",
        message: "Please try again.",
      });
    }
  }

  if (isLoading) {
    return <Skeleton height={480} radius="md" />;
  }

  if (isError) {
    return (
      <EmptyState
        icon={IconAlertTriangle}
        title="Couldn't load the repository"
        description="Something went wrong fetching the connected repository."
        action={{ label: "Retry", onClick: () => void refetch() }}
      />
    );
  }

  if (!repo || showConnect) {
    return (
      <Paper withBorder radius="md" p="lg" maw={460}>
        <Group gap="xs" mb={4}>
          <ThemeIcon size={26} radius="md" variant="light" color="dark">
            <IconBrandGithub size={15} />
          </ThemeIcon>
          <Title order={4} size="h5">
            {repo ? "Reconnect / update GitHub" : "Connect a GitHub repository"}
          </Title>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Paste a{" "}
          <Anchor
            href="https://github.com/settings/tokens?type=beta"
            target="_blank"
            size="sm"
          >
            fine-grained Personal Access Token
          </Anchor>{" "}
          with read access (and write, to generate code into the repo later).
          The token is stored encrypted and never shown again.
        </Text>
        <Stack gap="sm">
          <Group grow>
            <TextInput
              label="Owner / org"
              placeholder="acme"
              value={owner}
              onChange={(e) => setOwner(e.currentTarget.value)}
            />
            <TextInput
              label="Repository"
              placeholder="my-repo"
              value={repoName}
              onChange={(e) => setRepoName(e.currentTarget.value)}
            />
          </Group>
          <TextInput
            label="Branch (optional)"
            placeholder="defaults to the repo's default branch"
            value={branch}
            onChange={(e) => setBranch(e.currentTarget.value)}
          />
          <PasswordInput
            label="Access token"
            placeholder="github_pat_…"
            value={token}
            onChange={(e) => setToken(e.currentTarget.value)}
          />
          <Group justify="flex-end" gap="sm">
            {repo && (
              <Button variant="default" onClick={() => setShowConnect(false)}>
                Cancel
              </Button>
            )}
            <Button
              variant="accent"
              leftSection={<IconBrandGithub size={15} />}
              loading={connecting}
              onClick={() => void handleConnectGithub()}
            >
              {repo ? "Update connection" : "Connect GitHub"}
            </Button>
          </Group>
        </Stack>
      </Paper>
    );
  }

  return (
    <Box>
      <Group justify="space-between" mb="md" wrap="wrap" gap="sm">
        <Group gap="xs">
          <ThemeIcon size={28} radius="md" variant="light" color="dark">
            <IconBrandGithub size={16} />
          </ThemeIcon>
          <Title order={4} size="h5">
            {repo.repoName}
          </Title>
          {branches.length > 0 ? (
            <>
              <Select
                size="xs"
                w={200}
                leftSection={<IconGitBranch size={13} />}
                data={branches}
                value={
                  branches.includes(repo.branch) ? repo.branch : branches[0]
                }
                onChange={changeBranch}
                disabled={switching}
                allowDeselect={false}
                comboboxProps={{ withinPortal: true }}
                aria-label="Branch"
              />
              <Tooltip label="Sync latest from origin" withArrow>
                <ActionIcon
                  variant="light"
                  color="gray"
                  onClick={() => void syncBranch()}
                  loading={switching}
                  aria-label="Sync from origin"
                >
                  <IconRefresh size={15} />
                </ActionIcon>
              </Tooltip>
            </>
          ) : (
            <Group gap="xs">
              <Badge
                variant="light"
                color="gray"
                radius="sm"
                leftSection={<IconGitBranch size={11} />}
              >
                {repo.branch}
              </Badge>
              <Text size="xs" c="dimmed">
                No branches on origin yet — scaffold the project in Setup to
                create{" "}
                <Text span ff="monospace">
                  develop
                </Text>
                .
              </Text>
            </Group>
          )}
        </Group>
        <Button
          variant="light"
          color="dark"
          size="compact-sm"
          leftSection={<IconBrandGithub size={14} />}
          onClick={openConnect}
        >
          Reconnect / update token
        </Button>
      </Group>

      <CodeEditor
        files={file ? [{ filename: file.path, language: file.language, content: file.content }] : []}
        loading={fileLoading}
        sidebarTitle={repo.repoName}
        sidebar={
          <RepoFileTree nodes={repo.fileTree} selectedPath={selectedPath} onSelect={setSelectedPath} />
        }
      />
    </Box>
  );
}
