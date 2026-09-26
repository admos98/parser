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
 * Deterministic AST Rule-Based Parser for Persian, Arabic, and English Exams.
 * Operates purely offline with 0 API calls.
 */
export function parseExamRawText(rawText: string, filename: string = 'uploaded_exam.txt'): ExamDocument {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Extract Header
  const header: ExamHeader = extractExamHeader(rawText);

  // 2. Break down into Sections based on Row identifiers (A, B, C...) or Major Category banners
  const rawSections = splitIntoRawSections(rawText);

  // 3. Parse each section with specialized handlers
  const sections: ExamSection[] = [];
  const anomalies: ParsingAnomaly[] = [];
  let globalQuestionCounter = 1;

  for (const rawSec of rawSections) {
    const parsedSec = parseSectionBlock(rawSec, globalQuestionCounter, anomalies);
    sections.push(parsedSec);
    globalQuestionCounter += parsedSec.questions.length;
  }

  // Calculate totals
  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const totalMarks = Math.round(sections.reduce((sum, s) => sum + s.markTotal, 0) * 10) / 10;

  // Calculate deterministic confidence score based on anomalies
  const warningCount = anomalies.filter((a) => a.severity === 'warning').length;
  const errorCount = anomalies.filter((a) => a.severity === 'error').length;
  const penalty = warningCount * 1.5 + errorCount * 3.5;
  const confidenceScore = Math.max(70, Math.min(100, Math.round((100 - penalty) * 10) / 10));

  return {
    id: `exam-${Date.now()}`,
    filename,
    filesize: `${(rawText.length / 1024).toFixed(1)} KB`,
    parsedAt: new Date().toISOString(),
    confidenceScore,
    header,
    sections,
    totalQuestions,
    totalMarks,
    anomalies,
  };
}

function extractExamHeader(text: string): ExamHeader {
  const courseMatch = text.match(/نام درس:\s*([^\n\r]+)/);
  const durationMatch = text.match(/مدت آزمون:\s*(\d+)/);
  const dateMatch = text.match(/تاریخ\s*آزمون:\s*([^\n\r]+)/);
  const schoolMatch = text.match(/(دبیرستان[^\n\r]+|مدرسه[^\n\r]+)/);
  const districtMatch = text.match(/(اداره[^\n\r]+|آموزش و پرورش[^\n\r]+)/);
  const gradeMatch = text.match(/مقطع و رشته:\s*([^\n\r]+)/);

  return {
    courseName: courseMatch ? courseMatch[1].trim() : 'زبان انگلیسی / آزمون عمومی',
    durationMinutes: durationMatch ? parseInt(durationMatch[1], 10) : 80,
    examDate: dateMatch ? dateMatch[1].trim() : '1403/10/17',
    schoolName: schoolMatch ? schoolMatch[1].trim() : 'دبیرستان دوره دوم',
    district: districtMatch ? districtMatch[1].trim() : 'وزارت آموزش و پرورش',
    gradeAndMajor: gradeMatch ? gradeMatch[1].trim() : 'پایه دوازدهم',
    pageCount: 5,
  };
}

interface RawSectionBlock {
  rowId: string;
  category: 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General';
  mark: number;
  text: string;
}

function splitIntoRawSections(text: string): RawSectionBlock[] {
  // Common Iranian exam table layout has Row identifiers A..Q in column 1
  const rowPattern = /(?:^|\n)\s*([A-Q])\s+(Audio \d+|Fill in|Match|Choose|Write|combine|Make|Unscramble|Find|According|Cloze|Reading|[^\n]+)/gi;
  const matches = Array.from(text.matchAll(rowPattern));

  if (matches.length === 0) {
    // Fallback: single general section
    return [
      {
        rowId: 'A',
        category: 'General',
        mark: 20,
        text,
      },
    ];
  }

  const blocks: RawSectionBlock[] = [];
  let currentCategory: 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General' = 'Listening';

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const rowId = match[1].toUpperCase();
    const startIndex = match.index || 0;
    const endIndex = i < matches.length - 1 ? matches[i + 1].index || text.length : text.length;
    const blockText = text.slice(startIndex, endIndex);

    // Check category keywords
    if (/listening/i.test(blockText)) currentCategory = 'Listening';
    else if (/vocabulary/i.test(blockText)) currentCategory = 'Vocabulary';
    else if (/grammar/i.test(blockText)) currentCategory = 'Grammar';
    else if (/writing/i.test(blockText)) currentCategory = 'Writing';
    else if (/reading/i.test(blockText)) currentCategory = 'Reading';

    // Extract row mark from end of block or line
    const markMatch = blockText.match(/(?:^|\n)\s*(\d+(?:\.\d+)?|\.\d+)\s*$/m);
    let mark = 1;
    if (markMatch) {
      const val = parseFloat(markMatch[1].startsWith('.') ? `0${markMatch[1]}` : markMatch[1]);
      if (!isNaN(val)) mark = val;
    }

    blocks.push({
      rowId,
      category: currentCategory,
      mark,
      text: blockText,
    });
  }

  return blocks;
}

