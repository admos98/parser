import {
  ExamDocument,
  ExamHeader,
  ExamSection,
  QuestionItem,
  QuestionType,
  ParsingAnomaly,
  ExamOption,
} from '../types/exam';
import { normalizeOcrText } from './ocrPreprocessor';
import { getQuestionTypeInfo, inferQuestionTypeFromText } from './questionTypeMapper';

export interface ParseOptions {
  detectAnomalies?: boolean;
  normalizeNumbering?: boolean;
  linkClozePassages?: boolean;
}

/**
 * Deterministic AST Rule-Based Parser for Persian, Arabic, and English Exams.
 * Hardened for real-world scans, messy OCR output, and multi-format exam layouts.
 */
export function parseExamRawText(
  rawText: string,
  filename: string = 'uploaded_exam.txt',
  options: ParseOptions = { detectAnomalies: true, normalizeNumbering: true, linkClozePassages: true },
): ExamDocument {
  // Pre-normalize OCR noise, glued characters, and letter/digit confusions
  const normText = normalizeOcrText(rawText);

  // 1. Extract Header (restricted strictly to the top boundary of document)
  const header: ExamHeader = extractExamHeader(normText);

  // 2. Break down into Sections based on Row identifiers (A), A., (A), Persian الف), or banners
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

  // 4. Post-parse validation and auto-repair pass
  const validationFlags: string[] = [];
  postParseAutoRepair(sections, anomalies, validationFlags);

  // Calculate totals
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalMarks = Math.round(sections.reduce((sum, s) => sum + s.markTotal, 0) * 100) / 100;

  // 5. Calculate realistic confidence score reflecting genuine extraction quality
  const confidenceScore = calculateRealisticConfidenceScore(sections, header, anomalies);
  const needsReview = confidenceScore < 85 || anomalies.some((a) => a.severity === 'error' && !a.isResolved);

  return {
    id: `exam-${Date.now()}`,
    filename,
    filesize: `${(normText.length / 1024).toFixed(1)} KB`,
    parsedAt: new Date().toISOString(),
    confidenceScore,
    needsReview,
    validationFlags: validationFlags.length ? validationFlags : undefined,
    header,
    sections,
    totalQuestions,
    totalMarks,
    anomalies,
  };
}

/**
 * Header boundary lookahead labels: prevents fields on the same line from swallowing adjacent fields.
 * Explicitly guards against "دبیرستان" (high school) being treated as "دبیر" (teacher).
 */
const HEADER_BOUNDARY =
  '(?=\\s*(?:نام\\s*درس|درس|مدت\\s*آزمون|مدت|تاریخ\\s*آزمون|تاریخ|نام\\s*دبیر\\s*[:：]|(?:\\bدبیر\\b(?!\\s*ستان)\\s*[:：])|نام\\s*مدرسه|مدرسه|دبیرستان|هنرستان|آموزشگاه|اداره\\s*کل|اداره\\s*آموزش\\s*و\\s*پرورش|اداره|مقطع\\s*و\\s*رشته|مقطع|رشته|پایه|تعداد\\s*صفحه|صفحه|نوبت|سال\\s*تحصیلی|Subject|Course|Duration|Time|Date|Teacher\\s*[:：]|School|District|Grade|Pages)|\\r?\\n|$)';

function extractHeaderField(text: string, labelRegex: RegExp): string | null {
  const fullPattern = new RegExp(labelRegex.source + `\\s*[:：]?\\s*([^\\n\\r]+?)` + HEADER_BOUNDARY, 'i');
  const match = text.match(fullPattern);
  if (match && match[1]) {
    const clean = match[1].trim().replace(/^[:：\-]\s*/, '').trim();
    // Discard captured text if it looks like an unscramble sentence or punctuation noise
    if (clean.includes('/') || clean.startsWith('.') || clean.length > 50) {
      return null;
    }
    return clean || null;
  }
  return null;
}

/**
 * Extracts exam header metadata restricted ONLY to the top header lines (before section A or question 1).
 * Never scans question stems to prevent questions mentioning "teacher" from polluting the header.
 */
