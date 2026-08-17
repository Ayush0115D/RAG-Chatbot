import { useState, useRef, useEffect } from 'react';

const SAMPLES = [
  'What is NSSAI?',
  'How does the AMF handle registration?',
  'Explain PDU session establishment',
];

const API_BASE = import.meta.env.VITE_API_URL || '';

const BotAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 border border-slate-700">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-sky-400" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  </div>
);

const UserAvatar = () => (
  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-bold text-slate-300">
    U
  </div>
);

const TypingIndicator = () => (
  <div className="flex gap-1 px-2 py-1">
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="h-2 w-2 rounded-full bg-sky-400 animate-bounce-dot"
        style={{ animationDelay: `${i * 0.2}s` }}
      />
    ))}
  </div>
);

const CitationCard = ({ index, citation }) => (
  <div className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2 text-xs transition-colors duration-200 hover:border-sky-500/30 hover:bg-slate-800/80">
    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-sky-600/20 font-mono font-bold text-sky-400">
      {index + 1}
    </span>
    <div className="min-w-0 flex-1">
      <span className="font-medium text-slate-300">
        TS {citation.spec} &sect;{citation.section}
      </span>
      <span className="ml-2 text-slate-500">
        {(citation.denseSim * 100).toFixed(0)}% match
      </span>
    </div>
  </div>
);

const Message = ({ role, content, citations, discarded, confident }) => {
  const isBot = role === 'bot';
  const isStreaming = isBot && content === '';

  return (
    <div className={`flex gap-3 animate-fade-in-left ${isBot ? 'justify-start' : 'justify-end animate-fade-in-right'}`}>
      {isBot && <BotAvatar />}
      <div className={`flex max-w-[75%] flex-col ${isBot ? 'items-start' : 'items-end'}`}>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
            isBot
              ? `bg-slate-800/80 text-slate-100 rounded-tl-md ${isStreaming ? 'animate-shimmer' : ''}`
              : 'bg-gradient-to-br from-sky-600 to-sky-700 text-white rounded-tr-md'
          }`}
        >
          {isStreaming ? <TypingIndicator /> : (
            <p className="whitespace-pre-wrap">{content}</p>
          )}
        </div>

        {citations?.length > 0 && !isStreaming && (
          <div className="mt-2 flex flex-col gap-1">
            {citations.slice(0, 3).map((c, i) => (
              <CitationCard key={i} index={i} citation={c} />
            ))}
            {citations.length > 3 && (
              <span className="ml-8 text-xs text-slate-500">
                +{citations.length - 3} more source{citations.length - 3 > 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        {discarded > 0 && !isStreaming && (
          <span className="mt-1 ml-8 text-xs text-slate-600">
            {discarded} weaker candidate{discarded > 1 ? 's' : ''} filtered
          </span>
        )}

        {confident === false && !isStreaming && (
          <span className="mt-1 ml-8 text-xs text-amber-500">
            Low confidence — may not be fully grounded
          </span>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (query) => {
    if (!query.trim() || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: query }]);
    setLoading(true);

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
  };

  return (
    <div className="flex h-screen flex-col bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900">
      <header className="animate-glow border-b border-slate-800/60 px-6 py-4 text-center">
        <h1 className="bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-400 bg-clip-text text-xl font-bold tracking-tight text-transparent">
          3GPP RAG Chatbot
        </h1>
        <p className="mt-0.5 text-xs text-slate-500">
          Grounded answers over Telecom specifications
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-5">
          {messages.length === 0 && (
            <div className="mt-24 flex flex-col items-center gap-6 text-center animate-fade-in">
              <div className="relative flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-2xl bg-sky-500/10 blur-xl" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/60 bg-slate-800/80">
                  <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-sky-400" strokeWidth="1.2" stroke="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinejoin="round" />
                    <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-base font-medium text-slate-200">
                  Ask anything about 3GPP standards
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Answers grounded in TS 23.501 and more — with source citations
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {SAMPLES.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    disabled={loading}
                    className="group rounded-full border border-slate-700/60 bg-slate-800/50 px-4 py-2 text-xs text-slate-300 transition-all duration-200 hover:border-sky-500/50 hover:bg-sky-500/10 hover:text-sky-300 hover:shadow-lg hover:shadow-sky-500/5"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <Message key={i} {...m} />
          ))}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="border-t border-slate-800/60 px-4 py-4">
        <form
          className="mx-auto flex max-w-3xl gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about 3GPP..."
            disabled={loading}
            className="flex-1 rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 hover:border-slate-600 focus:border-sky-500 disabled:opacity-40"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white transition-all duration-200 hover:from-sky-400 hover:to-indigo-500 hover:shadow-lg hover:shadow-sky-500/20 active:scale-95 disabled:opacity-30"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
            >
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
