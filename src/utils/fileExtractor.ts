import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker for browser execution
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  // Use official CDN worker matching installed version with fallback
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set GlobalWorkerOptions.workerSrc:', e);
  }
}

/**
 * Extracts raw textual layout from a Microsoft Word .docx file by unzipping
 * word/document.xml and converting paragraph tags (<w:p>) to lines.
 */
export async function extractTextFromDocx(data: ArrayBuffer): Promise<string> {
  const zip = await JSZip.loadAsync(data);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) {
    throw new Error('Invalid .docx file: word/document.xml not found.');
  }

  const xmlContent = await docXmlFile.async('text');

  // If DOMParser is available (standard in browsers)
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'application/xml');
    const paragraphs = xmlDoc.getElementsByTagName('w:p');
    const lines: string[] = [];

    for (let i = 0; i < paragraphs.length; i++) {
      const p = paragraphs[i];
      const textNodes = p.getElementsByTagName('w:t');
      let pText = '';
      for (let j = 0; j < textNodes.length; j++) {
        pText += textNodes[j].textContent || '';
      }
      if (pText.trim()) {
        lines.push(pText.trim());
      }
    }

    if (lines.length > 0) {
      return lines.join('\n');
    }
  }

  // Regex fallback
  const pRegex = /<w:p(?:\s+[^>]*)?>([\s\S]*?)<\/w:p>/gi;
  const tRegex = /<w:t(?:\s+[^>]*)?>([^<]*)<\/w:t>/gi;
  const lines: string[] = [];
  let pMatch: RegExpExecArray | null;

  while ((pMatch = pRegex.exec(xmlContent)) !== null) {
    const pContent = pMatch[1];
    let pText = '';
    let tMatch: RegExpExecArray | null;
    while ((tMatch = tRegex.exec(pContent)) !== null) {
      pText += tMatch[1];
    }
    if (pText.trim()) {
      lines.push(pText.trim());
    }
  }

  return lines.join('\n');
}

/**
 * Extracts text stream from a PDF using pdf.js page-by-page.
 */
export async function extractTextFromPdf(data: ArrayBuffer): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings: string[] = [];
      let lastY: number | null = null;

      for (const item of content.items) {
        if ('str' in item) {
          // If Y coordinate has changed significantly, insert a newline
          if (lastY !== null && Math.abs(item.transform[5] - lastY) > 6) {
            strings.push('\n');
          } else if (strings.length > 0 && !strings[strings.length - 1].endsWith(' ')) {
            strings.push(' ');
          }
          strings.push(item.str);
          lastY = item.transform[5];
        }
      }

      const pageJoined = strings.join('').trim();
      if (pageJoined) {
        pageTexts.push(pageJoined);
      }
    }

    const fullText = pageTexts.join('\n\n');
    if (fullText.trim().length < 15 && pdf.numPages > 0) {
      console.warn('PDF contains little to no text layer; likely scanned bitmap images.');
    }
    return fullText;
  } catch (err: any) {
    console.error('PDF text extraction error:', err);
    throw new Error(`Failed to extract text from PDF: ${err.message || 'Corrupt or unreadable PDF'}`);
  }
}

/**
 * Universal text extractor for uploaded files (.docx, .pdf, .txt, .ocr, .json).
 * Operates purely offline in the browser before invoking parseExamRawText.
 */
export async function extractTextFromFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  const buffer = await file.arrayBuffer();

  if (name.endsWith('.docx')) {
    return await extractTextFromDocx(buffer);
  }

  if (name.endsWith('.pdf')) {
    return await extractTextFromPdf(buffer);
  }

  // Plain text fallback (for .txt, .ocr, etc.)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      resolve((e.target?.result as string) || '');
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
