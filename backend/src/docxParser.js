import fs from 'node:fs';
import AdmZip from 'adm-zip';

const XML_ENTITIES = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&apos;': "'",
};

const decodeXml = (text) =>
  text
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;|&lt;|&gt;|&quot;|&apos;/g, (m) => XML_ENTITIES[m]);

const extractRuns = (pXml) => {
  let out = '';
  let idx = 0;
  const tabRe = /<w:tab\b[^>]*\/>/g;
  const brRe = /<w:br\b[^>]*\/>/g;
  pXml = pXml.replace(tabRe, '\t').replace(brRe, '\n');
  const tRe = /<w:t\b[^>]*>([^<]*)<\/w:t>/g;
  let m;
  while ((m = tRe.exec(pXml)) !== null) {
    out += m[1];
    idx = tRe.lastIndex;
  }
  return decodeXml(out);
};

export const docxToText = (buffer) => {
  const zip = new AdmZip(buffer);
  const entry = zip.getEntry('word/document.xml');
  if (!entry) throw new Error('word/document.xml missing from DOCX');
  const xml = entry.getData().toString('utf8');

  const paragraphs = [];
  let start = 0;
  const endTag = '</w:p>';
  while (true) {
    const end = xml.indexOf(endTag, start);
    if (end === -1) break;
    const open = xml.lastIndexOf('<w:p', end);
    const pXml = open !== -1 ? xml.slice(open, end + endTag.length) : '';
    const text = extractRuns(pXml).replace(/[\t ]+/g, ' ').trim();
    paragraphs.push(text);
    start = end + endTag.length;
  }
  return paragraphs.join('\n');
};

export const parseDocxFile = (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return docxToText(buffer);
};
