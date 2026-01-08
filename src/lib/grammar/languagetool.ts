import { GrammarError, ErrorType } from '@/types/grammar';

// LanguageTool API response types
interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements: Array<{ value: string }>;
  rule: {
    id: string;
    description: string;
    category: {
      id: string;
      name: string;
    };
  };
  context: {
    text: string;
    offset: number;
    length: number;
  };
  type?: {
    typeName: string;
  };
}

interface LanguageToolResponse {
  matches: LanguageToolMatch[];
}

/**
 * Common words that should be prioritized in suggestions
 */
const COMMON_WORDS = new Set([
  'hello', 'help', 'here', 'there', 'have', 'has', 'had', 'will', 'would',
  'could', 'should', 'can', 'may', 'might', 'must', 'the', 'be', 'to', 'of',
  'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with',
  'he', 'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they',
  'we', 'say', 'her', 'she', 'or', 'an', 'will', 'my', 'one', 'all', 'would',
  'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get',
  'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just',
  'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some',
  'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come',
  'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because',
  'any', 'these', 'give', 'day', 'most', 'us'
]);

/**
 * Score a suggestion based on context and common usage
 */
function scoreSuggestion(
  suggestion: string,
  originalWord: string,
  contextBefore: string,
  contextAfter: string,
  isStartOfSentence: boolean
): number {
  let score = 0;

  // Convert to lowercase for comparison
  const suggestionLower = suggestion.toLowerCase();
  const originalLower = originalWord.toLowerCase();

  // Higher score for common words
  if (COMMON_WORDS.has(suggestionLower)) {
    score += 10;
  }

  // Bonus for greetings at start of sentence
  if (isStartOfSentence) {
    const greetings = ['hello', 'hi', 'hey', 'dear', 'greetings'];
    if (greetings.includes(suggestionLower)) {
      score += 15;
    }
  }

  // Bonus for maintaining capitalization pattern
  if (originalWord[0] === originalWord[0].toUpperCase() &&
      suggestion[0] === suggestion[0].toUpperCase()) {
    score += 5;
  }

  // Bonus for similar length (likely better match)
  const lengthDiff = Math.abs(suggestion.length - originalWord.length);
  score -= lengthDiff * 0.5;

  // Bonus for Levenshtein distance (edit distance)
  const editDistance = getEditDistance(originalLower, suggestionLower);
  score -= editDistance;

  // Context-aware scoring
  const contextWords = (contextBefore + ' ' + contextAfter).toLowerCase().split(/\s+/);

  // Common phrase patterns
  if (suggestionLower === 'hello' && contextWords.includes('how')) {
    score += 20; // "hello how are you" is very common
  }

  if (suggestionLower === 'help' && (contextWords.includes('need') || contextWords.includes('can'))) {
    score += 10;
  }

  return score;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function getEditDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Reorder suggestions based on context
 */
function smartOrderSuggestions(
  suggestions: string[],
  originalWord: string,
  fullText: string,
  errorOffset: number
): string[] {
  // Get context before and after the error
  const contextBefore = fullText.substring(Math.max(0, errorOffset - 50), errorOffset);
  const contextAfter = fullText.substring(errorOffset + originalWord.length, errorOffset + originalWord.length + 50);

  // Check if at start of sentence
  const isStartOfSentence = errorOffset === 0 || /[.!?]\s*$/.test(contextBefore);

  // Score each suggestion
  const scoredSuggestions = suggestions.map(suggestion => ({
    suggestion,
    score: scoreSuggestion(suggestion, originalWord, contextBefore, contextAfter, isStartOfSentence)
  }));

  // Sort by score (highest first)
  scoredSuggestions.sort((a, b) => b.score - a.score);

  // Return ordered suggestions
  return scoredSuggestions.map(s => s.suggestion);
}

/**
 * Map LanguageTool category to our error type
 */
function mapErrorType(category: string, typeName?: string): ErrorType {
  const categoryLower = category.toLowerCase();
  const typeNameLower = typeName?.toLowerCase() || '';

  if (categoryLower.includes('spell') || typeNameLower.includes('spell')) {
    return 'spelling';
  }
  if (categoryLower.includes('grammar') || typeNameLower.includes('grammar')) {
    return 'grammar';
  }
  if (categoryLower.includes('style') || typeNameLower.includes('style')) {
    return 'style';
  }
  if (categoryLower.includes('punctuation') || typeNameLower.includes('punctuation')) {
    return 'punctuation';
  }
  return 'other';
}

/**
 * Normalize LanguageTool match to our GrammarError format
 */
function normalizeMatch(match: LanguageToolMatch, fullText: string): GrammarError {
  const originalWord = fullText.substring(match.offset, match.offset + match.length);
  const suggestions = match.replacements.map(r => r.value);

  // Smart reorder suggestions based on context
  const orderedSuggestions = smartOrderSuggestions(
    suggestions,
    originalWord,
    fullText,
    match.offset
  );

  return {
    message: match.message,
    shortMessage: match.shortMessage,
    offset: match.offset,
    length: match.length,
    replacements: orderedSuggestions.slice(0, 5), // Limit to 5 suggestions
    rule: {
      id: match.rule.id,
      description: match.rule.description,
      category: match.rule.category.name,
    },
    type: mapErrorType(match.rule.category.id, match.type?.typeName),
    context: match.context,
  };
}

/**
 * Check text using LanguageTool API
 */
export async function checkWithLanguageTool(
  text: string,
  language: string = 'en-US'
): Promise<GrammarError[]> {
  try {
    // Use the public LanguageTool API
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        text,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error(`LanguageTool API error: ${response.status} ${response.statusText}`);
    }

    const data: LanguageToolResponse = await response.json();

    // Normalize matches to our format with smart suggestion ordering
    return data.matches.map(match => normalizeMatch(match, text));
  } catch (error) {
    console.error('LanguageTool error:', error);
    throw new Error(`Failed to check text with LanguageTool: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
