import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getOrCreateSupportThread, listMessages, sendMessage } from './api';

export function useSupportThread() {
  return useQuery({ queryKey: ['support-thread'], queryFn: getOrCreateSupportThread });
}

export function useMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: ['messages', threadId],
    queryFn: () => listMessages(threadId as string),
    enabled: !!threadId,
  });
}

export function useSendMessage(threadId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => sendMessage(threadId as string, body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['messages', threadId] }),
  });
}