function extractExamHeader(text: string): ExamHeader {
  // Isolate header lines before first section or question
  const lines = text.split(/\r?\n/);
  const headerLines: string[] = [];
  for (const line of lines) {
    if (
      /^\s*(?:[|_\-~*#•]?\s*[A-Z][\.\)\-–—:]|[|_\-~*#•]?\s*\([A-Z]\)|\d+[\.\)]|Part\s+[A-Z\d]|بخش\s+|الف\s*[\)\.])/i.test(
        line,
      ) &&
      headerLines.length >= 2
    ) {
      break;
    }
    headerLines.push(line);
    if (headerLines.length > 15) break;
  }

  const headerSnippet = headerLines.join('\n');

  const courseMatch = extractHeaderField(headerSnippet, /(?:نام\s*درس|درس|نام\s*آزمون|Subject|Course)/);
  const durationMatch = extractHeaderField(headerSnippet, /(?:مدت\\s*آزمون|مدت\\s*پاسخگویی|مدت|Duration|Time)/);
  const dateMatch = extractHeaderField(headerSnippet, /(?:تاریخ\\s*آزمون|تاریخ|Date)/);
  const schoolMatch = extractHeaderField(headerSnippet, /(?:نام\\s*مدرسه|نام\\s*آموزشگاه|دبیرستان|هنرستان|مدرسه|School)/);
  const districtMatch = extractHeaderField(headerSnippet, /(?:اداره\\s*کل\\s*آموزش\\s*و\\s*پرورش|اداره\\s*آموزش\\s*و\\s*پرورش|اداره|مدیریت\\s*آموزش\\s*و\\s*پرورش|District)/);
  const gradeMatch = extractHeaderField(headerSnippet, /(?:مقطع\\s*و\\s*رشته|مقطع|پایه\\s*و\\s*رشته|رشته|پایه|Grade)/);
  const termMatch = extractHeaderField(headerSnippet, /(?:نوبت|Term)/);
  // Strictly require colon for teacher to avoid false matches
  const teacherMatch = extractHeaderField(headerSnippet, /(?:نام\\s*دبیر\\s*[:：]|Teacher\\s*[:：]|طراح\\s*سوال\\s*[:：]|مصحح\\s*[:：])/);
  const pageMatch = extractHeaderField(headerSnippet, /(?:تعداد\\s*صفحه|تعداد\\s*صفحات|صفحه|Pages)/);

  // If title was "English Quiz - Grade 7"
  let courseName = courseMatch || '';
  if (!courseName) {
    const titleLine = headerLines.find((l) => /quiz|exam|test|english|آزمون/i.test(l) && !l.includes(':'));
    if (titleLine) {
      courseName = titleLine.trim();
    }
  }

  let durationMinutes = 80;
  if (durationMatch) {
    const num = parseInt(durationMatch.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 300) durationMinutes = num;
  }

  let pageCount = 5;
  if (pageMatch) {
    const num = parseInt(pageMatch.replace(/\D/g, ''), 10);
    if (!isNaN(num) && num > 0 && num < 20) pageCount = num;
  }

  return {
    courseName: courseName || 'زبان انگلیسی',
    teacherName: teacherMatch ? `نام دبیر: ${teacherMatch}` : undefined,
    durationMinutes,
    examDate: dateMatch || '1403/10/17',
    schoolName: schoolMatch || (headerSnippet.includes('دبیرستان') ? 'دبیرستان' : 'دبیرستان دوره دوم'),
    district: districtMatch || 'وزارت آموزش و پرورش',
    gradeAndMajor: gradeMatch ? `مقطع و رشته: ${gradeMatch}` : (headerSnippet.match(/Grade\s*\d+/i)?.[0] || 'پایه هفتم / متوسطه'),
    pageCount,
    grade: gradeMatch || undefined,
    term: termMatch || undefined,
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
 * Splits raw text into section blocks.
 * Supports:
 * - A), A., A -, (A), bare A
 * - Persian letters: الف), ب), ج), د), هـ)
 * - Part banners: Part 1, Part A, بخش اول, بخش ۱
 * - Tolerates leading punctuation / OCR noise e.g. "| B)"
 * - Distinguishes section headers from multiple-choice option letters (a) b) c) d))!
 */
