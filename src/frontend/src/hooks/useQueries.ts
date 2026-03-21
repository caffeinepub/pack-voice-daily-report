import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UserProfile } from "../backend";
import { useActor } from "./useActor";

export function useMyReports() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["myReports"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listMyReports();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAllReports() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allReports"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listAllReports();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReportsForToday() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["reportsToday"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listReportsForToday();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReportsByDate(date: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["reportsByDate", date?.toString()],
    queryFn: async () => {
      if (!actor || date === null) return [];
      return actor.getReportsByDate(date);
    },
    enabled: !!actor && !isFetching && date !== null,
  });
}

export function useTeamStatus() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["teamStatus"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReportStatusForToday();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useIsAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["isAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCallerProfile() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["callerProfile"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSubmitReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      hasVoiceTranscript,
    }: { content: string; hasVoiceTranscript: boolean }) => {
      if (!actor) throw new Error("Not connected");
      return actor.submitDailyReport(content, hasVoiceTranscript);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["myReports"] });
      queryClient.invalidateQueries({ queryKey: ["reportsToday"] });
      queryClient.invalidateQueries({ queryKey: ["teamStatus"] });
    },
  });
}

export function useSaveProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error("Not connected");
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["callerProfile"] });
    },
  });
}
