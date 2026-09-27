/**
 * Offline OCR Preprocessing & Post-Recognition Text Normalizer
 * Optimizes image contrast/binarization before Tesseract and fixes OCR artifacts after recognition.
 */

/**
 * Image preprocessor: upscales, converts to grayscale, normalizes contrast, and applies Otsu binarization.
 * Dramatically cuts OCR character confusions (e.g. 1 -> l, c) -> c¢) and improves boundary detection.
 */
export function preprocessImageForOcr(
  sourceCanvas: HTMLCanvasElement,
): HTMLCanvasElement {
  const minWidth = 1800;
  let targetWidth = sourceCanvas.width;
  let targetHeight = sourceCanvas.height;

  // 1. Upscale if low-resolution (below ~200-300 DPI)
  if (targetWidth < minWidth) {
    const scale = minWidth / targetWidth;
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return sourceCanvas;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(sourceCanvas, 0, 0, targetWidth, targetHeight);

  const imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  const data = imgData.data;
  const totalPixels = targetWidth * targetHeight;

  // 2. Grayscale & Histogram computation
  const histogram = new Uint32Array(256);
  let minGray = 255;
  let maxGray = 0;

  for (let i = 0; i < data.length; i += 4) {
    // Luminance grayscale formula
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;

    histogram[gray]++;
    if (gray < minGray) minGray = gray;
    if (gray > maxGray) maxGray = gray;
  }

  // 3. Contrast Stretching
  const range = maxGray - minGray || 1;
  for (let i = 0; i < data.length; i += 4) {
    const stretched = Math.round(((data[i] - minGray) / range) * 255);
    data[i] = stretched;
    data[i + 1] = stretched;
    data[i + 2] = stretched;
  }

  // 4. Otsu's Global Adaptive Thresholding for crisp binary text
  let sum = 0;
  for (let t = 0; t < 256; t++) {
    sum += t * histogram[t];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;
  let varMax = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    wF = totalPixels - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    const varBetween = wB * wF * (mB - mF) * (mB - mF);
    if (varBetween > varMax) {
      varMax = varBetween;
      threshold = t;
    }
  }

  // Bias threshold slightly towards dark text to prevent thinning strokes
  threshold = Math.min(210, Math.max(80, Math.round(threshold * 1.05)));

  for (let i = 0; i < data.length; i += 4) {
    const val = data[i] < threshold ? 0 : 255;
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

/**
 * Post-OCR Text Normalizer
 * Repairs typical OCR glitches, letter/digit swaps, glued option markers, and missing whitespace.
 */
export function normalizeOcrText(rawText: string): string {
  if (!rawText) return '';

  let text = rawText;

  // 1. Normalize Persian and Arabic numerals to ASCII digits
  text = text
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));

  // 2. Strip leading noise before section headers, e.g. "| B)" -> "B)" or "_ A." -> "A."
  text = text.replace(/(?:^|\n)\s*[|_\-~*#•]+\s*([A-Za-z\u0600-\u06FF])/g, '\n$1');

  // 3. Repair line-start question number confusions:
  // e.g. "l.Acatisan..." or "l. Acat..." or "I. The..." or "i. She..." -> "1. Acat..."
  text = text.replace(/(?:^|\n)\s*[lIi][\.\)]\s*(?=[A-Za-z\u0600-\u06FF])/g, (m) =>
    m.startsWith('\n') ? '\n1. ' : '1. ',
  );

  // 4. Glued question numbers: "2.Thesunis..." -> "2. Thesunis..."
  text = text.replace(/(?:^|\n)\s*(\d+)[\.\)]([A-Za-z\u0600-\u06FF])/g, (m, num, char) =>
    `${m.startsWith('\n') ? '\n' : ''}${num}. ${char}`,
  );

  // 5. Teacher question with capital "I" misread as "1": "3.1.........to school" -> "3. I ......... to school"
  text = text.replace(
    /(?:^|\n)\s*(\d+)[\.\)]\s*1\s*(\.{3,}|_{3,}|-{3,})/g,
    (m, num, blanks) => `${m.startsWith('\n') ? '\n' : ''}${num}. I ${blanks}`,
  );

  // 6. Option markers: handle OCR noise and missing spaces:
  // e.g. "c¢)blue" -> "c) blue", "c©)blue" -> "c) blue"
  text = text.replace(/([a-d])\s*[¢©*»>\]]\s*\)/gi, '$1)');

  // e.g. "a)animal" -> "a) animal", "b)car" -> "b) car"
  text = text.replace(/([a-d])\)\s*([^\s\)])/gi, '$1) $2');

  // e.g. "a.animal" -> "a. animal"
  text = text.replace(/([a-d])\.\s*([^\s\.])/gi, '$1. $2');

  // Persian options: "الف)حیوان" -> "الف) حیوان"
  text = text.replace(/(الف|ب|ج|د)\)\s*([^\s\)])/g, '$1) $2');

  // 7. Collapse long dot sequences: "........." -> "......"
  text = text.replace(/\.{5,}/g, '......');

  // 8. Fix common OCR glued words in Iranian exams
  text = text.replace(/\bared\b/g, 'a red');
  text = text.replace(/\bthesun\b/gi, 'the sun');
  text = text.replace(/\bacat\b/gi, 'a cat');

  return text;
}