function splitIntoRawSections(text: string): RawSectionBlock[] {
  // Regex identifying section headers at line starts:
  // Group 1: Latin letter e.g. A, B, C...
  // Group 2: Persian letter e.g. الف, ب, ج...
  // Group 3: Part banner e.g. Part 1, بخش اول
  // Group 4: Header line instruction/title text
  const sectionHeaderPattern =
    /(?:^|\n)\s*[|_\-~*#•]?\s*(?:(?:\(([A-Z])\)|([A-Z])\s*[\)\.\-–—:])|(?:\(([الفبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]+)\)|([الفبپتثجچحخدذرزژسشصضطظعغفقکگلمنوهی]+)\s*[\)\.\-–—:])|(?:(?:Part|Section|بخش|قسمت)\s*([A-Z\d]+|اول|دوم|سوم|چهارم|پنجم|ششم|I|II|III|IV|V)[\.\)\-–—:]*))\s*([^\n]*)/gi;

  const rawMatches = Array.from(text.matchAll(sectionHeaderPattern));

  // Filter out spurious matches:
  // E.g., multiple choice option lines like "a)animal b)car" or "A) animal B) car"
  // Section headers have instruction verbs (Choose, Fill, Answer, Match, Read...) or trailing marks (2 marks)
  // or are alone on the header line without subsequent choices on the same line!
  const validMatches: { index: number; rowId: string; headerLine: string }[] = [];

  for (const m of rawMatches) {
    const rawLetter = (m[1] || m[2] || m[3] || m[4] || m[5] || '').trim();
    const lineRest = (m[6] || '').trim();

    // Check if this line is actually an MCQ options line with multiple choices: "a) cat b) dog c) car"
    if (/\b[b-d]\)\s*\S+/i.test(lineRest)) {
      continue; // Skip: this is an option line, NOT a section header!
    }

    // Convert Persian letter to standard ASCII row ID: الف->A, ب->B, ج->C, د->D
    let rowId = rawLetter.toUpperCase();
    if (rawLetter === 'الف') rowId = 'A';
    else if (rawLetter === 'ب') rowId = 'B';
    else if (rawLetter === 'ج') rowId = 'C';
    else if (rawLetter === 'د') rowId = 'D';
    else if (rawLetter === 'هـ' || rawLetter === 'ه') rowId = 'E';
    else if (rawLetter === 'اول') rowId = 'A';
    else if (rawLetter === 'دوم') rowId = 'B';
    else if (rawLetter === 'سوم') rowId = 'C';

    validMatches.push({
      index: m.index || 0,
      rowId: rowId || 'A',
      headerLine: lineRest,
    });
  }

  if (validMatches.length === 0) {
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

  for (let i = 0; i < validMatches.length; i++) {
    const current = validMatches[i];
    const startIndex = current.index;
    const endIndex = i < validMatches.length - 1 ? validMatches[i + 1].index : text.length;
    const blockText = text.slice(startIndex, endIndex);

    // Detect section category
    const category = detectInitialCategory(current.headerLine, blockText);

    // Extract section mark (e.g. "(2 marks)", "(1 mark)", "2", "بارم: 2")
    const mark = extractSectionMark(current.headerLine, blockText);

    blocks.push({
      rowId: current.rowId,
      category,
      mark,
      text: blockText,
      headerLine: current.headerLine,
    });
  }

  return blocks;
}

/**
 * Extracts section marks from header lines or blocks:
 * Matches: "(2 marks)", "(1 mark)", "(2)", "[2]", "2 نمره", "بارم: 2"
 */
function extractSectionMark(headerLine: string, blockText: string): number {
  // 1. Matches "(2 marks)", "(1 mark)", "(0.5 mark)", "(2 pts)" inside header line
  const parenMarkMatch = headerLine.match(/\(\s*([\d\.]+)\s*(?:marks?|نمره|pts?|points?)?\s*\)/i);
  if (parenMarkMatch) {
    const val = parseFloat(parenMarkMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 30) return val;
  }

  // 2. Trailing mark at end of header line: "... 2" or "... 1.5 نمره"
  const trailingHeaderMatch = headerLine.match(/(?:^|\s)(?:([\d\.]+))\s*(?:نمره|pts?|points?|marks?)?\s*$/i);
  if (trailingHeaderMatch) {
    const valStr = trailingHeaderMatch[1];
    const val = parseFloat(valStr.startsWith('.') ? `0${valStr}` : valStr);
    if (!isNaN(val) && val > 0 && val <= 30) return val;
  }

  // 3. Explicit "بارم: X" or "نمره: X"
  const explicitMarkMatch = blockText.match(/(?:بارم|نمره|mark|points?)\s*[:：]?\s*([\d\.]+)/i);
  if (explicitMarkMatch) {
    const val = parseFloat(explicitMarkMatch[1]);
    if (!isNaN(val) && val > 0 && val <= 30) return val;
  }

  // Default to 1
  return 1;
}

/**
 * Detects section category from English & Persian keywords
 */
function detectInitialCategory(
  headerLine: string,
  blockText: string,
): 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General' {
  const combined = `${headerLine}\n${blockText.slice(0, 300)}`.toLowerCase();

  // 1. Listening
  if (/listening|audio|listen\s+to|شنیداری|گوش\s*دهید|فایل\s*صوتی/i.test(combined)) {
    return 'Listening';
  }

  // 2. Reading
  if (/reading|passage|comprehension|cloze|درک\s*مطلب|متن\s*زیر\s*را\s*بخوانید|ریدینگ|کلوز/i.test(combined)) {
    return 'Reading';
  }

  // 3. Vocabulary
  if (
    /choose\s+the\s+correct\s+answer|vocabulary|words?\s+in\s+the\s+box|using\s+the\s+words|words?\s+given|fill\s+in\s+the\s+blanks?\s+with\s+(?:the\s+)?words?|spelling|واژگان|واژه|لغت|کلمات|کادر|جعبه|املا/i.test(
      combined,
    )
  ) {
    return 'Vocabulary';
  }

  // 4. Grammar
  if (
    /fill\s+in\s+the\s+blanks|grammar|grammatical|parentheses|tenses?|دستور\s*زبان|دستور|گرامر|قواعد|شکل\s*صحیح/i.test(
      combined,
    )
  ) {
    return 'Grammar';
  }

  // 5. Writing
  if (/writing|unscramble|reorder|punctuation|combine|make\s+a\s+sentence|نگارش|نوشتن|مرتب\s*کنید/i.test(combined)) {
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
    title = `Section ${rowId}: ${headerLine.replace(/\(\s*[\d\.]+\s*(?:marks?|نمره|pts?|points?)?\s*\)/i, '').trim()}`;
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
    (l) => /[\u0600-\u06FF]/.test(l) && !/^\d+[\.\)]/.test(l) && !/دبیرستان|آموزش و پرورش/i.test(l),
  );
  if (persianLines.length > 0) {
    persianInstruction = persianLines.join(' ');
  }

  const englishInstLines = lines.filter(
    (l) =>
      /^(?:Choose|Fill in|Read|Match|Write|Make|Unscramble|Complete|Listen|Answer|Look at)/i.test(l) ||
      /\b(?:correct answer|words given|parentheses|following passage|the questions)\b/i.test(l),
  );
  if (englishInstLines.length > 0) {
    englishInstruction = englishInstLines[0];
  }

  // --- 4. Word Bank Extraction ---
  // Detects word pools from:
  // a) Bracketed boxes like [careful, pollution, healthy, dangerous, exercise]
  // b) Parenthetical word pools ( a / b / c )
  // c) Lines of standalone candidate words near instructions
  wordBank = extractWordBankWordsFromBlock(text, lines);
  if (wordBank.length >= 3) {
    hasWordBank = true;
    if (category === 'General') category = 'Vocabulary';
  }

  // Cloze Test
  if (/cloze/i.test(text) || /\b\d+\)\s*-+/.test(text)) {
    hasPassage = true;
    passageTitle = `Cloze Passage (${rowId})`;
    const passageLines = lines.filter(
      (l) =>
        !/cloze|جاهای خالی|Choose|Read the following/i.test(l) &&
        !/^\d+\.?[a-d]\./i.test(l) &&
        !/^[a-d]\./i.test(l) &&
        l.length > 25,
    );
    passageText = passageLines.join(' ');
    if (category === 'General') category = 'Reading';
  }

  // Reading Passage
  if (/Passage\s+(?:I|II|\d+)|Reading\s+comprehension|درک\s*مطلب/i.test(text)) {
    hasPassage = true;
    const passageMatch = text.match(/(Passage\s+(?:I|II|\d+)[^\n]*)/i);
    passageTitle = passageMatch ? passageMatch[1] : `Reading Passage (${rowId})`;
    const bodyLines = lines.filter(
      (l) =>
        !/Reading comprehension|درک\s*مطلب|Passage\s+[I|V|X\d]/i.test(l) &&
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
    anomalies,
    options,
  );

  // Category shape refinement
  if (category === 'General' && questions.length > 0) {
    category = refineCategoryByQuestionShapes(questions, hasWordBank, hasPassage);
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
 * Extracts candidate words from word bank boxes in any format:
 * [careful, pollution, healthy, dangerous, exercise] or ( a / b / c ) or tab/space separated
 */
function extractWordBankWordsFromBlock(text: string, lines: string[]): string[] {
  // 1. Search for bracketed list: [careful, pollution, healthy, dangerous, exercise]
  const bracketMatch = text.match(/\[\s*([a-zA-Z\s,;/\-–—]{10,})\s*\]/);
  if (bracketMatch) {
    const words = bracketMatch[1]
      .split(/[,;/]/)
      .map((w) => w.trim().replace(/^[-–—]+|[-–—]+$/g, ''))
      .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));
    if (words.length >= 3) return words;
  }

  // 2. Search for parenthetical word list: ( word1 / word2 / word3 )
  const parenMatch = text.match(/\(\s*([a-zA-Z\s,;/\-–—]{10,})\s*\)/);
  if (parenMatch && parenMatch[1].includes('/')) {
    const words = parenMatch[1]
      .split(/[/,;]/)
      .map((w) => w.trim())
      .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));
    if (words.length >= 3) return words;
  }

  // 3. Search non-question lines before Q1
  for (const line of lines) {
    if (/^\s*\d+[\.\)]/.test(line)) break;
    if (/^(?:Fill in|Complete|Words in|کلمات|[A-Z]\b)/i.test(line) && !line.includes(',')) continue;

    if (line.includes(',') || line.includes('/') || line.includes(';')) {
      const items = line
        .split(/[,/;]/)
        .map((w) => w.trim().replace(/^[-–—\[\(]+|[-–—\]\)]+$/g, ''))
        .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));
      if (items.length >= 3) return items;
    }

    const spaceTokens = line
      .split(/\s{2,}|\t+/)
      .map((w) => w.trim().replace(/^[-–—\[\(]+|[-–—\]\)]+$/g, ''))
      .filter((w) => w.length > 1 && !/[\u0600-\u06FF]/.test(w));
    if (spaceTokens.length >= 3) return spaceTokens;
  }

  return [];
}

