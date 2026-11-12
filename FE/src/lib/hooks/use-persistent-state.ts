"use client";

import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export function usePersistentState<T>(key: string, initialValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState(initialValue);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) setValue(JSON.parse(saved) as T);
    } catch (error) {
      console.error(`Unable to load demo data for "${key}" from local storage.`, error);
    } finally {
      setHydrated(true);
    }
  }, [key]);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Unable to save demo data for "${key}" to local storage.`, error);
    }
  }, [hydrated, key, value]);

  return [value, setValue];
}
