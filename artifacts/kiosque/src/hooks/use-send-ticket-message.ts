import { useQueryClient } from "@tanstack/react-query";
import {
  getGetTicketMessagesQueryKey,
  useSendMessage,
  type Message,
} from "@workspace/api-client-react";

export function useSendTicketMessage(ticketId: number) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useSendMessage();

  function send(
    content: string,
    callbacks?: { onSuccess?: () => void; onError?: () => void },
  ) {
    const trimmed = content.trim();
    if (!trimmed) return;

    mutate(
      { data: { ticketId, content: trimmed } },
      {
        onSuccess: (newMessage) => {
          queryClient.setQueryData<Message[]>(
            getGetTicketMessagesQueryKey(ticketId),
            (prev) => {
              if (!prev) return [newMessage];
              if (prev.some((m) => m.id === newMessage.id)) return prev;
              return [...prev, newMessage];
            },
          );
          callbacks?.onSuccess?.();
        },
        onError: () => callbacks?.onError?.(),
      },
    );
  }

  return { send, isPending };
}