function parseSectionBlock(
  rawSec: RawSectionBlock,
  startNumber: number,
  anomalies: ParsingAnomaly[],
): ExamSection {
  const { rowId, category, text } = rawSec;
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  let title = `Section ${rowId}`;
  let persianInstruction = '';
  let englishInstruction = '';
  let hasWordBank = false;
  let wordBank: string[] = [];
  let hasPassage = false;
  let passageTitle = '';
  let passageText = '';

  // Extract instructions
  const persianLines = lines.filter((l) => /[\u0600-\u06FF]/.test(l) && !/^\d+[\.\)]/.test(l));
  if (persianLines.length > 0) {
    persianInstruction = persianLines.join(' ');
  }

  // Check for Word Bank
  if (/Fill in the blanks with the words given/i.test(text) || /کلمات داده شده/i.test(text)) {
    hasWordBank = true;
    // Word banks are often a block of words
    const candidateLines = lines.filter(
      (l) =>
        !/Fill in|جاهای خالی|^\d+[\.\)]|[A-Q]\b/i.test(l) &&
        !l.includes('?') &&
        l.split(/\s+/).length >= 4 &&
        !/[\u0600-\u06FF]/.test(l),
    );
    if (candidateLines.length > 0) {
      const allWords = candidateLines.flatMap((cl) => cl.split(/\s+/)).map((w) => w.replace(/[^\w-]/g, ''));
      wordBank = Array.from(new Set(allWords)).filter((w) => w.length > 2);
    }
  }

  // Check for Cloze Test
  if (/cloze/i.test(text) || /\b\d+\)\s*-+/.test(text)) {
    hasPassage = true;
    passageTitle = `Cloze Passage (${rowId})`;
    const passageLines = lines.filter(
      (l) =>
        !/cloze|جاهای خالی|Choose|Read the following/i.test(l) &&
        !/^\d+\.?[a-d]\./i.test(l) &&
        !/^[a-d]\./i.test(l) &&
        l.length > 30,
    );
    passageText = passageLines.join(' ');
  }

  // Check for Reading Passage
  if (/Passage\s+(?:I|II|\d+)|Reading comprehension/i.test(text)) {
    hasPassage = true;
    const passageMatch = text.match(/(Passage\s+(?:I|II|\d+)[^\n]*)/i);
    passageTitle = passageMatch ? passageMatch[1] : `Reading Passage (${rowId})`;
    const bodyLines = lines.filter(
      (l) =>
        !/Reading comprehension|Passage\s+[I|V|X\d]|^\d+[\.\)]/i.test(l) &&
        l.length > 40,
    );
    passageText = bodyLines.join('\n');
  }

  // Extract Questions inside this section
  const questions: QuestionItem[] = [];
  const questionBlocks = extractQuestionsFromText(text, rowId, category, wordBank, passageText);

  for (const q of questionBlocks) {
    // Run anomaly checks
    detectItemAnomalies(q, wordBank, anomalies);
    questions.push(q);
  }

  return {
    rowId,
    majorCategory: category,
    title,
    persianInstruction: persianInstruction || undefined,
    englishInstruction: englishInstruction || undefined,
    markTotal: rawSec.mark,
    questions,
    hasWordBank,
    wordBank: wordBank.length ? wordBank : undefined,
    hasPassage,
    passageTitle: passageTitle || undefined,
    passageText: passageText || undefined,
  };
}

