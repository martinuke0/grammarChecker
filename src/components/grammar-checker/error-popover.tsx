'use client';

import { useEffect, useState } from 'react';
import { GrammarError } from '@/types/grammar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Check, Sparkles, X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface ErrorPopoverProps {
  error: GrammarError;
  onApplySuggestion: (suggestion: string) => void;
  onAutoCorrect?: () => void;
  onClose: () => void;
  triggerElement: HTMLElement;
}

/**
 * Get badge variant based on error type
 */
function getBadgeVariant(type: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (type) {
    case 'grammar':
    case 'spelling':
      return 'destructive';
    case 'style':
      return 'secondary';
    case 'punctuation':
      return 'default';
    default:
      return 'outline';
  }
}

/**
 * Popover component to display error details and suggestions
 * Positioned to not block the text area
 */
export function ErrorPopover({
  error,
  onApplySuggestion,
  onAutoCorrect,
  onClose,
  triggerElement,
}: ErrorPopoverProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (!triggerElement) return;

    const updatePosition = () => {
      // Calculate position based on trigger element
      const rect = triggerElement.getBoundingClientRect();
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

      const popoverWidth = 320; // w-80 (more compact)
      const popoverHeight = 350; // Reduced height
      const spacing = 16;

      let top = rect.top + scrollTop;
      let left = rect.right + scrollLeft + spacing;
      let positioned = false;

      // Try 1: Position to the right of the error
      if (left + popoverWidth <= window.innerWidth) {
        positioned = true;
      }

      // Try 2: Position to the left of the error
      if (!positioned) {
        left = rect.left + scrollLeft - popoverWidth - spacing;
        if (left >= 0) {
          positioned = true;
        }
      }

      // Try 3: Position below the error (centered if possible)
      if (!positioned) {
        top = rect.bottom + scrollTop + spacing;
        left = rect.left + scrollLeft + (rect.width / 2) - (popoverWidth / 2);

        // Ensure it stays within viewport horizontally
        if (left < spacing) {
          left = spacing;
        } else if (left + popoverWidth > window.innerWidth - spacing) {
          left = window.innerWidth - popoverWidth - spacing;
        }

        // Check if there's enough space below
        if (top + popoverHeight <= window.innerHeight + scrollTop) {
          positioned = true;
        } else {
          // Try 4: Position above the error
          top = rect.top + scrollTop - popoverHeight - spacing;
          if (top >= spacing) {
            positioned = true;
          }
        }
      }

      // Fallback: If still not positioned, force it below
      if (!positioned) {
        top = rect.bottom + scrollTop + spacing;
        left = Math.max(spacing, Math.min(
          rect.left + scrollLeft,
          window.innerWidth - popoverWidth - spacing
        ));
      }

      // Final boundary checks
      top = Math.max(spacing, Math.min(top, window.innerHeight + scrollTop - popoverHeight - spacing));
      left = Math.max(spacing, Math.min(left, window.innerWidth - popoverWidth - spacing));

      setPosition({ top, left });
    };

    updatePosition();

    // Update position on scroll or resize
    window.addEventListener('scroll', updatePosition, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [triggerElement]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return createPortal(
    <>
      {/* Transparent backdrop - click to close but doesn't block view */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Popover */}
      <Card
        className="fixed z-50 w-80 p-3 shadow-xl border-2 max-h-[450px] overflow-y-auto"
        style={{
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Header with close button */}
          <div className="flex items-start justify-between">
            <Badge variant={getBadgeVariant(error.type)}>
              {error.type.toUpperCase()}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 -mt-1 -mr-1"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Error Message */}
          <div>
            <p className="font-medium text-sm leading-snug">
              {error.shortMessage || error.message}
            </p>
          </div>

          {/* Auto-correct button */}
          {error.replacements.length > 0 && onAutoCorrect && (
            <Button
              variant="default"
              size="sm"
              className="w-full h-8"
              onClick={onAutoCorrect}
            >
              <Sparkles className="h-3.5 w-3.5 mr-2" />
              <span className="truncate text-sm">Auto-correct: "{error.replacements[0]}"</span>
            </Button>
          )}

          {/* Suggestions */}
          {error.replacements.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {error.replacements.length > 1 ? 'Other suggestions:' : 'Suggestion:'}
              </p>
              <div className="space-y-1">
                {error.replacements.slice(0, 3).map((replacement, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    className="w-full justify-between text-left h-8"
                    onClick={() => onApplySuggestion(replacement)}
                  >
                    <span className="truncate text-sm">{replacement}</span>
                    <Check className="h-3.5 w-3.5 ml-2 flex-shrink-0" />
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Hint */}
          <div className="text-xs text-muted-foreground text-center pt-1 border-t">
            ESC to dismiss
          </div>
        </div>
      </Card>
    </>,
    document.body
  );
}
