import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

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

describe('isConfidentAnswer', () => {
  it('returns true for a substantive answer', () => {
    assert.equal(isConfidentAnswer('The AMF handles registration and authentication.'), true);
  });
  it('detects "I don\'t have enough" fallback', () => {
    assert.equal(isConfidentAnswer("I don't have enough information from the provided specifications."), false);
  });
  it('detects "no information" fallback', () => {
    assert.equal(isConfidentAnswer('No information available in the context.'), false);
  });
});

describe('verifyGrounding', () => {
  const citations = [
    { section: '5.2.1', text: 'chunk' },
    { section: '5.3.2', text: 'chunk' },
  ];

  it('passes when cited sections exist in citations', () => {
    assert.equal(verifyGrounding('As per §5.2.1, the AMF supports registration.', citations), true);
  });

  it('fails when answer references a section not in citations', () => {
    assert.equal(verifyGrounding('As per §9.9.9, something happens.', citations), false);
  });

  it('passes when answer has no section references', () => {
    assert.equal(verifyGrounding('The AMF supports registration.', citations), true);
  });
});
