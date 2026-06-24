import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, View } from 'react-native';

import { BackHeader } from '@/components/ui/BackHeader';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { useProjectsWithCounts } from '@/features/buyer/hooks';
import type { ProjectSummary } from '@/features/buyer/api';
import { color } from '@/theme/tokens';

/**
 * Projects browse (§3/§4) — admin-uploaded projects with a live count of available
 * plots. Tapping a project opens the Properties tab filtered to it. Fully dynamic.
 */
export default function ProjectsScreen() {
  const { data: projects = [], isLoading } = useProjectsWithCounts();

  return (
    <Screen contentClassName="pb-12 gap-3">
      <BackHeader title="Projects" />
      <Text variant="body" className="text-muted">
        Explore every project. Tap one to see its available plots.
      </Text>

      {isLoading ? (
        <View className="items-center py-12">
          <ActivityIndicator color={color.red} />
        </View>
      ) : projects.length === 0 ? (
        <EmptyState
          icon="business"
          title="No projects yet"
          body="Projects added by the team will appear here automatically."
        />
      ) : (
        projects.map((p) => <ProjectRow key={p.id} project={p} />)
      )}
    </Screen>
  );
}

function ProjectRow({ project }: { project: ProjectSummary }) {
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/(tabs)/properties', params: { projectId: project.id } })
      }>
      <Card className="flex-row items-center gap-3">
        <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red/10">
          <Ionicons name="business" size={22} color={color.red} />
        </View>
        <View className="flex-1">
          <Text variant="title" numberOfLines={1}>
            {project.name}
          </Text>
          <View className="flex-row items-center gap-2">
            {project.code ? <Text className="font-mono text-[12px] text-gold-deep">{project.code}</Text> : null}
            {project.location ? (
              <Text variant="caption" numberOfLines={1} className="flex-1">
                {project.location}
              </Text>
            ) : null}
          </View>
        </View>
        <Badge
          label={`${project.available} ${project.available === 1 ? 'plot' : 'plots'}`}
          tone={project.available > 0 ? 'available' : 'neutral'}
        />
        <Ionicons name="chevron-forward" size={18} color={color.muted} />
      </Card>
    </Pressable>
  );
}