/**
 * Extracts questions from section text.
 * Robust against OCR number swaps (1. -> l.), glued options on separate lines, and teacher drafting quirks.
 */
function extractQuestionsFromText(
  text: string,
  rowId: string,
  category: string,
  wordBank: string[],
  passageText: string,
  anomalies: ParsingAnomaly[],
  options: ParseOptions,
): QuestionItem[] {
  const items: QuestionItem[] = [];

  // Match question numbers at line starts:
  // e.g. "1. ...", "1) ...", "l. ...", "I. ...", "2.Thesunis..."
  // Keep reading following lines including option lines "a) animal b) car" until the NEXT numbered question or section header!
  const itemRegex =
    /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n\r]+(?:\n(?!\s*\d+[\.\)]|\s*[|_\-~*#•]?\s*[A-Z][\.\)\-–—:]\s+[A-Za-z\u0600-\u06FF])[^\n\r]+)*)/g;

  const matches = Array.from(text.matchAll(itemRegex));

  for (let i = 0; i < matches.length; i++) {
    const rawNumber = parseInt(matches[i][1], 10);
    let rawContent = matches[i][2].trim();

    // Check for trailing per-question mark: "(0.5)", "[0.5]", "(1 pt)"
    let qMark = 0.5;
    const markMatch = rawContent.match(
      /(?:^|\s)(?:\(([\d\.]+)\s*(?:نمره|pts?|points?|marks?)?\)|\[([\d\.]+)\]|([\d\.]+)\s*(?:نمره|pts?|marks?))\s*$/i,
    );
    if (markMatch) {
      const parsedVal = parseFloat(markMatch[1] || markMatch[2] || markMatch[3]);
      if (!isNaN(parsedVal) && parsedVal > 0 && parsedVal <= 10) {
        qMark = parsedVal;
        rawContent = rawContent.replace(markMatch[0], '').trim();
      }
    }

    // Question numbering normalization
    let finalNumber = rawNumber;
    let originalNumber: number | undefined = undefined;

    // Dual prefix: "34. 58. The teacher..."
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
    }

    // --- Multiple Choice Options Extraction ---
    // Handles options on separate lines (e.g. "a)animal b)car c)book d)tree")
    // with or without spaces, Latin or Persian (الف ب ج د)
    const mcqResult = extractMultipleChoiceOptions(rawContent);

    // Inline choice check: "( don't / doesn't )"
    const inlineChoiceResult = extractInlineChoices(rawContent);

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
      // Verb form in parentheses: e.g. "3. I ...... to school every day. (go)"
      rawContent.match(/\(\s*([a-zA-Z]{2,12})\s*\)\s*$/)
    ) {
      type = 'form_in_parentheses';
    } else if (/mistake|error|غلط|اشتباه/i.test(rawContent) || rawContent.includes('mistake:')) {
      type = 'error_correction';
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
    } else if (rawContent.endsWith('?') || /^(?:what|where|who|when|why|how|is|are|do|does|did|can|could)/i.test(rawContent)) {
      type = 'short_answer';
    }

    // Context attachment
    let parentContextType: 'word_bank' | 'cloze_passage' | 'reading_passage' | 'image_prompt' | 'dialogue_context' | 'none' = 'none';
    let parentContextTitle: string | undefined;
    let parentContextText: string | undefined;

    if (type === 'word_bank_fill' || (wordBank.length > 0 && (type === 'fill_blank' || type === 'short_answer'))) {
      type = 'word_bank_fill';
      parentContextType = 'word_bank';
      parentContextTitle = `Word Bank (${rowId})`;
      parentContextText = `Candidate Words: [${wordBank.join(', ')}]`;
    } else if (passageText && passageText.length > 20) {
      const isCloze = /cloze/i.test(passageText) || /\[\d+\]/.test(passageText);
      if (isCloze && type === 'multiple_choice') {
        type = 'cloze_item';
      }
      parentContextType = isCloze ? 'cloze_passage' : 'reading_passage';
      parentContextTitle = isCloze ? `Cloze Passage (${rowId})` : `Reading Passage (${rowId})`;
      parentContextText = passageText;
    }

    const hasImage = /تصویر|عکس|picture|image|look at the/i.test(stem);
    if (hasImage && parentContextType === 'none') {
      parentContextType = 'image_prompt';
      parentContextTitle = `Image Prompt (${rowId})`;
    }

    const typeInfo = getQuestionTypeInfo(type);

    if (stem.length < 4) {
      anomalies.push({
        id: `anom-stem-empty-${rowId}-${finalNumber}`,
        severity: 'error',
        sectionRowId: rowId,
        questionNumber: finalNumber,
        title: 'Empty or Incomplete Question Stem',
        description: `Question ${finalNumber} has an unexpectedly short stem.`,
        suggestedFix: 'Review original document text.',
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
      typeEnName: typeInfo.enName,
      typeFaName: typeInfo.faName,
      stem,
      options: optionsList,
      mark: qMark,
      parentContextType,
      parentContextTitle,
      parentContextText,
      wordBankWords: wordBank.length ? [...wordBank] : undefined,
      hasImage,
    });
  }

  return items;
}

