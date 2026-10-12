'use client';

import JSZip from 'jszip';
import mammoth from 'mammoth';

export const RESUME_FILE_ACCEPT = '.pdf,.docx,.txt,.md,.markdown,.json,.csv,.html,.htm';
export const COURSE_FILE_ACCEPT = '.pdf,.docx,.pptx,.txt,.md,.markdown,.json,.csv,.html,.htm';

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

function textFromHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body?.innerText ?? '';
}

async function parsePdf(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .filter(Boolean)
      .join(' ');
    pages.push(`第 ${i} 页\n${text}`);
  }
  return pages.join('\n\n');
}

async function parseDocx(file: File): Promise<string> {
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

function xmlText(xml: string): string {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(doc.getElementsByTagName('a:t'))
    .map((node) => node.textContent ?? '')
    .join(' ');
}

async function parsePptx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slides = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const an = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const bn = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      return an - bn;
    });
  const output: string[] = [];
  for (let i = 0; i < slides.length; i += 1) {
    const xml = await zip.files[slides[i]].async('string');
    output.push(`第 ${i + 1} 页\n${xmlText(xml)}`);
  }
  return output.join('\n\n');
}

export async function extractDocumentText(file: File): Promise<string> {
  const ext = extensionOf(file.name);
  let text: string;

  if (ext === 'pdf') text = await parsePdf(file);
  else if (ext === 'docx') text = await parseDocx(file);
  else if (ext === 'pptx') text = await parsePptx(file);
  else {
    const raw = await file.text();
    text = ['html', 'htm'].includes(ext) ? textFromHtml(raw) : raw;
  }

  return text.replace(/\n{3,}/g, '\n\n').trim();
}
