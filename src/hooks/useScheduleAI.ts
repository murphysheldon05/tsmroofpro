import { useState, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ScheduleAction {
  type: "collect" | "confirm" | "scheduled";
  collected?: Record<string, unknown>;
  asking_for?: string;
  event?: Record<string, unknown>;
  eventId?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: ScheduleAction;
}

export function useScheduleAI() {
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        'I can check schedule availability or put a job on the calendar. Try "How far out on tile?" or "Schedule a new job."',
      timestamp: new Date(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const schedulingStateRef = useRef<{
    collected: Record<string, unknown>;
    asking_for?: string;
  } | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const payload: Record<string, unknown> = { message: text };
      if (schedulingStateRef.current) {
        payload.scheduling_state = schedulingStateRef.current;
      }

      const { data, error } = await supabase.functions.invoke(
        "production-schedule-ai",
        { body: payload }
      );

      if (error) throw error;

      const responseAction = data?.action as ScheduleAction | undefined;

      if (responseAction?.type === "collect") {
        schedulingStateRef.current = {
          collected: responseAction.collected || {},
          asking_for: responseAction.asking_for,
        };
      } else if (responseAction?.type === "confirm" || responseAction?.type === "scheduled") {
        schedulingStateRef.current = null;
      } else if (!responseAction) {
        schedulingStateRef.current = null;
      }

      if (responseAction?.type === "scheduled") {
        queryClient.invalidateQueries({ queryKey: ["production-calendar-events"] });
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.reply || "Sorry, I couldn't process that request.",
        timestamp: new Date(),
        action: responseAction,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (_err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Something went wrong reaching the schedule assistant. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const confirmSchedule = useCallback(async (event: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "production-schedule-ai",
        { body: { action: "confirm_schedule", event } }
      );

      if (error) throw error;

      const responseAction = data?.action as ScheduleAction | undefined;
      schedulingStateRef.current = null;

      if (responseAction?.type === "scheduled") {
        queryClient.invalidateQueries({ queryKey: ["production-calendar-events"] });
      }

      const assistantMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data?.reply || "The job has been scheduled.",
        timestamp: new Date(),
        action: responseAction,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (_err) {
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Something went wrong saving the job. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  }, [queryClient]);

  const clearChat = useCallback(() => {
    schedulingStateRef.current = null;
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          'I can check schedule availability or put a job on the calendar. Try "How far out on tile?" or "Schedule a new job."',
        timestamp: new Date(),
      },
    ]);
  }, []);

  return { messages, isLoading, sendMessage, confirmSchedule, clearChat };
}