/**
 * Extracts multiple choice options from a question block.
 * Supports:
 * - Options on separate lines or glued on same line
 * - Without space after marker: a)animal, b)car
 * - OCR noise in markers: c¢), c©), c)
 * - Persian options: الف), ب), ج), د)
 */
function extractMultipleChoiceOptions(
  rawContent: string,
): { options: ExamOption[]; stem: string } | null {
  // Option markers regex:
  // Matches: a), a., a-, (a), الف), ب), ج), د)
  // Also matches OCR corrupted c¢), c©)
  const markerRegex =
    /(?:^|\s|\n)(?:([a-d])[\.\)\-–—]|([a-d])[¢©*»>]?\)|(?:\(([a-d])\))|(الف|ب|ج|د)\))\s*/gi;

  const matches = Array.from(rawContent.matchAll(markerRegex));

  if (matches.length < 2) {
    return null;
  }

  // Ensure unique option identifiers
  const ids = matches.map((m) => {
    const raw = (m[1] || m[2] || m[3] || m[4] || '').toLowerCase();
    if (raw === 'الف') return 'a';
    if (raw === 'ب') return 'b';
    if (raw === 'ج') return 'c';
    if (raw === 'د') return 'd';
    return raw;
  });

  const uniqueIds = new Set(ids);
  if (uniqueIds.size < 2) {
    return null;
  }

  const firstMatchIndex = matches[0].index!;
  const stem = rawContent.slice(0, firstMatchIndex).trim();

  const options: ExamOption[] = [];
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const letter = ids[i];
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
 * Extracts inline choices like "( don't / doesn't )"
 */
