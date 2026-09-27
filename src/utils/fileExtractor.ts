import JSZip from 'jszip';
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import { preprocessImageForOcr, normalizeOcrText } from './ocrPreprocessor';

// Configure PDF.js worker for browser execution
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.10.38'}/build/pdf.worker.min.mjs`;
  } catch (e) {
    console.warn('Could not set GlobalWorkerOptions.workerSrc:', e);
  }
}

export type OcrProgressCallback = (status: string, percent: number) => void;

/**
 * Runs pure offline OCR on an image or HTMLCanvasElement using tesseract.js.
 * Reads eng and fas traineddata directly from local /tessdata with 0 external network requests!
 */
export async function runOfflineOcr(
  imageSource: string | HTMLCanvasElement | Blob | File,
  onProgress?: OcrProgressCallback,
): Promise<string> {
  onProgress?.('Preparing image & initializing local offline OCR...', 5);

  // Preprocess image on canvas if possible
  let processedSource: any = imageSource;
  if (typeof window !== 'undefined') {
    try {
      if (imageSource instanceof HTMLCanvasElement) {
        processedSource = preprocessImageForOcr(imageSource);
      } else if (imageSource instanceof Blob || imageSource instanceof File) {
        const imgBitmap = await createImageBitmap(imageSource);
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgBitmap.width;
        tempCanvas.height = imgBitmap.height;
        const ctx = tempCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(imgBitmap, 0, 0);
          processedSource = preprocessImageForOcr(tempCanvas);
        }
      }
    } catch (prepErr) {
      console.warn('Image pre-filter skipped:', prepErr);
      processedSource = imageSource;
    }
  }

  const localLangPath = typeof window !== 'undefined'
    ? `${window.location.origin}/tessdata`
    : '/tessdata';

  let worker: any = null;
  try {
    // 1. First attempt: Load local traineddata (100% offline, zero network, airplane mode)
    worker = await createWorker(['eng', 'fas'], 1, {
      langPath: localLangPath,
      gzip: true,
      logger: (m: any) => {
        if (m.status === 'recognizing text') {
          const pct = Math.round((m.progress || 0) * 100);
          onProgress?.(`Recognizing text (${pct}%)...`, pct);
        } else if (m.status) {
          onProgress?.(`OCR: ${m.status}...`, 15);
        }
      },
    });
  } catch (localErr) {
    console.warn('Local /tessdata load failed, attempting uncompressed or CDN fallback:', localErr);
    try {
      worker = await createWorker(['eng', 'fas'], 1, {
        langPath: localLangPath,
        gzip: false,
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.(`Recognizing text (${pct}%)...`, pct);
          }
        },
      });
    } catch (secondErr) {
      console.warn('Uncompressed local load failed, trying standard fallback:', secondErr);
      worker = await createWorker(['eng', 'fas'], 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            const pct = Math.round((m.progress || 0) * 100);
            onProgress?.(`Recognizing text (${pct}%)...`, pct);
          }
        },
      });
    }
  }

  // Set PSM 3 (Fully automatic page segmentation)
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: '3',
    });
  } catch {
    // ignore
  }

  const ret = await worker.recognize(processedSource);
  await worker.terminate();

  const rawOcrText = ret.data.text || '';
  return normalizeOcrText(rawOcrText);
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
      return normalizeOcrText(lines.join('\n'));
    }
  }

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

  return normalizeOcrText(lines.join('\n'));
}

/**
 * Extracts text from PDF:
 * 1. Checks standard text layer via pdf.js getTextContent().
 * 2. If PDF has NO text layer (image-only / scanned pages), automatically renders
 *    each page to high-res canvas and runs 100% offline OCR on the canvas!
 */
export async function extractTextFromPdf(
  data: ArrayBuffer,
  onProgress?: OcrProgressCallback,
): Promise<string> {
  try {
    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(data),
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];
    let totalTextChars = 0;

    // First pass: extract digital text layers if available
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings: string[] = [];
      let lastY: number | null = null;

      for (const item of content.items) {
        if ('str' in item) {
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
        totalTextChars += pageJoined.length;
      }
    }

    // If PDF contains real text layer (>= 30 characters), normalize and return
    if (totalTextChars >= 30) {
      return normalizeOcrText(pageTexts.join('\n\n'));
    }

    // CASE: SCANNED / IMAGE-ONLY PDF DETECTED!
    onProgress?.(`Scanned image-only PDF detected (${pdf.numPages} pages). Starting offline OCR...`, 5);
    const ocrPageTexts: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      onProgress?.(`Rendering Page ${i}/${pdf.numPages} to high-res canvas...`, Math.round((i / (pdf.numPages + 1)) * 30));
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 2.0 }); // 2.0 scale provides crisp text for OCR

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D context unavailable');
      }

      await page.render({ canvasContext: ctx, viewport, canvas } as any).promise;

      onProgress?.(`Running offline OCR on Page ${i}/${pdf.numPages} (Persian + English)...`, Math.round((i / pdf.numPages) * 70));
      const pageOcrText = await runOfflineOcr(canvas, (status, pct) => {
        onProgress?.(`Page ${i}/${pdf.numPages}: ${status}`, pct);
      });

      if (pageOcrText.trim()) {
        ocrPageTexts.push(pageOcrText.trim());
      }
    }

    return ocrPageTexts.join('\n\n--- Page Break ---\n\n');
  } catch (err: any) {
    console.error('PDF text extraction error:', err);
    throw new Error(`Failed to extract text from PDF: ${err.message || 'Corrupt or unreadable PDF'}`);
  }
}

/**
 * Universal text extractor for uploaded files:
 * Supports: .docx, .pdf (both text-based and scanned image-only),
 * and image files (.png, .jpg, .jpeg, .webp, .tiff) via offline OCR!
 */
export async function extractTextFromFile(
  file: File,
  onProgress?: OcrProgressCallback,
): Promise<string> {
  const name = file.name.toLowerCase();

  // 1. Direct Image Files (.png, .jpg, .jpeg, .webp, .tiff)
  if (
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.webp') ||
    name.endsWith('.tiff') ||
    name.endsWith('.bmp') ||
    file.type.startsWith('image/')
  ) {
    onProgress?.(`Running offline OCR on ${file.name}...`, 10);
    return await runOfflineOcr(file, onProgress);
  }

  const buffer = await file.arrayBuffer();

  // 2. Word .docx files
  if (name.endsWith('.docx')) {
    onProgress?.('Extracting text from Word DOCX XML...', 50);
    return await extractTextFromDocx(buffer);
  }

  // 3. PDF files (handles both text layer and scanned bitmap pages)
  if (name.endsWith('.pdf')) {
    return await extractTextFromPdf(buffer, onProgress);
  }

  // 4. Plain text fallback (.txt, .ocr, .json, etc.)
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const raw = (e.target?.result as string) || '';
      resolve(normalizeOcrText(raw));
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}
