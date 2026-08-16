import { useState, useRef, useEffect } from 'react';

const Message = ({ role, content, citations, discarded, confident }) => (
  <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
    <div
      className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
        role === 'user'
          ? 'bg-sky-600 text-white'
          : 'bg-slate-800 text-slate-100'
      }`}
    >
      <p className="whitespace-pre-wrap">{content}</p>
      {citations?.length > 0 && (
        <div className="mt-3 border-t border-slate-700 pt-2 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Sources:</span>{' '}
          {citations.map((c, i) => (
            <span key={i}>
              [{i + 1}] TS {c.spec} &sect;{c.section} ({(c.denseSim * 100).toFixed(0)}%)
              {i < citations.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      )}
      {discarded > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          {discarded} candidate(s) discarded by similarity threshold
        </p>
      )}
      {confident === false && (
        <p className="mt-1 text-xs text-amber-400">
          Low confidence — answer may not be fully grounded in the specifications
        </p>
      )}
    </div>
  </div>
);

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
      const res = await fetch('/api/chat/stream', {
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
    <div className="flex h-screen flex-col">
      <header className="border-b border-slate-800 px-6 py-4 text-center">
        <h1 className="text-xl font-bold tracking-tight">3GPP RAG Chatbot</h1>
        <p className="text-xs text-slate-500">
          Grounded answers over Telecom specifications
        </p>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4">
        <div className="mx-auto flex max-w-3xl flex-col gap-4">
          {messages.length === 0 && (
            <div className="mt-20 text-center text-sm text-slate-500">
              Ask anything about 3GPP standards — e.g. "What is NSSAI?"
            </div>
          )}
          {messages.map((m, i) => (
            <Message key={i} {...m} />
          ))}
          <div ref={endRef} />
        </div>
      </main>

      <footer className="border-t border-slate-800 px-6 py-4">
        <form
          className="mx-auto flex max-w-3xl gap-2"
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
            className="flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-sky-600 px-5 py-3 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-40"
          >
            {loading ? '...' : 'Ask'}
          </button>
        </form>
      </footer>
    </div>
  );
}
