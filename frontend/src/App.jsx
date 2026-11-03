import { useState, useRef, useEffect } from 'react';

const SAMPLES = [
  'What is NSSAI?',
  'How does the AMF handle registration?',
  'Explain PDU session establishment',
];

const API_BASE = import.meta.env.VITE_API_URL || '';

const BotAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-sky-400/20 bg-sky-500/10">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-sky-400" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  </div>
);

const UserAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-400">
    You
  </div>
);

const TypingIndicator = () => (
  <div className="flex gap-1 px-1 py-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-bounce-dot"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

const specUrl = (spec) =>
  `https://www.3gpp.org/DynaReport/${spec.replace('.', '')}.htm`;

const ExternalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

const CitationCard = ({ index, citation }) => (
  <a
    href={specUrl(citation.spec)}
    target="_blank"
    rel="noopener noreferrer"
    className="group flex items-start gap-2 rounded-lg border border-slate-700/50 bg-slate-800/40 p-2 transition-colors duration-200 hover:border-sky-500/30 hover:bg-slate-800/70"
  >
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-500/15 font-mono text-[10px] font-bold text-sky-400">
      {index + 1}
    </span>
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-[11px] text-sky-300">
          TS {citation.spec}
        </span>
        {citation.section && (
          <span className="text-[10px] text-slate-500">
            §{citation.section}
          </span>
        )}
        <ExternalIcon />
      </span>
      {citation.heading && (
        <span className="mt-0.5 block truncate text-[10px] text-slate-500">
          {citation.heading}
        </span>
      )}
    </span>
    <span className="shrink-0 font-mono text-[10px] text-slate-500">
      {(citation.denseSim * 100).toFixed(0)}%
    </span>
  </a>
);

const Message = ({ role, content, citations = [], discarded, confident }) => {
  const isBot = role === 'bot';
  const isStreaming = isBot && content === '';

  return (
    <div
      className={`flex gap-3 ${
        isBot ? 'animate-fade-in-left' : 'animate-fade-in-right justify-end'
      }`}
    >
      {isBot && <BotAvatar />}

      <div
        className={`flex min-w-0 max-w-[85%] flex-col gap-2 sm:max-w-[76%] ${
          isBot ? 'items-start' : 'items-end'
        }`}
      >
        {isBot && (
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
            3GPP Assistant
          </span>
        )}

        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isBot
              ? `border border-slate-700/40 bg-slate-800/70 text-slate-100 rounded-tl-md ${
                  isStreaming ? 'animate-shimmer' : ''
                }`
              : 'bg-gradient-to-br from-sky-600 to-indigo-600 text-white rounded-tr-md'
          }`}
        >
          {isStreaming ? (
            <div className="flex items-center gap-2">
              <TypingIndicator />
              <span className="text-xs text-slate-400">
                Searching specs and generating answer…
              </span>
            </div>
          ) : (
            <p className="whitespace-pre-wrap break-words">{content}</p>
          )}
        </div>

        {citations.length > 0 && !isStreaming && (
          <div className="w-full">
            <div className="mb-1.5 flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Sources
              </span>
              <span className="rounded-full border border-slate-700/60 px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                {citations.length}
              </span>
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              {citations.slice(0, 4).map((citation, i) => (
                <CitationCard key={i} index={i} citation={citation} />
              ))}
            </div>
            {citations.length > 4 && (
              <p className="mt-1 text-[10px] text-slate-600">
                +{citations.length - 4} more source
                {citations.length - 4 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {discarded > 0 && !isStreaming && (
          <span className="text-[10px] text-slate-600">
            {discarded} weaker candidate{discarded > 1 ? 's' : ''} filtered
          </span>
        )}

        {confident === false && !isStreaming && (
          <span className="rounded-md border border-amber-500/20 bg-amber-500/5 px-2 py-1 text-[10px] text-amber-400">
            Low confidence — may not be fully grounded
          </span>
        )}
      </div>

      {!isBot && <UserAvatar />}
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showWarmup, setShowWarmup] = useState(true);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (query) => {
    if (!query.trim() || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: query }]);
    setLoading(true);
    setShowWarmup(false);

    try {
      const res = await fetch(`${API_BASE}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let botMsg = { role: 'bot', content: '', citations: [], discarded: 0, confident: true };

      setMessages((m) => [...m, { ...botMsg }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === 'meta') {
              botMsg.citations = data.citations;
              botMsg.discarded = data.discarded;
            } else if (data.type === 'token') {
              botMsg.content += data.content;
            } else if (data.type === 'done') {
              break;
            } else if (data.type === 'error') {
              botMsg.content = 'Sorry, something went wrong.';
            }
            setMessages((m) => {
              const updated = [...m];
              updated[updated.length - 1] = { ...botMsg };
              return updated;
            });
          } catch {
            /* skip */
          }
        }
      }
    } catch {
      setMessages((m) => [
        ...m.slice(0, -1),
        { role: 'bot', content: 'Failed to connect to the backend.', citations: [] },
      ]);
    }

    setLoading(false);
    setShowWarmup(false);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    if (loading) return;
    setMessages([]);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-dvh flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="shrink-0 border-b border-slate-800/60 bg-slate-950/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <BotAvatar />
          <div className="min-w-0 flex-1">
            <h1 className="text-sm font-semibold tracking-tight text-slate-100">
              3GPP RAG Chatbot
            </h1>
            <p className="text-[11px] text-slate-500">
              Grounded answers over telecom specifications
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              disabled={loading}
              className="rounded-lg border border-slate-700/60 px-3 py-1.5 text-[11px] font-medium text-slate-400 transition hover:border-slate-600 hover:text-slate-200 disabled:opacity-40"
            >
              New chat
            </button>
          )}
        </div>
      </header>

      {showWarmup && (
        <div className="shrink-0 border-b border-amber-500/15 bg-amber-500/5">
          <div className="mx-auto flex max-w-3xl items-start gap-2 px-4 py-2.5">
            <p className="flex-1 text-[11px] leading-relaxed text-amber-400/90">
              This app runs on a Render free tier — the first response may take up
              to 50 seconds while the server wakes up.
            </p>
            <button
              onClick={() => setShowWarmup(false)}
              aria-label="Dismiss notice"
              className="text-amber-400/50 transition hover:text-amber-300"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-3.5 w-3.5">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto px-4 py-6">
        {messages.length === 0 ? (
          <div className="mx-auto mt-16 flex max-w-3xl animate-fade-in flex-col items-center gap-6 text-center sm:mt-24">
            <div className="relative flex h-16 w-16 items-center justify-center">
              <div className="absolute inset-0 rounded-2xl bg-sky-500/15 blur-2xl" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/80">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-sky-400" strokeWidth="1.2" stroke="currentColor">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                  <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div>
              <p className="text-lg font-medium text-slate-100">
                Ask anything about 3GPP standards
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Answers grounded in TS 23.501, 23.502, 23.503 and 33.501 — with sources
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SAMPLES.map((sample) => (
                <button
                  key={sample}
                  onClick={() => send(sample)}
                  disabled={loading}
                  className="rounded-full border border-slate-700/60 bg-slate-800/40 px-4 py-2 text-xs text-slate-300 transition-all duration-200 hover:border-sky-500/40 hover:bg-sky-500/10 hover:text-sky-300 disabled:opacity-40"
                >
                  {sample}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-6">
            {messages.map((m, i) => (
              <Message key={i} {...m} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </main>

      <footer className="shrink-0 border-t border-slate-800/60 bg-slate-950/70 px-4 pb-4 pt-3 backdrop-blur">
        <div className="mx-auto max-w-3xl">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about 3GPP…"
              disabled={loading}
              className="min-w-0 flex-1 rounded-xl border border-slate-700/60 bg-slate-800/50 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-sky-500 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white transition-all duration-200 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-sky-500/20 active:scale-95 disabled:opacity-30"
              aria-label="Send message"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4Z" />
              </svg>
            </button>
          </form>
          <p className="mt-2 text-center text-[10px] text-slate-600">
            Answers are grounded in indexed specifications · Always verify critical details
          </p>
        </div>
      </footer>
    </div>
  );
}
