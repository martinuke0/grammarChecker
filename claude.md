# Grammar Checker Web App - Implementation Plan

## Overview
Build a modern, chat-like grammar checker web app using Next.js 14+, shadcn/ui, and hybrid grammar checking (LLM + LanguageTool). Users can choose between free (OpenRouter/LanguageTool) or paid (OpenAI) options with real-time checking as they type.

---

## Part 1: Application Development

### Tech Stack
- **Framework**: Next.js 14+ (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS (ChatGPT/Grok-style interface)
- **State**: Zustand + React Context
- **Grammar Engines**:
  - `languagetool-js` (free, browser-based)
  - OpenAI API (paid, gpt-4o-mini)
  - OpenRouter API (free tier: meta-llama/llama-3.1-8b-instruct:free)
- **Caching**: Vercel KV (Upstash Redis)
- **Analytics**: Anonymous session tracking via UUID

### Project Structure
```
/Users/user/Downloads/grammarchecker/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout with providers
│   │   ├── page.tsx                      # Main grammar checker page
│   │   ├── globals.css                   # Tailwind + global styles
│   │   └── api/
│   │       ├── grammar-check/route.ts    # Main grammar API endpoint
│   │       └── analytics/route.ts        # Session tracking endpoint
│   │
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── popover.tsx
│   │   │   └── tooltip.tsx
│   │   │
│   │   └── grammar-checker/
│   │       ├── editor.tsx                # Main text editor
│   │       ├── editor-toolbar.tsx        # Provider selector
│   │       ├── highlighted-text.tsx      # Text with error highlights
│   │       └── error-popover.tsx         # Error details & suggestions
│   │
│   ├── lib/
│   │   ├── grammar/
│   │   │   ├── types.ts                  # Shared type definitions
│   │   │   ├── languagetool.ts           # LanguageTool integration
│   │   │   ├── openai.ts                 # OpenAI API integration
│   │   │   ├── openrouter.ts             # OpenRouter integration
│   │   │   └── cache.ts                  # Vercel KV caching
│   │   │
│   │   └── hooks/
│   │       ├── use-grammar-check.ts      # Main grammar checking hook
│   │       ├── use-debounce.ts           # Debouncing (800ms)
│   │       └── use-session.ts            # Session ID management
│   │
│   ├── store/
│   │   └── grammar-store.ts              # Zustand store (provider selection, settings)
│   │
│   └── types/
│       └── grammar.ts                    # Core type definitions
│
├── .env.local                            # Environment variables
├── next.config.js                        # Next.js configuration
├── tailwind.config.ts                    # Tailwind + shadcn config
├── components.json                       # shadcn/ui configuration
└── package.json
```

### Implementation Steps

#### Step 1: Project Setup (Foundation)
1. Initialize Next.js 14+ with TypeScript and App Router
2. Install dependencies:
   ```bash
   npx create-next-app@latest grammarchecker --typescript --tailwind --app
   npx shadcn-ui@latest init
   npm install zustand languagetool-js openai uuid @vercel/kv
   npm install lucide-react class-variance-authority clsx tailwind-merge
   ```
3. Configure shadcn/ui components: `button`, `card`, `select`, `badge`, `popover`, `tooltip`
4. Set up `.env.local` with placeholder variables

#### Step 2: Core Type Definitions
Create `/src/types/grammar.ts` with:
- `GrammarProvider` type: `'languagetool' | 'openai' | 'openrouter'`
- `GrammarError` interface: message, offset, length, replacements[], rule details
- `GrammarCheckRequest` and `GrammarCheckResponse` interfaces

#### Step 3: Grammar Checking Integrations
Implement three providers in `/src/lib/grammar/`:

**3.1 LanguageTool** (`languagetool.ts`):
- Use `languagetool-js` library
- Normalize results to `GrammarError[]` format
- Handle `en-US` language by default

**3.2 OpenAI** (`openai.ts`):
- Use `gpt-4o-mini` model (cost-effective)
- Structured JSON prompt for consistent error format
- Temperature 0.3 for consistency
- Parse and normalize to `GrammarError[]`

**3.3 OpenRouter** (`openrouter.ts`):
- Use free tier: `meta-llama/llama-3.1-8b-instruct:free`
- Similar prompt structure as OpenAI
- Fallback to LanguageTool on failure

#### Step 4: API Route - Grammar Check Endpoint
Create `/src/app/api/grammar-check/route.ts`:
- Accept POST with `{ text, provider, sessionId, language }`
- Validate text length (max 10,000 chars)
- Generate cache key: `${provider}:${language}:${hash(text)}`
- Check Vercel KV cache first (24-hour TTL)
- Route to appropriate provider
- Cache successful results
- Track usage via analytics endpoint
- Return `{ errors, metadata }` with processing time

#### Step 5: Session Management & Analytics
**5.1 Session Hook** (`/src/lib/hooks/use-session.ts`):
- Generate UUID on first visit
- Store in localStorage as `grammar-checker-session-id`
- Provide session ID to all API calls

**5.2 Analytics Endpoint** (`/src/app/api/analytics/route.ts`):
- Accept `{ sessionId, provider, cached, timestamp }`
- Store events in Vercel KV
- Increment provider usage counters
- Track unique sessions (for usage metrics)

#### Step 6: Real-Time Checking with Debouncing
**6.1 Debounce Hook** (`/src/lib/hooks/use-debounce.ts`):
- Delay: 800ms (balance between responsiveness and API calls)
- Return debounced value after delay

**6.2 Grammar Check Hook** (`/src/lib/hooks/use-grammar-check.ts`):
- Accept `text`, `provider`, `enabled` flag
- Debounce text input (800ms)
- Fetch from `/api/grammar-check` on debounced change
- Return `{ errors, isLoading }`
- Skip check if text < 3 characters

#### Step 7: Zustand Store
Create `/src/store/grammar-store.ts`:
- Persist to localStorage
- State: `provider`, `language`, `autoCheck`, `debounceDelay`
- Actions: `setProvider`, `setLanguage`, etc.

#### Step 8: UI Components

**8.1 Main Editor** (`/src/components/grammar-checker/editor.tsx`):
- Text input state
- Provider selection state (default: `languagetool`)
- Use `useGrammarCheck` hook
- Render toolbar + highlighted text area
- Minimum height: 500px, ChatGPT-style container

**8.2 Editor Toolbar** (`/src/components/grammar-checker/editor-toolbar.tsx`):
- Provider selector (shadcn Select component)
- Error count badge
- Loading indicator
- Settings icon for preferences

**8.3 Highlighted Text** (`/src/components/grammar-checker/highlighted-text.tsx`):
- `contentEditable` div for text input
- Split text into segments based on error offsets
- Wrap errors in `<mark>` with unique error IDs
- Color-code by error type (red for grammar/spelling, yellow for style)
- Handle text changes and update parent state

**8.4 Error Popover** (`/src/components/grammar-checker/error-popover.tsx`):
- Radix Popover component
- Triggered by clicking highlighted error
- Display:
  - Error type badge (grammar/spelling/style)
  - Error message
  - Rule explanation
  - List of suggestions (max 5)
  - Apply button for each suggestion
- On apply: replace error text with suggestion

#### Step 9: Caching Layer
Create `/src/lib/grammar/cache.ts`:
- `getCachedResult(key)`: Fetch from Vercel KV
- `setCachedResult(key, errors, ttl)`: Store with 24-hour expiry
- Handle errors gracefully (return null on failure)

#### Step 10: Main Page
Create `/src/app/page.tsx`:
- Full-height ChatGPT-style layout
- Centered content (max-width: 4xl)
- Dark mode support
- Header with app name and settings
- Footer with credits/links

---

## Part 2: Vercel Deployment

### Prerequisites
1. GitHub repository for the project
2. Vercel account (free tier works)
3. API keys ready (OpenAI and/or OpenRouter - optional)
4. Vercel KV database set up

### Deployment Steps

#### Step 1: Prepare Repository
```bash
# Initialize git (if not already done)
cd /Users/user/Downloads/grammarchecker
git init
git add .
git commit -m "Initial commit: Grammar checker app"

# Create GitHub repo and push
gh repo create grammarchecker --public --source=. --remote=origin --push
# OR manually create on GitHub and:
git remote add origin https://github.com/YOUR_USERNAME/grammarchecker.git
git branch -M main
git push -u origin main
```

#### Step 2: Set Up Vercel KV Database
1. Go to Vercel dashboard → Storage → Create Database
2. Select **KV (Redis)** → Create
3. Name it: `grammar-checker-kv`
4. Copy environment variables (will be auto-added to project)

#### Step 3: Deploy to Vercel
**Option A: Vercel CLI (Recommended)**
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - Project name: grammarchecker
# - Directory: ./
# - Override settings? No

# Deploy to production
vercel --prod
```

**Option B: Vercel Dashboard**
1. Go to https://vercel.com/new
2. Import Git Repository → Select your GitHub repo
3. Configure:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)
4. Click "Deploy"

#### Step 4: Configure Environment Variables
In Vercel Dashboard → Project Settings → Environment Variables, add:

```env
# OpenAI (Optional - for paid grammar checking)
OPENAI_API_KEY=sk-proj-...

# OpenRouter (Optional - for free LLM models)
OPENROUTER_API_KEY=sk-or-v1-...

# App Configuration
NEXT_PUBLIC_APP_URL=https://grammarchecker.vercel.app
NEXT_PUBLIC_APP_NAME=Grammar Checker
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Vercel KV (auto-populated when you link KV database)
KV_URL=redis://...
KV_REST_API_URL=https://...
KV_REST_API_TOKEN=...
KV_REST_API_READ_ONLY_TOKEN=...
```

**Note**: KV variables are automatically added when you connect Vercel KV to your project.

#### Step 5: Link Vercel KV to Project
```bash
# Via CLI (after initial deployment)
vercel link
vercel env pull .env.local  # Download KV env vars

# Or via Dashboard:
# Project Settings → Storage → Connect Store → Select grammar-checker-kv
```

#### Step 6: Verify Deployment
1. Visit deployment URL (e.g., `https://grammarchecker.vercel.app`)
2. Test all three providers:
   - LanguageTool (should work without API keys)
   - OpenAI (if API key provided)
   - OpenRouter (if API key provided)
3. Check real-time checking works (type and wait 800ms)
4. Verify caching (check same text twice, second should be instant)
5. Test on mobile devices

#### Step 7: Configure Custom Domain (Optional)
1. Vercel Dashboard → Project → Settings → Domains
2. Add custom domain: `grammarcheck.yourdomain.com`
3. Follow DNS configuration instructions
4. Update `NEXT_PUBLIC_APP_URL` environment variable

#### Step 8: Set Up Monitoring
1. **Vercel Analytics**: Automatically enabled on Pro plan
2. **Log Monitoring**: Check Vercel Dashboard → Logs for errors
3. **Usage Monitoring**:
   - OpenAI: Check usage at platform.openai.com/usage
   - OpenRouter: Check dashboard at openrouter.ai
   - Vercel KV: Monitor Redis usage in Vercel dashboard

#### Step 9: Performance Optimization
1. **Enable Edge Runtime** for LLM routes:
   - Already configured in API route: `export const runtime = 'edge'`
2. **Caching Headers**:
   - Static assets cached automatically by Vercel CDN
3. **Bundle Size Check**:
   ```bash
   npm run build
   # Check output for bundle sizes
   # Initial load should be <300KB
   ```

#### Step 10: Continuous Deployment
- Vercel auto-deploys on every `git push` to main branch
- Preview deployments for all pull requests
- Rollback via Vercel Dashboard → Deployments → "Redeploy"

### Deployment Checklist
- [ ] GitHub repository created and pushed
- [ ] Vercel project created and linked
- [ ] Vercel KV database created and connected
- [ ] Environment variables configured (API keys)
- [ ] Initial deployment successful
- [ ] All grammar providers tested
- [ ] Real-time checking works (800ms debounce)
- [ ] Caching verified (check same text twice)
- [ ] Mobile responsive design tested
- [ ] Dark mode works
- [ ] Analytics tracking functional
- [ ] Custom domain configured (optional)
- [ ] Monitoring set up (logs, usage)

### Post-Deployment Maintenance

**Update Dependencies**:
```bash
npm outdated
npm update
git commit -am "Update dependencies"
git push  # Auto-deploys
```

**Monitor Costs**:
- OpenAI: Set usage limits in OpenAI dashboard
- Vercel KV: Free tier = 256MB storage, 10k requests/day
- Vercel Hosting: Free tier = 100GB bandwidth/month

**Scale Considerations**:
- **High Traffic**: Upgrade Vercel KV to paid tier for more requests
- **API Costs**: Implement rate limiting per session
- **Caching**: Increase TTL to 7 days to reduce API calls

---

## Critical Files to Implement (Priority Order)

### Must-Have (Phase 1):
1. `/src/types/grammar.ts` - Type definitions (foundation)
2. `/src/lib/grammar/languagetool.ts` - Free grammar checking
3. `/src/app/api/grammar-check/route.ts` - Core API endpoint
4. `/src/lib/hooks/use-grammar-check.ts` - React hook for real-time checking
5. `/src/components/grammar-checker/highlighted-text.tsx` - Inline error display

### Nice-to-Have (Phase 2):
6. `/src/lib/grammar/openai.ts` - Paid LLM option
7. `/src/lib/grammar/openrouter.ts` - Free LLM option
8. `/src/lib/grammar/cache.ts` - Performance optimization
9. `/src/app/api/analytics/route.ts` - Usage tracking
10. `/src/store/grammar-store.ts` - User preferences

### Polish (Phase 3):
11. Error popover with explanations
12. Provider selector UI
13. Dark mode support
14. Mobile responsive design
15. Loading states and skeletons

---

## Key Technical Decisions

1. **Hybrid Approach**: Support 3 providers (LanguageTool free, OpenRouter free, OpenAI paid)
2. **Default to Free**: LanguageTool as default to avoid API costs
3. **Real-Time**: 800ms debounce balance between UX and API costs
4. **Caching**: 24-hour TTL in Vercel KV to reduce duplicate checks
5. **Anonymous**: Session IDs without auth for privacy and simplicity
6. **Edge Runtime**: For LLM routes only (LanguageTool requires Node.js)
7. **Character Limit**: 10,000 chars per request to prevent abuse

---

## Expected Timeline

- **Setup & Foundation**: 1-2 hours
- **Core Grammar Features**: 2-3 hours
- **UI Components**: 2-3 hours
- **API Integration & Testing**: 1-2 hours
- **Vercel Deployment**: 30 minutes
- **Total**: ~6-10 hours for MVP

---

## Success Metrics

- All 3 providers work (LanguageTool, OpenAI, OpenRouter)
- Real-time checking with 800ms debounce
- Inline corrections clickable and apply instantly
- Error explanations show grammar rules
- Caching reduces API calls by 60%+
- Session tracking works for analytics
- Mobile responsive (works on phone/tablet)
- Deployed to Vercel with custom domain
- OpenAI API costs <$5/month for 1000 checks
