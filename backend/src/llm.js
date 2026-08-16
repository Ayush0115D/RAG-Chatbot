import { config } from './config.js';

const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${config.llm.apiKey}`,
});

export async function chatComplete(messages, { temperature, maxTokens } = {}) {
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      temperature: temperature ?? config.llm.temperature ?? 0.2,
      max_tokens: maxTokens ?? config.llm.maxTokens ?? 1024,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.choices[0].message.content;
}

export async function* chatStream(messages, { temperature, maxTokens } = {}) {
  const res = await fetch(`${config.llm.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      model: config.llm.model,
      messages,
      temperature: temperature ?? config.llm.temperature ?? 0.2,
      max_tokens: maxTokens ?? config.llm.maxTokens ?? 1024,
      stream: true,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`LLM ${res.status}: ${body.slice(0, 200)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const json = line.slice(6).trim();
      if (json === '[DONE]') return;
      try {
        const delta = JSON.parse(json).choices?.[0]?.delta?.content;
        if (delta) yield delta;
      } catch {
        /* skip malformed SSE frames */
      }
    }
  }
}
