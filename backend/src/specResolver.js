export const ARCHIVE_ROOT = 'https://www.3gpp.org/ftp/Specs/archive';

const RELEASE_LETTERS = {
  15: 'f',
  16: 'g',
  17: 'h',
  18: 'i',
  19: 'j',
  20: 'k',
};

const LETTER_TO_RELEASE = Object.fromEntries(
  Object.entries(RELEASE_LETTERS).map(([release, letter]) => [letter, Number(release)])
);

export const seriesOf = (specNumber) => `${specNumber.split('.')[0]}_series`;

export const specFolderUrl = (specNumber) =>
  `${ARCHIVE_ROOT}/${seriesOf(specNumber)}/${specNumber}/`;

export const specFileUrl = (specNumber, filename) =>
  `${specFolderUrl(specNumber)}${filename}`;

const compactSpec = (specNumber) => specNumber.replace('.', '');

export const versionToKey = (suffix) => parseInt(suffix, 36);

export const releaseOfSuffix = (suffix) => {
  const first = suffix[0];
  if (/[a-z]/.test(first)) return LETTER_TO_RELEASE[first] ?? null;
  return null;
};

export const parseListing = (html, specNumber) => {
  const prefix = compactSpec(specNumber);
  const pattern = new RegExp(
    `href="([^"]+?/${prefix}-([0-9a-z]{3})\\.zip)"`,
    'gi'
  );
  const files = [];
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const [, url, suffix] = match;
    files.push({
      url,
      filename: `${prefix}-${suffix}.zip`,
      suffix,
      key: versionToKey(suffix),
      release: releaseOfSuffix(suffix),
    });
  }
  return files;
};

export const pickBest = (files, preferredRelease = null) => {
  const eligible =
    preferredRelease != null
      ? files.filter((f) => f.release === Number(preferredRelease))
      : files;
  if (eligible.length === 0) return null;
  return eligible.reduce((best, f) => (f.key > best.key ? f : best));
};
