import { useState } from 'react';

export default function App() {
  const [message, setMessage] = useState('');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          📡 3GPP RAG Chatbot
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Grounded answers over Telecom 3GPP standards — near-zero hallucinations
        </p>
      </div>

      <input
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Ask about 3GPP… (UI coming in a later step)"
        className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-sky-500"
      />

      <p className="text-xs text-slate-500">Scaffold up · Chat UI lands in the final feature</p>
    </main>
  );
}
