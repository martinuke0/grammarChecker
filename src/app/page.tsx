import { GrammarEditor } from '@/components/grammar-checker/editor';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Main Content - Full height centered */}
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-5xl px-4 py-8">
          <GrammarEditor />
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="py-3 text-center text-xs text-muted-foreground">
        <p>Powered by martinuke0</p>
      </footer>
    </div>
  );
}
