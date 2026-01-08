# Grammar Checker Web App

A modern, real-time grammar checker web application built with Next.js 14+, featuring hybrid grammar checking with multiple providers (LanguageTool, OpenAI, OpenRouter).

## Features

- **Real-time Grammar Checking**: Automatic checking with 800ms debounce
- **Multiple Providers**:
  - **LanguageTool** (Free) - Rule-based grammar checking
  - **OpenRouter** (Free) - AI-powered with Llama 3.1
  - **OpenAI** (Paid) - Premium AI checking with GPT-4o-mini
- **Inline Error Highlighting**: Visual error indicators with click-to-fix
- **Error Explanations**: Detailed explanations with suggestions
- **Caching**: 24-hour cache for improved performance
- **Session Tracking**: Anonymous analytics
- **Dark Mode**: Automatic dark mode support
- **Mobile Responsive**: Works on all devices

## Tech Stack

- **Framework**: Next.js 14+ (App Router, TypeScript)
- **UI**: shadcn/ui + Tailwind CSS
- **State**: Zustand with localStorage persistence
- **Caching**: Vercel KV (Redis)
- **Grammar Engines**: LanguageTool API, OpenAI API, OpenRouter API

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel KV database (for caching)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

Copy `.env.example` to `.env.local` and fill in the values:

```bash
cp .env.example .env.local
```

**Required:**
- `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN` - Vercel KV credentials

**Optional:**
- `OPENAI_API_KEY` - For OpenAI provider (paid)
- `OPENROUTER_API_KEY` - For OpenRouter provider (free tier available)

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Building for Production

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── analytics/route.ts      # Analytics tracking
│   │   └── grammar-check/route.ts  # Main grammar API
│   ├── layout.tsx
│   ├── page.tsx                    # Main page
│   └── globals.css
│
├── components/
│   ├── ui/                         # shadcn/ui components
│   └── grammar-checker/
│       ├── editor.tsx              # Main editor
│       ├── editor-toolbar.tsx      # Provider selector
│       ├── highlighted-text.tsx    # Text with highlights
│       └── error-popover.tsx       # Error details
│
├── lib/
│   ├── grammar/
│   │   ├── cache.ts                # Caching layer
│   │   ├── languagetool.ts         # LanguageTool integration
│   │   ├── openai.ts               # OpenAI integration
│   │   └── openrouter.ts           # OpenRouter integration
│   └── hooks/
│       ├── use-debounce.ts         # Debouncing
│       ├── use-grammar-check.ts    # Main grammar hook
│       └── use-session.ts          # Session management
│
├── store/
│   └── grammar-store.ts            # Zustand store
│
└── types/
    └── grammar.ts                  # Type definitions
```

## Usage

1. **Start Typing**: Type or paste your text in the editor
2. **Select Provider**: Choose between LanguageTool (default), OpenRouter, or OpenAI
3. **View Errors**: Errors are highlighted inline with color coding:
   - Red: Grammar/Spelling errors
   - Yellow: Style suggestions
   - Blue: Punctuation issues
4. **Fix Errors**: Click on any error to see suggestions and apply fixes

## API Endpoints

### POST /api/grammar-check

Check text for grammar errors.

**Request:**
```json
{
  "text": "Your text here",
  "provider": "languagetool",
  "sessionId": "uuid",
  "language": "en-US"
}
```

**Response:**
```json
{
  "errors": [...],
  "metadata": {
    "provider": "languagetool",
    "processingTime": 123,
    "cached": false,
    "timestamp": 1234567890,
    "language": "en-US"
  }
}
```

### POST /api/analytics

Track usage events (internal use).

### GET /api/analytics

Get usage statistics (optional admin endpoint).

## Configuration

### Provider Settings

Settings are persisted to localStorage:
- **Provider**: Default grammar checking engine
- **Language**: Target language (default: en-US)
- **Auto Check**: Enable/disable automatic checking
- **Debounce Delay**: Delay before checking (default: 800ms)

### Caching

- **TTL**: 24 hours
- **Storage**: Vercel KV (Redis)
- **Key Format**: `grammar:{provider}:{language}:{textHash}`

## Deployment

See [claude.md](./claude.md) for detailed deployment instructions to Vercel.

Quick deploy:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Cost Considerations

- **LanguageTool**: Free (public API)
- **OpenRouter**: Free tier available (Llama 3.1)
- **OpenAI**: ~$0.15 per 1M tokens (gpt-4o-mini)
- **Vercel KV**: Free tier = 256MB storage, 10k requests/day
- **Vercel Hosting**: Free tier = 100GB bandwidth/month

## Known Limitations

- LanguageTool public API may have rate limits
- Maximum text length: 10,000 characters per request
- OpenRouter free tier may have availability issues
- Vercel KV required for caching (app works without it but with degraded performance)

## Contributing

This is an MVP implementation. Potential improvements:

- Rate limiting per session
- More language support
- Custom dictionary
- Document history
- Export functionality
- Browser extension

## License

MIT

## Support

For issues or questions, please check the implementation plan in `claude.md`.
