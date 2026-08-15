const GLUED_HEADING = /^(\d+(\.\d+){0,3}[a-z]?)[A-Z]/;
const SPACED_HEADING = /^(\d+(\.\d+){0,3}[a-z]?)[\s\u00a0]+[A-Z]/;

const isBodyStart = (line) =>
  (/^1\s*Scope\b/.test(line) || /^1Scope\b/.test(line)) && !/\d+$/.test(line);

const hasTrailingPageNumber = (line) => /\d+$/.test(line);

/**
 * Strips the front matter (cover pages + table of contents) and the back
 * matter (change history annex) from a 3GPP specification document so that
 * only the actual technical body is chunked.
 */
export function extractBody(text) {
  const lines = text.split(/\r?\n/).map((l) => l.trim());

  let start = lines.findIndex(isBodyStart);
  if (start === -1) {
    start = lines.findIndex(
      (l) => (GLUED_HEADING.test(l) || SPACED_HEADING.test(l)) && !hasTrailingPageNumber(l)
    );
  }
  if (start === -1) start = 0;

  const isChangeHistoryAnnex = (l) => /^Annex\s+[A-Z][^\n]*change\s*history/i.test(l);
  const isChangeHistoryHeading = (l) => /^Change history/i.test(l);

  let cut = lines.findIndex((l, i) => i >= start && isChangeHistoryAnnex(l));
  if (cut === -1) cut = lines.findIndex((l, i) => i >= start && isChangeHistoryHeading(l));
  const body = cut !== -1 ? lines.slice(start, cut) : lines.slice(start);

  return body.filter(Boolean).join('\n');
}
