import {
  ExamDocument,
  ExamHeader,
  ExamSection,
  QuestionItem,
  QuestionType,
  ParsingAnomaly,
  ExamOption,
} from '../types/exam';

export interface ParseOptions {
  detectAnomalies?: boolean;
  normalizeNumbering?: boolean;
  linkClozePassages?: boolean;
}

/**
 * Converts Persian and Arabic numerals to Latin digits
 */
function toLatinDigits(str: string): string {
  return str
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632));
}

/**
 * Deterministic Rule-Based Parser for Persian, Arabic, and English Exams.
 * Operates purely offline in the browser with 0 API calls.
 */
export function parseExamRawText(
  rawText: string,
  filename: string = 'uploaded_exam.txt',
  options: ParseOptions = { detectAnomalies: true, normalizeNumbering: true, linkClozePassages: true },
): ExamDocument {
  const normText = toLatinDigits(rawText);

  // 1. Extract Header with lookaheads preventing field bleed
  const header: ExamHeader = extractExamHeader(normText);

  // 2. Break down into Sections based on Row identifiers (A, B, C... Q) or headers
  const rawSections = splitIntoRawSections(normText);

  // 3. Parse each section with specialized handlers
  const sections: ExamSection[] = [];
  const anomalies: ParsingAnomaly[] = [];
  let globalExpectedNumber = 1;

  for (const rawSec of rawSections) {
    const parsedSec = parseSectionBlock(
      rawSec,
      globalExpectedNumber,
      anomalies,
      options,
    );
    sections.push(parsedSec);
    globalExpectedNumber += parsedSec.questions.length;
  }

  // Calculate totals
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalMarks = Math.round(sections.reduce((sum, s) => sum + s.markTotal, 0) * 100) / 100;

  // 4. Calculate accurate confidence score penalizing real extraction failures
  const confidenceScore = calculateRealisticConfidenceScore(sections, header, anomalies);

  return {
    id: `exam-${Date.now()}`,
    filename,
    filesize: `${(normText.length / 1024).toFixed(1)} KB`,
    parsedAt: new Date().toISOString(),
    confidenceScore,
    header,
    sections,
    totalQuestions,
    totalMarks,
    anomalies,
  };
}

/**
 * Header boundary lookahead labels: prevents fields on the same line from swallowing adjacent fields.
 */
const HEADER_BOUNDARY =
  '(?=\\s*(?:نام\\s*درس|درس|مدت\\s*آزمون|مدت|تاریخ\\s*آزمون|تاریخ|نام\\s*دبیر|دبیر|نام\\s*مدرسه|مدرسه|دبیرستان|هنرستان|آموزشگاه|اداره\\s*کل|اداره\\s*آموزش\\s*و\\s*پرورش|اداره|مقطع\\s*و\\s*رشته|مقطع|رشته|پایه|تعداد\\s*صفحه|صفحه|نوبت|سال\\s*تحصیلی|Subject|Course|Duration|Time|Date|Teacher|School|District|Grade|Pages)|\\r?\\n|$)';

function extractHeaderField(text: string, labelRegex: RegExp): string | null {
  const fullPattern = new RegExp(labelRegex.source + `\\s*[:：]?\\s*([^\\n\\r]+?)` + HEADER_BOUNDARY, 'i');
  const match = text.match(fullPattern);
  if (match && match[1]) {
    const clean = match[1].trim().replace(/^[:：\-]\s*/, '').trim();
    return clean || null;
  }
  return null;
}

