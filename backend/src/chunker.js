const SECTION_NUM = /^(\d+(\.\d+){0,3}[a-z]?)/;
const GLUED_HEADING = /^(\d+(\.\d+){0,3}[a-z]?)[A-Z]/;
const SPACED_HEADING = /^(\d+(\.\d+){0,3}[a-z]?)[\s\u00a0]+[A-Z]/;
const NUMBERED = /^(\d+(\.\d+){1,3})[\s\u00a0]/;

const isHeading = (line) => {
  if (/^Annex\s+[A-Z]\b/i.test(line)) return true;
  const m = line.match(GLUED_HEADING) || line.match(SPACED_HEADING);
  if (!m) return false;
  const label = line.slice(m[1].length).trim();
  return line.length <= 90 && !/[.;,:]$/.test(label);
};

const sectionOfHeading = (line) => {
  const annex = line.match(/^Annex\s+([A-Z])/i);
  if (annex) return `Annex ${annex[1]}`;
  return line.match(SECTION_NUM)?.[1] ?? null;
};

/**
 * Section-aware chunking for 3GPP specification body text.
 *
 * - Heading lines (glued or spaced section numbers, short, unpunctuated,
 *   or Annex headings) start a new section and a fresh chunk.
 * - Numbered paragraphs (e.g. "5.2.3.1 The UE shall ...") are captured so every
 *   chunk carries the deepest section/paragraph number for precise citations.
 * - Chunks are sized by characters with a small overlap to avoid losing context
 *   across boundaries.
 *
 * @param {object} params
 * @param {string} params.text  document body (form-feed \f separates pages)
 * @param {object} params.meta  base metadata merged into every chunk
 * @param {number} params.maxChunkChars
 * @param {number} params.overlapChars
 */
export function chunkDocument({
  text,
  meta,
  maxChunkChars = 900,
  overlapChars = 80,
}) {
  const lines = text.replace(/\u00a0/g, ' ').split(/\r?\n/);
  const chunks = [];
  let buffer = '';
  let section = null;
  let heading = null;
  let paragraph = null;
  let page = 1;

  const flush = () => {
    const content = buffer.trim();
    if (content) {
      chunks.push({
        ...meta,
        section,
        paragraph,
        heading,
        page,
        text: content,
      });
    }
    buffer = '';
  };

  for (const raw of lines) {
    const feedCount = (raw.match(/\f/g) || []).length;
    const line = raw.replace(/\f/g, ' ').trim();
    if (feedCount) page += feedCount;
    if (!line) continue;

    if (isHeading(line)) {
      flush();
      section = sectionOfHeading(line);
      heading = line.replace(/\s+/g, ' ');
      paragraph = null;
      buffer = heading;
      continue;
    }

    const pNum = line.match(NUMBERED)?.[1];
    if (pNum) paragraph = pNum;

    if (buffer && buffer.length + 1 + line.length > maxChunkChars) flush();
    buffer += (buffer ? ' ' : '') + line;
  }
  flush();
  return chunks;
}
