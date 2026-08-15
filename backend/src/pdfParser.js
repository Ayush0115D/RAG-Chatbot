import fs from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

export const pdfToText = async (buffer) => {
  const loadingTask = getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;
  const pages = [];
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => (typeof item.str === 'string' ? item.str : ''))
        .join(' ')
        .replace(/[\t ]+/g, ' ')
        .trim();
      pages.push(text);
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages.join('\f');
};

export const parsePdfFile = async (filePath) => {
  const buffer = fs.readFileSync(filePath);
  return pdfToText(buffer);
};
