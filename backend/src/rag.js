import { config } from './config.js';
import { Retriever } from './retriever.js';
import { chatComplete, chatStream } from './llm.js';
import { SYSTEM_PROMPT, USER_TEMPLATE } from './prompt.js';

let retriever = null;

const getRetriever = async () => {
  if (!retriever) retriever = await Retriever.create();
  return retriever;
};

const buildContext = (citations) =>
  citations
    .map(
      (c, i) =>
        `[${i + 1}] TS ${c.spec} §${c.section} (${c.heading || 'N/A'}):\n${c.text}`
    )
    .join('\n\n');

const buildMessages = (context, query) => [
  { role: 'system', content: SYSTEM_PROMPT },
  { role: 'user', content: USER_TEMPLATE({ context, query }) },
];

const isConfidentAnswer = (text) => {
  const lower = text.toLowerCase();
  return !(
    lower.includes("don't have enough information") ||
    lower.includes('i do not have enough') ||
    lower.includes('not provided in the context') ||
    lower.includes('cannot answer') ||
    lower.includes('no information')
  );
};

const verifyGrounding = (answer, citations) => {
  const sectionRefs = answer.match(/§[\d.]+/g) ?? [];
  const citedSections = new Set(citations.map((c) => c.section).filter(Boolean));
  return sectionRefs.length === 0 || sectionRefs.every((ref) => citedSections.has(ref.slice(1)));
};

export async function ragQuery(query, { topK, stream } = {}) {
  const ret = await getRetriever();
  const { results, discarded } = await ret.search(query, {
    topK: topK ?? config.retrieval.topK,
  });

  if (!results.length) {
    return {
      answer:
        "I don't have enough information from the provided specifications to answer this question.",
      citations: [],
      discarded,
      confident: false,
    };
  }

  const context = buildContext(results);
  const messages = buildMessages(context, query);

  if (stream) {
    return {
      stream: chatStream(messages),
      citations: results,
      discarded,
    };
  }

  const answer = await chatComplete(messages);
  const confident = isConfidentAnswer(answer) && verifyGrounding(answer, results);

  return { answer, citations: results, discarded, confident };
}
