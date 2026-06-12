import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

async function extractPdfText(arrayBuffer) {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
  const allLines = [];

  for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Group items by y-coordinate so we reconstruct actual visual lines
    const byY = new Map();
    for (const item of content.items) {
      if (!item.str) continue;
      // Round to nearest 2px to merge items on the same visual line
      const y = Math.round(item.transform[5] / 2) * 2;
      if (!byY.has(y)) byY.set(y, []);
      byY.get(y).push(item);
    }

    // Sort y descending (top of page first), x ascending within each line
    const sortedYs = [...byY.keys()].sort((a, b) => b - a);
    for (const y of sortedYs) {
      const items = byY.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
      const line = items.map((it) => it.str).join(' ').trim();
      if (line) allLines.push(line);
    }
  }

  return allLines.join('\n');
}

async function extractDocxText(arrayBuffer) {
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function nameFromFilename(filename) {
  const base = filename.replace(/\.[^.]+$/, '');
  const words = base
    .split(/[_\-\s]+/)
    .filter((w) => /^[A-Z][a-zA-Z]{1,}$/.test(w))
    .filter((w) => !/^(resume|cv|curriculum|vitae|application|portfolio|new|my|the)$/i.test(w));
  if (words.length >= 2 && words.length <= 4) return words.join(' ');
  return '';
}

function parseFields(text, filename) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?[\d][\d\s\-().]{7,14}[\d])/);

  let name = '';

  const SKIP = /^(resume|cv|curriculum|vitae|objective|summary|profile|education|experience|skills|contact|address|tel|phone|mobile|linkedin|github|portfolio|references|professional|personal|declaration|projects|achievements|certifications|languages|hobbies|interests|awards|work|employment|about|career|technical|core|key|areas|additional|other|training|internship|volunteer|extracurricular|publications|research)/i;

  const lines = text.split(/[\n\r]+/).map((l) => l.trim()).filter(Boolean);
  console.log('[parseResume] first 15 lines:', lines.slice(0, 15));

  for (const line of lines.slice(0, 15)) {
    if (line.length > 50 || line.length < 2) continue;
    if (line.includes('@') || /\d{4,}/.test(line)) continue;
    if (SKIP.test(line)) continue;
    // Must be only letters, spaces, dots, hyphens, apostrophes
    if (!/^[A-Za-z.\s'-]+$/.test(line)) continue;
    const words = line.trim().split(/\s+/);
    // Name: 2–5 words (handles "JOHN SMITH", "Mary Jane Watson", etc.)
    if (words.length >= 2 && words.length <= 5) {
      name = line.trim();
      break;
    }
  }

  // Fallback only: try filename if PDF text gave nothing
  if (!name && filename) name = nameFromFilename(filename);

  return {
    name,
    email: emailMatch?.[0] ?? '',
    phone: phoneMatch?.[0]?.trim() ?? '',
  };
}

export async function parseResume(file) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    let text = '';
    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf');
    const isDocx =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name.endsWith('.docx');

    if (isPdf) text = await extractPdfText(arrayBuffer);
    else if (isDocx) text = await extractDocxText(arrayBuffer);

    const fields = parseFields(text, file.name);
    return { ...fields, rawText: text };
  } catch (err) {
    console.error('Resume parse error:', err);
    return { name: '', email: '', phone: '', rawText: '' };
  }
}
