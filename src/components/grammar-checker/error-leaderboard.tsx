'use client';

import { GrammarError } from '@/types/grammar';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle } from 'lucide-react';

interface ErrorLeaderboardProps {
  errors: GrammarError[];
  totalChecks: number;
  fixedErrors: number;
}

/**
 * Inline statistics display - ChatGPT style
 */
export function ErrorLeaderboard({
  errors,
  totalChecks,
  fixedErrors,
}: ErrorLeaderboardProps) {
  // Count errors by type
  const errorsByType = errors.reduce((acc, error) => {
    acc[error.type] = (acc[error.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Sort by count
  const sortedTypes = Object.entries(errorsByType).sort((a, b) => b[1] - a[1]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
      {/* Total Errors */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
        <AlertCircle className="h-4 w-4 text-destructive" />
        <span className="text-muted-foreground">Issues:</span>
        <Badge variant="destructive" className="h-5">
          {errors.length}
        </Badge>
      </div>

      {/* Fixed Errors */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span className="text-muted-foreground">Fixed:</span>
        <Badge className="h-5 bg-green-600 dark:bg-green-700">
          {fixedErrors}
        </Badge>
      </div>

      {/* Remaining */}
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
        <span className="text-muted-foreground">Remaining:</span>
        <span className="font-medium">{Math.max(0, errors.length - fixedErrors)}</span>
      </div>

      {/* Error Types Breakdown */}
      {sortedTypes.length > 0 && (
        <>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-3">
            {sortedTypes.map(([type, count]) => (
              <div key={type} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50">
                <div
                  className={`w-2 h-2 rounded-full ${
                    type === 'grammar' || type === 'spelling'
                      ? 'bg-red-500'
                      : type === 'style'
                      ? 'bg-yellow-500'
                      : type === 'punctuation'
                      ? 'bg-blue-500'
                      : 'bg-gray-500'
                  }`}
                />
                <span className="text-xs capitalize text-muted-foreground">{type}:</span>
                <span className="text-xs font-medium">{count}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