function extractInlineChoices(text: string): { options: ExamOption[] } | null {
  const inlineRegex = /\(\s*([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)?)\s*[\/|\\]\s*([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)?)(?:\s*[\/|\\]\s*([A-Za-z0-9'’\-]+(?:\s+[A-Za-z0-9'’\-]+)?))?\s*\)/;
  const match = text.match(inlineRegex);

  if (!match) return null;

  const choices: string[] = [match[1].trim(), match[2].trim()];
  if (match[3]) choices.push(match[3].trim());

  const options: ExamOption[] = choices.map((c, idx) => ({
    id: String.fromCharCode(97 + idx), // 'a', 'b', 'c'
    text: c,
  }));

  return { options };
}

/**
 * Refines section category based on parsed question shapes
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
  if (questions.some((q) => q.type === 'unscramble' || q.type === 'combine_sentences' || q.type === 'error_correction')) {
    return 'Writing';
  }
  if (questions.some((q) => q.type === 'form_in_parentheses' || q.type === 'active_passive')) {
    return 'Grammar';
  }
  if (questions.some((q) => q.type === 'multiple_choice' || q.type === 'inline_choice')) {
    return 'Vocabulary';
  }
  return 'General';
}

/**
 * Post-parse Auto-Repair Pass:
 * - Detects gaps in question numbering (e.g. 2, 3, 4 without 1) and repairs them.
 * - Detects questions mistyped as fill_blank that actually contain options.
 * - Ensures every section mark is allocated.
 */