function extractExamHeader(text: string): ExamHeader {
  const courseMatch = extractHeaderField(text, /(?:نام\s*درس|درس|نام\s*آزمون|Subject|Course)/);
  const durationMatch = extractHeaderField(text, /(?:مدت\s*آزمون|مدت\s*پاسخگویی|مدت|Duration|Time)/);
  const dateMatch = extractHeaderField(text, /(?:تاریخ\s*آزمون|تاریخ|Date)/);
  const schoolMatch = extractHeaderField(text, /(?:نام\s*مدرسه|نام\s*آموزشگاه|دبیرستان|هنرستان|مدرسه|School)/);
  const districtMatch = extractHeaderField(text, /(?:اداره\s*کل\s*آموزش\s*و\s*پرورش|اداره\s*آموزش\s*و\s*پرورش|اداره|مدیریت\s*آموزش\s*و\s*پرورش|District)/);
  const gradeMatch = extractHeaderField(text, /(?:مقطع\s*و\s*رشته|مقطع|پایه\s*و\s*رشته|رشته|پایه|Grade)/);
  const teacherMatch = extractHeaderField(text, /(?:نام\s*دبیر|دبیر|طراح\s*سوال|مصحح|Teacher)/);
  const pageMatch = extractHeaderField(text, /(?:تعداد\s*صفحه|تعداد\s*صفحات|صفحه|Pages)/);

  // Extract duration number
  let durationMinutes = 80;
  if (durationMatch) {
    const num = parseInt(durationMatch.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 300) {
      durationMinutes = num;
    }
  }

  // Extract page count
  let pageCount = 5;
  if (pageMatch) {
    const num = parseInt(pageMatch.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 20) {
      pageCount = num;
    }
  }

  return {
    courseName: courseMatch || 'زبان انگلیسی',
    teacherName: teacherMatch ? `نام دبیر: ${teacherMatch}` : undefined,
    durationMinutes,
    examDate: dateMatch || '1403/10/17',
    schoolName: schoolMatch || (text.includes('دبیرستان') ? 'دبیرستان' : 'دبیرستان دوره دوم'),
    district: districtMatch || 'وزارت آموزش و پرورش',
    gradeAndMajor: gradeMatch ? `مقطع و رشته: ${gradeMatch}` : 'پایه دوازدهم',
    pageCount,
  };
}

interface RawSectionBlock {
  rowId: string;
  category: 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General';
  mark: number;
  text: string;
  headerLine: string;
}

/**
 * Splits raw text into section blocks according to table row letters (A..Q) or section titles.
 * Trailing marks on the header line (e.g. "A Choose the correct answer 2") are accurately parsed.
 */
function splitIntoRawSections(text: string): RawSectionBlock[] {
  // Common Iranian exam table layout has Row identifiers A..Q in column 1
  const rowPattern = /(?:^|\n)\s*([A-Q])[\.\s]+([^\n]+)/gi;
  const matches = Array.from(text.matchAll(rowPattern));

  if (matches.length === 0) {
    // Fallback: single general section
    return [
      {
        rowId: 'A',
        category: 'General',
        mark: 20,
        text,
        headerLine: 'General Section',
      },
    ];
  }

  const blocks: RawSectionBlock[] = [];

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rowId = match[1].toUpperCase();
    const headerLine = match[2].trim();
    const startIndex = match.index || 0;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index || text.length : text.length;
    const blockText = text.slice(startIndex, endIndex);

    // 1. Detect Category: defaults to 'General' and analyzes Persian + English keywords
    const category = detectInitialCategory(headerLine, blockText);

    // 2. Extract section mark from:
    // a) Trailing mark on the section-header line (e.g. "A Choose the correct answer 2" or "... (1.5)")
    // b) Standalone line with number or "بارم: X" / "نمره: X"
    let mark = extractSectionMark(headerLine, blockText);

    blocks.push({
      rowId,
      category,
      mark,
      text: blockText,
      headerLine,
    });
  }

  return blocks;
}

/**
 * Extracts the section's total mark from header line or section content.
 */
function extractSectionMark(headerLine: string, blockText: string): number {
  // Check trailing mark on header line: e.g. "A Choose the correct answer 2", "... (1.5)", "... 2 نمره"
  const trailingHeaderMatch = headerLine.match(/(?:^|\s)(?:\(([\d\.]+)\)|([\d\.]+))\s*(?:نمره|pts?|points?|marks?)?\s*$/i);
  if (trailingHeaderMatch) {
    const valStr = trailingHeaderMatch[1] || trailingHeaderMatch[2];
    const val = parseFloat(valStr.startsWith('.') ? `0${valStr}` : valStr);
    if (!isNaN(val) && val > 0 && val <= 30) {
      return val;
    }
  }

  // Check for explicit "بارم: X" or "نمره: X" inside the block
  const explicitMarkMatch = blockText.match(/(?:بارم|نمره|mark|points?)\s*[:：]?\s*([\d\.]+)/i);
  if (explicitMarkMatch) {
    const val = parseFloat(explicitMarkMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 30) {
      return val;
    }
  }

  // Check standalone number at the very end of block or on its own line
  const standaloneMarkMatch = blockText.match(/(?:^|\n)\s*(\d+(?:\.\d+)?|\.\d+)\s*$/m);
  if (standaloneMarkMatch) {
    const valStr = standaloneMarkMatch[1];
    const val = parseFloat(valStr.startsWith('.') ? `0${valStr}` : valStr);
    if (!isNaN(val) && val > 0 && val <= 30) {
      return val;
    }
  }

  // Default to 1 if completely unstated
  return 1;
}

