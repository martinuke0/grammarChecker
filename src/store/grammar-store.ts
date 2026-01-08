'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GrammarStoreState } from '@/types/grammar';

/**
 * Zustand store for grammar checker state
 * Persists to localStorage
 */
export const useGrammarStore = create<GrammarStoreState>()(
  persist(
    (set) => ({
      // State
      provider: 'openrouter', // Default to OpenRouter
      language: 'en-US',
      autoCheck: true,
      autoCorrect: false, // Default to manual correction
      debounceDelay: 800,

      // Actions
      setProvider: (provider) => set({ provider }),
      setLanguage: (language) => set({ language }),
      setAutoCheck: (autoCheck) => set({ autoCheck }),
      setAutoCorrect: (autoCorrect) => set({ autoCorrect }),
      setDebounceDelay: (debounceDelay) => set({ debounceDelay }),
    }),
    {
      name: 'grammar-checker-settings',
    }
  )
);
