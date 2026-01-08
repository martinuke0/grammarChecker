import { GrammarError, ErrorType } from '@/types/grammar';
import { checkWithLanguageTool } from './languagetool';

// OpenRouter response format
interface OpenRouterGrammarError {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: string[];
  ruleId: string;
  ruleDescription: string;
  category: string;
  type: ErrorType;
}

interface OpenRouterGrammarResponse {
  errors: OpenRouterGrammarError[];
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * Normalize OpenRouter response to our GrammarError format
 */
function normalizeOpenRouterError(error: OpenRouterGrammarError): GrammarError {
  return {
    message: error.message,
    shortMessage: error.shortMessage,
    offset: error.offset,
    length: error.length,
    replacements: error.replacements.slice(0, 5), // Limit to 5 suggestions
    rule: {
      id: error.ruleId,
      description: error.ruleDescription,
      category: error.category,
    },
    type: error.type,
  };
}

/**
 * Check text using OpenRouter API (free tier)
 * Falls back to LanguageTool if unavailable
 */
export async function checkWithOpenRouter(
  text: string,
  language: string = 'en-US'
): Promise<GrammarError[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  // Silently fall back to LanguageTool if no API key
  if (!apiKey) {
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ OpenRouter API key not configured, using LanguageTool');
    }
    return checkWithLanguageTool(text, language);
  }

  try {
    const systemPrompt = `You are a professional grammar and style checker. Analyze the provided text and identify all grammar, spelling, punctuation, and style errors.

For each error, provide:
1. A clear error message explaining the issue
2. The exact character offset where the error starts (0-indexed)
3. The length of the error in characters
4. Up to 5 suggested replacements
5. A rule ID (e.g., "GRAMMAR_001")
6. A brief rule description
7. The category (e.g., "Grammar", "Spelling", "Style", "Punctuation")
8. The error type: "grammar", "spelling", "style", "punctuation", or "other"

Return the results as a JSON object with an "errors" array containing all identified issues.`;

    const userPrompt = `Check this ${language} text for errors:\n\n${text}`;

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'Grammar Checker',
      },
      body: JSON.stringify({
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);

      // Only log detailed errors in development
      if (process.env.NODE_ENV === 'development') {
        console.warn(`OpenRouter API returned ${response.status}, falling back to LanguageTool`);
        console.warn('Response:', errorText);
      }

      throw new Error('OpenRouter unavailable');
    }

    const data: OpenRouterResponse = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenRouter');
    }

    // Try to parse as JSON
    try {
      const grammarResponse: OpenRouterGrammarResponse = JSON.parse(content);

      // Normalize errors to our format
      if (grammarResponse.errors && Array.isArray(grammarResponse.errors)) {
        return grammarResponse.errors.map(normalizeOpenRouterError);
      }
    } catch (parseError) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to parse OpenRouter response as grammar errors');
      }
      throw parseError;
    }

    // If no errors in response, return empty array
    return [];
  } catch (error) {
    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️ OpenRouter not available, using LanguageTool instead');
    }

    // Silently fall back to LanguageTool on error
    return checkWithLanguageTool(text, language);
  }
}