/**
 * Detects the section's major category from English & Persian keywords.
 * Defaults to 'General' (NOT 'Listening').
 */
function detectInitialCategory(
  headerLine: string,
  blockText: string,
): 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General' {
  const combined = `${headerLine}\n${blockText.slice(0, 300)}`.toLowerCase();

  // 1. Listening (Persian + English)
  if (
    /listening|audio\s*\d+|listen\s+to|شنیداری|شنیدن|گوش\s*دهید|فایل\s*صوتی|مکالمه\s*صوتی|صوت/i.test(
      combined,
    )
  ) {
    return 'Listening';
  }

  // 2. Reading / Cloze (Persian + English)
  if (
    /reading\s+comprehension|passage\s+[ivx\d]|read\s+the\s+(?:following\s+)?(?:passage|text)|cloze\s*test|درک\s*مطلب|متن\s*زیر\s*را\s*بخوانید|ریدینگ|کلوز|با\s*توجه\s*به\s*متن/i.test(
      combined,
    )
  ) {
    return 'Reading';
  }

  // 3. Vocabulary / Word Bank (Persian + English)
  if (
    /vocabulary|words?\s+in\s+the\s+box|using\s+the\s+words|words?\s+given|fill\s+in\s+the\s+blanks?\s+with\s+(?:the\s+)?words?|spelling|definitions?|واژگان|واژه|لغت|لغات|کلمات\s+داده\s+شده|کلمات\s+زیر|کادر|جعبه|املا|حروف\s*افتاده|با\s*توجه\s*به\s*تصویر|تصاویر|تعاریف/i.test(
      combined,
    )
  ) {
    return 'Vocabulary';
  }

  // 4. Grammar / Structures (Persian + English)
  if (
    /grammar|grammatical|correct\s+form\s+of\s+the\s+words?\s+in\s+parentheses|active\s+or\s+passive|tenses?|دستور\s*زبان|دستور|گرامر|قواعد|شکل\s*صحیح\s*کلمات\s*داخل\s*پرانتز|معلوم\s*و\s*مجهول|زمان\s*افعال|زمان\s*فعل/i.test(
      combined,
    )
  ) {
    return 'Grammar';
  }

  // 5. Writing / Unscramble / Sentence combination (Persian + English)
  if (
    /writing|unscramble|reorder|punctuation|capitalization|make\s+a\s+sentence|combine\s+the\s+sentences?|نگارش|نوشتن|مرتب\s*کنید|جملات\s*زیر\s*را\s*مرتب\s*کنید|کلمات\s*درهم\s*ریخته|علائم\s*نگارشی/i.test(
      combined,
    )
  ) {
    return 'Writing';
  }

  return 'General';
}

