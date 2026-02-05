import { useEffect, useRef, useState, useCallback } from "react";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  interval?: number; // in milliseconds, default 30000 (30 seconds)
  enabled?: boolean;
  debounceMs?: number; // debounce after changes, default 2000 (2 seconds)
}

export function useAutoSave<T>({
  data,
  onSave,
  interval = 30000,
  enabled = true,
  debounceMs = 2000,
}: UseAutoSaveOptions<T>) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const dataRef = useRef(data);
  const lastSavedDataRef = useRef<string>(JSON.stringify(data));
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update ref when data changes
  useEffect(() => {
    dataRef.current = data;
    const currentDataStr = JSON.stringify(data);
    if (currentDataStr !== lastSavedDataRef.current) {
      setHasUnsavedChanges(true);
    }
  }, [data]);

  const performSave = useCallback(async () => {
    if (!enabled || isSaving) return;

    const currentDataStr = JSON.stringify(dataRef.current);
    if (currentDataStr === lastSavedDataRef.current) {
      return; // No changes to save
    }

    setIsSaving(true);
    try {
      await onSave(dataRef.current);
      lastSavedDataRef.current = currentDataStr;
      setLastSavedAt(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [enabled, isSaving, onSave]);

  // Debounced save after changes
  useEffect(() => {
    if (!enabled || !hasUnsavedChanges) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, enabled, hasUnsavedChanges, debounceMs, performSave]);

  // Periodic interval save
  useEffect(() => {
    if (!enabled) return;

    intervalTimerRef.current = setInterval(() => {
      performSave();
    }, interval);

    return () => {
      if (intervalTimerRef.current) {
        clearInterval(intervalTimerRef.current);
      }
    };
  }, [enabled, interval, performSave]);

  // Save on unmount if there are unsaved changes
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && enabled) {
        performSave();
      }
    };
  }, []);

  const manualSave = useCallback(async () => {
    await performSave();
  }, [performSave]);

  return {
    lastSavedAt,
    isSaving,
    hasUnsavedChanges,
    manualSave,
  };
}
