'use client';

import { GrammarProvider } from '@/types/grammar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Sparkles } from 'lucide-react';

interface EditorToolbarProps {
  provider: GrammarProvider;
  onProviderChange: (provider: GrammarProvider) => void;
  errorCount: number;
  isLoading: boolean;
  isCached?: boolean;
  autoCorrect?: boolean;
  onAutoCorrectChange?: (enabled: boolean) => void;
}

/**
 * Minimal toolbar for provider selection
 */
export function EditorToolbar({
  provider,
  onProviderChange,
  errorCount,
  isLoading,
  isCached,
  autoCorrect,
  onAutoCorrectChange,
}: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-full border bg-muted/30">
      {/* Provider Selector */}
      <Select value={provider} onValueChange={(value) => onProviderChange(value as GrammarProvider)}>
        <SelectTrigger className="w-[130px] h-8 border-0 bg-transparent shrink-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="languagetool">
            <div className="flex items-center gap-2">
              <span>LanguageTool</span>
              <Badge variant="secondary" className="text-xs">
                Free
              </Badge>
            </div>
          </SelectItem>
          <SelectItem value="openrouter">
            <div className="flex items-center gap-2">
              <span>OpenRouter</span>
              <Badge variant="secondary" className="text-xs">
                Free
              </Badge>
            </div>
          </SelectItem>
          {/* <SelectItem value="openai">
            <div className="flex items-center gap-2">
              <span>OpenAI</span>
              <Badge variant="default" className="text-xs">
                Paid
              </Badge>
            </div>
          </SelectItem> */}
        </SelectContent>
      </Select>

      <div className="h-4 w-px bg-border" />

      {/* Auto-correct Toggle */}
      {onAutoCorrectChange && (
        <>
          <div className="flex items-center gap-1.5 shrink-0">
            <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground whitespace-nowrap">Auto-fix</span>
            <Switch
              checked={autoCorrect}
              onCheckedChange={onAutoCorrectChange}
              className="scale-75"
            />
          </div>
          <div className="h-4 w-px bg-border shrink-0" />
        </>
      )}

      {/* Status */}
      <div className="flex items-center gap-2 shrink-0">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span className="whitespace-nowrap">Checking...</span>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground whitespace-nowrap">Issues:</span>
            <Badge
              variant={errorCount > 0 ? 'destructive' : 'secondary'}
              className="h-5 min-w-[1.5rem] text-xs"
            >
              {errorCount}
            </Badge>
            {isCached && (
              <Badge variant="outline" className="h-5 text-xs whitespace-nowrap">
                Cached
              </Badge>
            )}
          </>
        )}
      </div>
    </div>
  );
}