function parseSectionBlock(
  rawSec: RawSectionBlock,
  startNumber: number,
  anomalies: ParsingAnomaly[],
  options: ParseOptions,
): ExamSection {
  const { rowId, text, headerLine } = rawSec;
  let category = rawSec.category;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let title = `Section ${rowId}`;
  if (headerLine && headerLine.length > 2) {
    title = `Section ${rowId}: ${headerLine.replace(/[\d\.]+\s*(?:نمره|pts?|points?|marks?)?\s*$/i, '').trim()}`;
  }

  let persianInstruction = '';
  let englishInstruction = '';
  let hasWordBank = false;
  let wordBank: string[] = [];
  let hasPassage = false;
  let passageTitle = '';
  let passageText = '';

  // Extract instructions
  const persianLines = lines.filter(
    (l) => /[\u0600-\u06FF]/.test(l) && !/^\d+[\.\)]/.test(l) && !/دبیرستان|آموزش و پرورش|نام درس/i.test(l),
  );
  if (persianLines.length > 0) {
    persianInstruction = persianLines.join(' ');
  }

  const englishInstLines = lines.filter(
    (l) =>
      /^(?:Choose|Fill in|Read|Match|Write|Make|Unscramble|Complete|Listen|Answer|Look at)/i.test(l) ||
      /\b(?:correct answer|words given|parentheses|following passage)\b/i.test(l),
  );
  if (englishInstLines.length > 0) {
    englishInstruction = englishInstLines[0];
  }

  // --- 2. Word Bank Extraction ---
  // Trigger on wider phrasings: "words in the box", "using the words", "box below", "one is extra", Persian "کادر", etc.
  const wordBankTriggerRegex =
    /(?:words?\s+in\s+the\s+box|using\s+the\s+words|words?\s+given|box\s+below|one\s+is\s+extra|from\s+the\s+box|fill\s+in\s+the\s+blanks?\s+with\s+(?:the\s+)?words?|complete\s+the\s+sentences?\s+with\s+(?:the\s+)?words?|کلمات\s+داده\s+شده|کلمات\s+زیر|کادر|جعبه|یک\s+کلمه\s+اضافی)/i;

  if (wordBankTriggerRegex.test(text)) {
    // Detect the box: a line with 3+ standalone words sitting near the instruction before numbered questions start
    wordBank = extractWordBankWords(lines);
    if (wordBank.length >= 3) {
      hasWordBank = true;
      if (category === 'General') {
        category = 'Vocabulary';
      }
    } else {
      // Flag undetected word bank
      anomalies.push({
        id: `anom-wb-empty-${rowId}`,
        severity: 'warning',
        sectionRowId: rowId,
        title: 'Word Bank Words Not Isolated',
        description: `Section ${rowId} instruction indicates a word bank, but the candidate word box could not be cleanly extracted.`,
        suggestedFix: 'Manually add candidate words to the section word bank.',
      });
    }
  }

  // --- Cloze Test Extraction ---
  if (/cloze/i.test(text) || /\b\d+\)\s*-+/.test(text)) {
    hasPassage = true;
    passageTitle = `Cloze Passage (${rowId})`;
    const passageLines = lines.filter(
      (l) =>
        !/cloze|جاهای خالی|Choose|Read the following|^\s*[A-Q][\.\s]/i.test(l) &&
        !/^\d+\.?[a-d]\./i.test(l) &&
        !/^[a-d]\./i.test(l) &&
        !/^\d+[\.\)]\s*[a-d]/i.test(l) &&
        l.length > 25,
    );
    passageText = passageLines.join(' ');
    if (category === 'General') category = 'Reading';
  }

  // --- Reading Passage Extraction ---
  if (/Passage\s+(?:I|II|\d+)|Reading\s+comprehension|درک\s*مطلب/i.test(text)) {
    hasPassage = true;
    const passageMatch = text.match(/(Passage\s+(?:I|II|\d+)[^\n]*)/i);
    passageTitle = passageMatch ? passageMatch[1] : `Reading Passage (${rowId})`;
    const bodyLines = lines.filter(
      (l) =>
        !/Reading comprehension|درک\s*مطلب|Passage\s+[I|V|X\d]|^\s*[A-Q][\.\s]/i.test(l) &&
        !/^\d+[\.\)]/i.test(l) &&
        l.length > 35,
    );
    passageText = bodyLines.join('\n');
    if (category === 'General') category = 'Reading';
  }

  // --- Extract Questions inside this section ---
  const questions: QuestionItem[] = extractQuestionsFromText(
    text,
    rowId,
    category,
    wordBank,
    passageText,
    rawSec.mark,
    startNumber,
    anomalies,
    options,
  );

  // Question shape-based category refinement
  if (category === 'General' && questions.length > 0) {
    category = refineCategoryByQuestionShapes(questions, hasWordBank, hasPassage);
    // Update sectionName on questions
    questions.forEach((q) => {
      q.sectionName = category;
    });
  }

  // --- Mark Allocation ---
  // If questions had explicit marks printed, recalculate section total;
  // otherwise, divide rawSec.mark equally across the questions.
  const questionsHaveExplicitMarks = questions.some((q) => q.mark !== 0.5 && q.mark > 0);
  let finalMarkTotal = rawSec.mark;

  if (questionsHaveExplicitMarks) {
    finalMarkTotal = Math.round(questions.reduce((sum, q) => sum + q.mark, 0) * 100) / 100;
  } else if (questions.length > 0 && finalMarkTotal > 0) {
    const perQ = Math.round((finalMarkTotal / questions.length) * 100) / 100;
    questions.forEach((q) => {
      q.mark = perQ;
    });
  }

  return {
    rowId,
    majorCategory: category,
    title,
    persianInstruction: persianInstruction || undefined,
    englishInstruction: englishInstruction || undefined,
    markTotal: finalMarkTotal,
    questions,
    hasWordBank,
    wordBank: wordBank.length ? wordBank : undefined,
    hasPassage,
    passageTitle: passageTitle || undefined,
    passageText: passageText || undefined,
  };
}

