'use client';

import { useRef, useEffect } from 'react';
import { GrammarError } from '@/types/grammar';
import { cn } from '@/lib/utils';

interface HighlightedTextProps {
  text: string;
  errors: GrammarError[];
  onTextChange: (text: string) => void;
  onErrorClick: (error: GrammarError, element: HTMLElement) => void;
  className?: string;
}

/**
 * Get error color based on error type
 */
function getErrorColor(type: string): string {
  switch (type) {
    case 'grammar':
    case 'spelling':
      return 'bg-red-200 dark:bg-red-900/30 border-b-2 border-red-500';
    case 'style':
      return 'bg-yellow-200 dark:bg-yellow-900/30 border-b-2 border-yellow-500';
    case 'punctuation':
      return 'bg-blue-200 dark:bg-blue-900/30 border-b-2 border-blue-500';
    default:
      return 'bg-gray-200 dark:bg-gray-700/30 border-b-2 border-gray-500';
  }
}

/**
 * Text editor with inline error highlighting - ChatGPT style
 */
export function HighlightedText({
  text,
  errors,
  onTextChange,
  onErrorClick,
  className,
}: HighlightedTextProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-grow textarea height
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height to auto to get the correct scrollHeight
    textarea.style.height = 'auto';

    // Set height based on content, with minimum height
    const minHeight = 200;
    const newHeight = Math.max(minHeight, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;

    // Sync overlay height
    if (overlayRef.current) {
      overlayRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  // Render text with error highlights for the overlay
  const renderHighlightedText = () => {
    if (errors.length === 0 || text.length === 0) {
      return <span>{text || ' '}</span>;
    }

    // Sort errors by offset to process them in order
    const sortedErrors = [...errors].sort((a, b) => a.offset - b.offset);

    const segments: React.ReactNode[] = [];
    let lastIndex = 0;

    sortedErrors.forEach((error, index) => {
      const { offset, length } = error;

      // Add text before error
      if (offset > lastIndex) {
        segments.push(
          <span key={`text-${index}`}>
            {text.substring(lastIndex, offset)}
          </span>
        );
      }

      // Add error highlight
      const errorText = text.substring(offset, offset + length);
      segments.push(
        <mark
          key={`error-${index}`}
          className={cn(
            'cursor-pointer hover:opacity-80 transition-opacity',
            getErrorColor(error.type)
          )}
          onClick={(e) => {
            e.preventDefault();
            onErrorClick(error, e.currentTarget);
          }}
          data-error-id={index}
        >
          {errorText}
        </mark>
      );

      lastIndex = offset + length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      segments.push(
        <span key="text-end">
          {text.substring(lastIndex)}
        </span>
      );
    }

    return segments;
  };

  // Handle text input
  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onTextChange(e.target.value);
  };

  const baseStyles = 'w-full px-6 py-5 text-base leading-relaxed whitespace-pre-wrap break-words';

  return (
    <div className="relative w-full">
      {/* Actual textarea for input */}
      <textarea
        ref={textareaRef}
        value={text}
        onChange={handleInput}
        placeholder="Start typing or paste your text here..."
        className={cn(
          baseStyles,
          'relative bg-transparent resize-none overflow-hidden',
          'focus:outline-none',
          'caret-foreground',
          'min-h-[200px]',
          'placeholder:text-muted-foreground/50',
          errors.length > 0 ? 'text-transparent' : 'text-foreground',
          className
        )}
        spellCheck={false}
        style={{ height: 'auto' }}
      />

      {/* Highlight overlay - positioned on top of textarea, only interactive for errors */}
      {errors.length > 0 && (
        <div
          ref={overlayRef}
          className={cn(
            baseStyles,
            'absolute inset-0 pointer-events-none overflow-hidden',
            className
          )}
          aria-hidden="true"
        >
          {/* Make only the mark elements clickable */}
          <div className="[&>mark]:pointer-events-auto">
            {renderHighlightedText()}
          </div>
        </div>
      )}
    </div>
  );
}
