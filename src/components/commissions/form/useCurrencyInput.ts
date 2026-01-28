import { useState, useCallback } from "react";
import { parseCurrencyInput, formatCurrency } from "@/lib/commissionDocumentCalculations";

/**
 * Custom hook for handling currency input with raw-string editing state.
 * Prevents caret jumps and focus loss during input.
 */
export function useCurrencyInput() {
  const [editingField, setEditingField] = useState<string | null>(null);
  const [rawValue, setRawValue] = useState<string>("");

  const handleFocus = useCallback((field: string, currentValue: number) => {
    setEditingField(field);
    setRawValue(currentValue ? String(currentValue) : "");
  }, []);

  const handleChange = useCallback((value: string) => {
    setRawValue(value);
  }, []);

  const commitValue = useCallback((field: string, onCommit: (field: string, value: number) => void) => {
    const numValue = parseCurrencyInput(rawValue);
    onCommit(field, numValue);
    setEditingField(null);
    setRawValue("");
  }, [rawValue]);

  const getDisplayValue = useCallback((field: string, numericValue: number) => {
    if (editingField === field) return rawValue;
    return numericValue ? formatCurrency(numericValue) : "";
  }, [editingField, rawValue]);

  return {
    editingField,
    handleFocus,
    handleChange,
    commitValue,
    getDisplayValue,
  };
}