/**
 * Extracts candidate words from a word bank box sitting near the instruction.
 * Preserves multi-word entries (e.g. "take care of", "give up") when separated by commas or slashes.
 */
function extractWordBankWords(lines: string[]): string[] {
  // Find lines before the first numbered question that look like a word list
  const nonQuestionLines = [];
  for (const line of lines) {
    if (/^\s*\d+[\.\)]/.test(line)) break; // stop at question 1
    nonQuestionLines.push(line);
  }

  for (const line of nonQuestionLines) {
    // Skip pure Persian or instruction lines
    if (/^(?:Fill in|Complete|Using the|Words in|کلمات|جاهای خالی|[A-Q]\b)/i.test(line) && !line.includes(',')) {
      continue;
    }

    // Case 1: Comma or slash separated list: "word1, word2, take care of, word3"
    if (line.includes(',') || line.includes('/') || line.includes(';')) {
      const items = line
        .split(/[,/;]/)
        .map((w) => w.trim().replace(/^[-–—\[\(]+|[-–—\]\)]+$/g, ''))
        .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));
      if (items.length >= 3) {
        return items;
      }
    }

    // Case 2: Multi-space or tab separated words: "figure   effectively   appreciate   founded"
    const spaceTokens = line
      .split(/\s{2,}|\t+/)
      .map((w) => w.trim().replace(/^[-–—\[\(]+|[-–—\]\)]+$/g, ''))
      .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));

    if (spaceTokens.length >= 3) {
      return spaceTokens;
    }

    // Case 3: Space-separated line of 3+ clean English words
    const singleSpaceTokens = line
      .split(/\s+/)
      .map((w) => w.trim().replace(/^[^\w]+|[^\w]+$/g, ''))
      .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));

    if (
      singleSpaceTokens.length >= 3 &&
      singleSpaceTokens.length <= 14 &&
      !singleSpaceTokens.includes('the') &&
      !singleSpaceTokens.includes('is') &&
      !singleSpaceTokens.includes('are')
    ) {
      return singleSpaceTokens;
    }
  }

  return [];
}

/**
 * Refines a section category based on the extracted questions
 */
function refineCategoryByQuestionShapes(
  questions: QuestionItem[],
  hasWordBank: boolean,
  hasPassage: boolean,
): 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General' {
  if (hasPassage || questions.some((q) => q.parentContextType === 'reading_passage' || q.parentContextType === 'cloze_passage')) {
    return 'Reading';
  }
  if (hasWordBank || questions.some((q) => q.type === 'word_bank_fill')) {
    return 'Vocabulary';
  }
  if (questions.some((q) => q.type === 'unscramble' || q.type === 'combine_sentences' || q.type === 'letter_reorder')) {
    return 'Writing';
  }
  if (questions.some((q) => q.type === 'form_in_parentheses' || q.type === 'active_passive')) {
    return 'Grammar';
  }
  if (questions.some((q) => q.type === 'multiple_choice' || q.type === 'inline_choice')) {
    // If stems check tenses / auxiliary verbs -> Grammar, else Vocabulary
    const grammarMatches = questions.filter((q) =>
      /\b(?:didn't|doesn't|was|were|have been|had been|if|will|would|can|could|by the time)\b/i.test(q.stem),
    );
    if (grammarMatches.length >= questions.length / 2) {
      return 'Grammar';
    }
    return 'Vocabulary';
  }
  return 'General';
}

