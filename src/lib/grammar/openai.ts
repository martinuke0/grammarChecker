import OpenAI from 'openai';
import { GrammarError, ErrorType } from '@/types/grammar';

// OpenAI response format
interface OpenAIGrammarError {
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

interface OpenAIGrammarResponse {
  errors: OpenAIGrammarError[];
}

/**
 * Normalize OpenAI response to our GrammarError format
 */
function normalizeOpenAIError(error: OpenAIGrammarError): GrammarError {
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
 * Check text using OpenAI API
 */
export async function checkWithOpenAI(
  text: string,
  language: string = 'en-US'
): Promise<GrammarError[]> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  try {
    const openai = new OpenAI({ apiKey });

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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0]?.message?.content;

    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const response: OpenAIGrammarResponse = JSON.parse(content);

    // Normalize errors to our format
    return (response.errors || []).map(normalizeOpenAIError);
  } catch (error) {
    console.error('OpenAI error:', error);
    throw new Error(`Failed to check text with OpenAI: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