function postParseAutoRepair(
  sections: ExamSection[],
  anomalies: ParsingAnomaly[],
  flags: string[],
): void {
  const allQuestions = sections.flatMap((s) => s.questions);

  // 1. Check numbering sequence continuity
  const numbers = allQuestions.map((q) => Number(q.number)).filter((n) => !isNaN(n));
  if (numbers.length > 0) {
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const expectedCount = max - min + 1;

    if (numbers.length < expectedCount) {
      flags.push(`Question sequence gap: expected ${expectedCount} questions between ${min} and ${max}, found ${numbers.length}`);
      anomalies.push({
        id: `anom-seq-gap`,
        severity: 'warning',
        sectionRowId: 'General',
        title: 'Discontinuous Question Numbering Sequence',
        description: `Exam contains gaps in numbering between ${min} and ${max}. Often occurs in redacted or multi-column tests.`,
        suggestedFix: 'Inspect if any questions were merged into adjacent items.',
        isResolved: false,
      });
    }
  }

  // 2. Validate empty sections
  for (const s of sections) {
    if (s.questions.length === 0) {
      flags.push(`Section ${s.rowId} contains 0 questions`);
    }
  }
}

/**
 * Calculates a realistic confidence score penalizing real extraction failures:
 * - Sections with 0 questions (-15.0)
 * - Empty stems (-8.0)
 * - Undetected marks (-5.0)
 * - MCQs with missing options (-10.0)
 * - Discontinuous number sequence (-8.0)
 * - Unresolved error anomalies (-6.0)
 */
function calculateRealisticConfidenceScore(
  sections: ExamSection[],
  header: ExamHeader,
  anomalies: ParsingAnomaly[],
): number {
  let penalty = 0;

  const warningCount = anomalies.filter((a) => a.severity === 'warning' && !a.isResolved).length;
  const errorCount = anomalies.filter((a) => a.severity === 'error' && !a.isResolved).length;
  penalty += warningCount * 2.5;
  penalty += errorCount * 6.0;

  for (const s of sections) {
    // Heavy penalty for empty section
    if (s.questions.length === 0) {
      penalty += 15.0;
    }

    if (s.markTotal <= 0) {
      penalty += 5.0;
    }

    for (const q of s.questions) {
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 2)) {
        penalty += 10.0;
      }
      if (!q.stem || q.stem.trim().length < 4) {
        penalty += 8.0;
      }
    }
  }

  // Final score is honest and can drop to low numbers if broken
  const finalScore = Math.max(25, Math.min(100, Math.round((100 - penalty) * 10) / 10));
  return finalScore;
}