function extractQuestionsFromText(
  text: string,
  rowId: string,
  category: string,
  wordBank: string[],
  passageText: string,
  sectionMark: number,
  globalExpectedNumber: number,
  anomalies: ParsingAnomaly[],
  options: ParseOptions,
): QuestionItem[] {
  const items: QuestionItem[] = [];

  // Question numbering regex: "1. ...", "1) ...", "27. ...", "31. Did Alexander Flemming 44..."
  const itemRegex = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n\r]+(?:\n(?!\s*\d+[\.\)]|[A-Q][\.\s])[^\n\r]+)*)/g;
  const matches = Array.from(text.matchAll(itemRegex));

  for (let i = 0; i < matches.length; i++) {
    const rawNumber = parseInt(matches[i][1], 10);
    let rawContent = matches[i][2].trim();

    // Check for trailing per-question mark: e.g. "(0.5)", "[0.5]", "(1 pt)", "0.5 نمره"
    let qMark = 0.5;
    const markMatch = rawContent.match(
      /(?:^|\s)(?:\(([\d\.]+)\s*(?:نمره|pts?|points?|marks?)?\)|\[([\d\.]+)\]|([\d\.]+)\s*(?:نمره|pts?|marks?))\s*$/i,
    );
    if (markMatch) {
      const parsedVal = parseFloat(markMatch[1] || markMatch[2] || markMatch[3]);
      if (!isNaN(parsedVal) && parsedVal > 0 && parsedVal <= 10) {
        qMark = parsedVal;
        // Strip mark annotation from rawContent
        rawContent = rawContent.replace(markMatch[0], '').trim();
      }
    }

    // Check for Dual/Ghost Numbering:
    // e.g. "31. Did Alexander Flemming 44......" or "34. 58. The teacher..."
    let finalNumber = rawNumber;
    let originalNumber: number | undefined = undefined;

    // Check dual prefix: "34. 58. The teacher..."
    const dualPrefixMatch = rawContent.match(/^(\d+)[\.\)]\s+(.*)$/);
    if (dualPrefixMatch) {
      const secondNum = parseInt(dualPrefixMatch[1], 10);
      originalNumber = rawNumber;
      if (options.normalizeNumbering) {
        finalNumber = secondNum;
        rawContent = dualPrefixMatch[2].trim();
        anomalies.push({
          id: `anom-dual-${rowId}-${finalNumber}`,
          severity: 'info',
          sectionRowId: rowId,
          questionNumber: finalNumber,
          title: 'Dual Numbering Resolved',
          description: `Item originally started with dual index "${rawNumber}. ${secondNum}.". Normalized to Question ${finalNumber}.`,
          suggestedFix: `Re-indexed to ${finalNumber}.`,
          isResolved: true,
        });
      }
    } else {
      // Check embedded ghost number in stem: "Did Alexander Flemming 44......"
      const embeddedGhostMatch = rawContent.match(/\b(\d{2})\b(?:\s*[\.\-–_]+|\s*\.\.\.\.)/);
      if (embeddedGhostMatch) {
        const innerNum = parseInt(embeddedGhostMatch[1], 10);
        if (innerNum >= 20 && innerNum <= 99 && innerNum !== rawNumber) {
          originalNumber = rawNumber;
          if (options.normalizeNumbering) {
            finalNumber = innerNum;
            // Clean the ghost number from stem
            rawContent = rawContent.replace(embeddedGhostMatch[0], embeddedGhostMatch[0].replace(embeddedGhostMatch[1], '')).trim();
            anomalies.push({
              id: `anom-ghost-${rowId}-${finalNumber}`,
              severity: 'info',
              sectionRowId: rowId,
              questionNumber: finalNumber,
              title: 'Ghost Drafting Index Normalized',
              description: `Teacher draft index "${rawNumber}." normalized to printed question index "${innerNum}.". Ghost number stripped from question stem.`,
              suggestedFix: `Question is now index ${innerNum}.`,
              isResolved: true,
            });
          } else {
            anomalies.push({
              id: `anom-ghost-unresolved-${rowId}-${rawNumber}`,
              severity: 'warning',
              sectionRowId: rowId,
              questionNumber: rawNumber,
              title: 'Possible Dual Numbering or Ghost Index',
              description: `Stem for item ${rawNumber} contains unexpected inner number "${innerNum}".`,
              suggestedFix: `Inspect if actual question index is ${innerNum}.`,
              isResolved: false,
            });
          }
        }
      }
    }

    // --- Option Parsing ---
    // Extract MCQ options cleanly: capture option text up to the next a-d./a-d) marker or line end
    const mcqResult = extractMultipleChoiceOptions(rawContent);

    // Extract Inline Choice: "( don't / doesn't )" or "( on / in / at )"
    const inlineChoiceResult = extractInlineChoices(rawContent);

    // Determine Question Type & Stem
    let type: QuestionType = 'short_answer';
    let stem = rawContent;
    let optionsList: ExamOption[] | undefined = undefined;

    if (mcqResult) {
      type = 'multiple_choice';
      stem = mcqResult.stem;
      optionsList = mcqResult.options;
    } else if (inlineChoiceResult) {
      type = 'inline_choice';
      stem = rawContent;
      optionsList = inlineChoiceResult.options;
    } else if (
      /\b(?:True\s*\/\s*False|True\s+or\s+False|T\s*\/\s*F)\b/i.test(rawContent) ||
      (/\bTrue\b/i.test(rawContent) && /\bFalse\b/i.test(rawContent)) ||
      /\b(?:درست\s*\/\s*نادرست|صحیح\s*\/\s*غلط)\b/.test(rawContent)
    ) {
      type = 'true_false';
      optionsList = [
        { id: 'true', text: 'True' },
        { id: 'false', text: 'False' },
      ];
    } else if (
      wordBank.length > 0 &&
      (rawContent.includes('----') ||
        rawContent.includes('....') ||
        rawContent.includes('____') ||
        rawContent.includes('(___)') ||
        rawContent.includes('(......)'))
    ) {
      type = 'word_bank_fill';
    } else if (
      rawContent.includes('(') &&
      rawContent.includes(')') &&
      /\b(?:break|travel|speak|have|see|give|write|go|live|study|come|read)\b/i.test(rawContent)
    ) {
      type = 'form_in_parentheses';
    } else if (rawContent.includes('/') && rawContent.split('/').length >= 3) {
      type = 'unscramble';
    } else if (rawContent.includes('active:') || rawContent.includes('passive:')) {
      type = 'active_passive';
    } else if (
      rawContent.includes('----') ||
      rawContent.includes('....') ||
      rawContent.includes('____')
    ) {
      type = 'fill_blank';
    }

    // Context attachment
    let parentContextType: 'word_bank' | 'cloze_passage' | 'reading_passage' | 'none' = 'none';
    let parentContextTitle: string | undefined;

    if (type === 'word_bank_fill' || (wordBank.length > 0 && (type === 'fill_blank' || type === 'short_answer'))) {
      type = 'word_bank_fill';
      parentContextType = 'word_bank';
      parentContextTitle = `Word Bank (${rowId})`;
    } else if (passageText && passageText.length > 20) {
      const isCloze = /cloze/i.test(passageText) || /\[\d+\]/.test(passageText);
      if (isCloze && type === 'multiple_choice') {
        type = 'cloze_item';
      }
      parentContextType = isCloze ? 'cloze_passage' : 'reading_passage';
      parentContextTitle = `Passage (${rowId})`;
    }

    // Validation checks for anomalies
    if (stem.length < 5) {
      anomalies.push({
        id: `anom-stem-empty-${rowId}-${finalNumber}`,
        severity: 'error',
        sectionRowId: rowId,
        questionNumber: finalNumber,
        title: 'Empty or Incomplete Question Stem',
        description: `Question ${finalNumber} has a stem with fewer than 5 characters.`,
        suggestedFix: 'Review original exam file to verify question text.',
        isResolved: false,
      });
    }

    items.push({
      id: `q-${rowId}-${finalNumber}-${i}`,
      number: finalNumber,
      displayNumber: String(finalNumber),
      originalNumber,
      sectionRowId: rowId,
      sectionName: category,
      type,
      stem,
      options: optionsList,
      mark: qMark,
      parentContextType,
      parentContextTitle,
      wordBankWords: wordBank.length ? wordBank : undefined,
    });
  }

  return items;
}