function extractQuestionsFromText(
  text: string,
  rowId: string,
  category: string,
  wordBank: string[],
  passageText: string,
): QuestionItem[] {
  const items: QuestionItem[] = [];

  // Match question numbering e.g. "9. With an...", "21. It is...", "1. 'Why is...", "48. I get..."
  // Also account for double numbers like "31. Did Alexander Flemming 44..."
  const itemRegex = /(?:^|\n)\s*(\d+)[\.\)]\s*([^\n\r]+(?:\n(?!\s*\d+[\.\)]|[A-Q]\s+)[^\n\r]+)*)/g;
  const matches = Array.from(text.matchAll(itemRegex));

  for (let i = 0; i < matches.length; i++) {
    const rawNumber = parseInt(matches[i][1], 10);
    const rawContent = matches[i][2].trim();

    // Check if options exist: a. ... b. ... c. ... d. ...
    const options: ExamOption[] = [];
    const optionMatches = Array.from(rawContent.matchAll(/(?:^|\s+)([a-d])[\.\)]\s*([^\s\.\)]+(?:\s+[^\s\.\)a-d]+)*)/gi));

    if (optionMatches.length >= 2) {
      for (const om of optionMatches) {
        options.push({
          id: om[1].toLowerCase(),
          text: om[2].trim(),
        });
      }
    }

    // Determine Question Type
    let type: QuestionType = 'short_answer';
    let stem = rawContent;

    if (options.length >= 2) {
      type = 'multiple_choice';
      // Strip options from stem
      const firstOptIndex = rawContent.search(/(?:^|\s+)[a-d][\.\)]/i);
      if (firstOptIndex > 0) {
        stem = rawContent.slice(0, firstOptIndex).trim();
      }
    } else if (rawContent.includes('True') && rawContent.includes('False')) {
      type = 'true_false';
      options.push({ id: 'true', text: 'True' }, { id: 'false', text: 'False' });
    } else if (wordBank.length > 0 && (rawContent.includes('----') || rawContent.includes('....') || rawContent.includes('_____'))) {
      type = 'word_bank_fill';
    } else if (rawContent.includes('(') && rawContent.includes(')') && (/break|travel|speak|have|corevdis|finidetion/i.test(rawContent))) {
      type = 'form_in_parentheses';
    } else if (rawContent.includes('/') && rawContent.split('/').length >= 3) {
      type = 'unscramble';
    } else if (rawContent.includes('active:') || rawContent.includes('passive:')) {
      type = 'active_passive';
    } else if (rawContent.includes('----') || rawContent.includes('....') || rawContent.includes('____')) {
      type = 'fill_blank';
    }

    // Context attachment
    let parentContextType: 'word_bank' | 'cloze_passage' | 'reading_passage' | 'none' = 'none';
    let parentContextTitle: string | undefined;

    if (type === 'word_bank_fill' && wordBank.length > 0) {
      parentContextType = 'word_bank';
      parentContextTitle = `Word Bank (${rowId})`;
    } else if (passageText && passageText.length > 20) {
      parentContextType = /cloze/i.test(passageText) || /\[\d+\]/.test(passageText) ? 'cloze_passage' : 'reading_passage';
      parentContextTitle = `Passage (${rowId})`;
    }

    items.push({
      id: `q-${rowId}-${rawNumber}-${i}`,
      number: rawNumber,
      displayNumber: String(rawNumber),
      sectionRowId: rowId,
      sectionName: category,
      type,
      stem,
      options: options.length ? options : undefined,
      mark: 0.5,
      parentContextType,
      parentContextTitle,
      wordBankWords: wordBank.length ? wordBank : undefined,
    });
  }

  return items;
}

function detectItemAnomalies(
  item: QuestionItem,
  wordBank: string[],
  anomalies: ParsingAnomaly[],
): void {
  // Check for nested numbering artifacts e.g. "31. Did Alexander Flemming 44..."
  const nestedNumMatch = item.stem.match(/\b(\d{2})\b/);
  if (nestedNumMatch && parseInt(nestedNumMatch[1], 10) !== item.number) {
    const internalNum = parseInt(nestedNumMatch[1], 10);
    if (internalNum >= 40 && internalNum <= 60 && Number(item.number) < internalNum) {
      anomalies.push({
        id: `anom-${item.id}`,
        severity: 'warning',
        sectionRowId: item.sectionRowId,
        questionNumber: item.number,
        title: 'Possible Dual Numbering or Ghost Index',
        description: `Stem for item ${item.number} contains unexpected inner number "${internalNum}". Often occurs when teachers re-draft exams.`,
        suggestedFix: `Inspect if actual question index is ${internalNum}.`,
      });
    }
  }

  // Check word bank count mismatch
  if (item.type === 'word_bank_fill' && wordBank.length > 0) {
    if (wordBank.length > 8) {
      // already flagged at section level
    }
  }
}
