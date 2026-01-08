// Grammar provider types
export type GrammarProvider = 'languagetool' | 'openai' | 'openrouter';

// Error types
export type ErrorType = 'grammar' | 'spelling' | 'style' | 'punctuation' | 'other';

// Grammar error interface
export interface GrammarError {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: string[];
  rule: {
    id: string;
    description: string;
    category: string;
  };
  type: ErrorType;
  context?: {
    text: string;
    offset: number;
    length: number;
  };
}

// Grammar check request
export interface GrammarCheckRequest {
  text: string;
  provider: GrammarProvider;
  sessionId: string;
  language?: string;
}

// Grammar check response
export interface GrammarCheckResponse {
  errors: GrammarError[];
  metadata: {
    provider: GrammarProvider;
    processingTime: number;
    cached: boolean;
    timestamp: number;
    language: string;
  };
}

// Analytics event
export interface AnalyticsEvent {
  sessionId: string;
  provider: GrammarProvider;
  cached: boolean;
  timestamp: number;
  textLength?: number;
  errorCount?: number;
}

// Store state interface
export interface GrammarStoreState {
  provider: GrammarProvider;
  language: string;
  autoCheck: boolean;
  autoCorrect: boolean;
  debounceDelay: number;
  setProvider: (provider: GrammarProvider) => void;
  setLanguage: (language: string) => void;
  setAutoCheck: (autoCheck: boolean) => void;
  setAutoCorrect: (autoCorrect: boolean) => void;
  setDebounceDelay: (delay: number) => void;
}