/**
 * Extracts multiple choice options cleanly without word-internal truncation.
 * Captures option text up to the next option marker (a., b., c., d. or (a), (b), (c), (d)) or line end.
 */
function extractMultipleChoiceOptions(rawContent: string): { options: ExamOption[]; stem: string } | null {
  // Matches options like: "a. ...", "a) ...", "(a) ...", "A. ..."
  const markerRegex = /(?:^|\s)(?:([a-d])[\.\)]|\(([a-d])\))\s+/gi;
  const matches = Array.from(rawContent.matchAll(markerRegex));

  if (matches.length < 2) {
    return null;
  }

  const letters = matches.map((m) => (m[1] || m[2]).toLowerCase());
  const uniqueLetters = new Set(letters);
  if (uniqueLetters.size < 2) {
    return null;
  }

  const firstMatchIndex = matches[0].index!;
  const stem = rawContent.slice(0, firstMatchIndex).trim();

  const options: ExamOption[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const letter = (current[1] || current[2]).toLowerCase();
    const contentStart = current.index! + current[0].length;
    const nextStart = i < matches.length - 1 ? matches[i + 1].index! : rawContent.length;
    const optionText = rawContent.slice(contentStart, nextStart).trim();

    if (optionText) {
      options.push({
        id: letter,
        text: optionText,
      });
    }
  }

  return options.length >= 2 ? { options, stem } : null;
}

/**
 * Extracts inline choice patterns inside question stems like:
 * "She ( don't / doesn't ) like cold weather."
 * "They went ( on / in / at ) foot."
 */
function extractInlineChoices(text: string): { options: ExamOption[] } | null {
  const inlineRegex = /\(\s*([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)?)\s*[\/|\\]\s*([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)?)(?:\s*[\/|\\]\s*([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)?))?\s*\)/;
  const match = text.match(inlineRegex);

  if (!match) return null;

  const choices: string[] = [match[1].trim(), match[2].trim()];
  if (match[3]) {
    choices.push(match[3].trim());
  }

  const options: ExamOption[] = choices.map((c, idx) => ({
    id: String.fromCharCode(97 + idx), // 'a', 'b', 'c'
    text: c,
  }));

  return { options };
}

/**
 * Calculates a realistic confidence score penalizing real extraction failures:
 * - Empty sections
 * - Empty stems
 * - Undetected marks
 * - MCQs with < 2 options
 * - Undetected word banks / passages
 */
function calculateRealisticConfidenceScore(
  sections: ExamSection[],
  header: ExamHeader,
  anomalies: ParsingAnomaly[],
): number {
  let penalty = 0;

  // Penalize anomaly counts
  const warningCount = anomalies.filter((a) => a.severity === 'warning' && !a.isResolved).length;
  const errorCount = anomalies.filter((a) => a.severity === 'error' && !a.isResolved).length;
  penalty += warningCount * 2.0;
  penalty += errorCount * 5.0;

  // Penalize sections with no questions
  for (const s of sections) {
    if (s.questions.length === 0) {
      penalty += 8.0;
      anomalies.push({
        id: `anom-empty-sec-${s.rowId}`,
        severity: 'error',
        sectionRowId: s.rowId,
        title: 'Empty Section Extracted',
        description: `Section ${s.rowId} contains no parsed questions.`,
        suggestedFix: 'Inspect if section layout or numbering requires custom delimiter.',
        isResolved: false,
      });
    }

    // Penalize unextracted marks
    if (s.markTotal <= 0) {
      penalty += 3.0;
      anomalies.push({
        id: `anom-mark-missing-${s.rowId}`,
        severity: 'warning',
        sectionRowId: s.rowId,
        title: 'Undetected Section Mark',
        description: `Section ${s.rowId} has no mark/بارم specified.`,
        suggestedFix: 'Assign appropriate score from exam paper.',
        isResolved: false,
      });
    }

    // Penalize MCQs with < 2 options
    for (const q of s.questions) {
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        penalty += 4.0;
        anomalies.push({
          id: `anom-mcq-opts-${q.id}`,
          severity: 'error',
          sectionRowId: s.rowId,
          questionNumber: q.number,
          title: 'Multiple Choice Item Missing Options',
          description: `Question ${q.number} is classified as MCQ but has fewer than 2 parsed options.`,
          suggestedFix: 'Check whether options are placed on subsequent lines or formatted unusually.',
          isResolved: false,
        });
      }

      if (!q.stem || q.stem.trim().length < 4) {
        penalty += 4.0;
      }
    }
  }

  // Header completeness penalty
  if (!header.courseName || header.courseName === 'زبان انگلیسی') {
    penalty += 1.0;
  }
  if (!header.schoolName || header.schoolName === 'دبیرستان') {
    penalty += 1.0;
  }

  const finalScore = Math.max(30, Math.min(100, Math.round((100 - penalty) * 10) / 10));
  return finalScore;
}
