import * as XLSX from 'xlsx';
import { ExamDocument, QuestionItem } from '../types/exam';

/**
 * Download a file in the browser safely.
 */
export function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Export single exam as Clean Online Exam Platform JSON
 */
export function exportToCleanJson(doc: ExamDocument): string {
  const cleanData = formatDocumentForJson(doc);
  return JSON.stringify(cleanData, null, 2);
}

/**
 * Export multiple exams in a single combined JSON bundle
 */
export function exportBatchToJson(documents: ExamDocument[]): string {
  const batchData = {
    batchMetadata: {
      totalExams: documents.length,
      totalQuestions: documents.reduce((sum, d) => sum + d.totalQuestions, 0),
      exportedAt: new Date().toISOString(),
      platformVersion: '2.0.0-batch',
    },
    exams: documents.map(formatDocumentForJson),
    consolidatedQuestionBank: documents.flatMap((doc) =>
      getAllQuestions(doc).map((q) => ({
        examId: doc.id,
        examTitle: doc.header.courseName,
        school: doc.header.schoolName,
        grade: doc.header.gradeAndMajor,
        questionNumber: q.number,
        sectionRow: q.sectionRowId,
        category: q.sectionName,
        type: q.type,
        stem: q.stem,
        options: q.options ? q.options.map((o) => `${o.id.toUpperCase()}: ${o.text}`).join(' | ') : null,
        correctAnswer: q.correctAnswer || null,
        mark: q.mark,
        context: q.parentContextTitle || null,
      })),
    ),
  };
  return JSON.stringify(batchData, null, 2);
}

function formatDocumentForJson(doc: ExamDocument) {
  return {
    metadata: {
      examId: doc.id,
      examTitle: doc.header.courseName,
      school: doc.header.schoolName,
      grade: doc.header.gradeAndMajor,
      date: doc.header.examDate,
      durationMinutes: doc.header.durationMinutes,
      totalQuestions: doc.totalQuestions,
      totalMarks: doc.totalMarks,
      parsedAt: doc.parsedAt,
    },
    sections: doc.sections.map((sec) => ({
      sectionRowId: sec.rowId,
      category: sec.majorCategory,
      title: sec.title,
      instructions: {
        persian: sec.persianInstruction || null,
        english: sec.englishInstruction || null,
      },
      marksAllocated: sec.markTotal,
      context: sec.hasPassage
        ? {
            type: 'passage',
            title: sec.passageTitle,
            text: sec.passageText,
          }
        : sec.hasWordBank
        ? {
            type: 'word_bank',
            words: sec.wordBank,
          }
        : null,
      questions: sec.questions.map((q) => ({
        id: q.id,
        number: q.number,
        displayNumber: q.displayNumber,
        type: q.type,
        stem: q.stem,
        options: q.options || null,
        correctAnswer: q.correctAnswer || null,
        mark: q.mark,
        parentContext:
          q.parentContextType !== 'none'
            ? {
                type: q.parentContextType,
                title: q.parentContextTitle,
                textSnippet: q.parentContextText ? q.parentContextText.slice(0, 120) + '...' : null,
                wordBankOptions: q.wordBankWords || null,
              }
            : null,
      })),
    })),
    flatQuestionBank: getAllQuestions(doc).map((q) => ({
      id: q.id,
      number: q.number,
      section: q.sectionName,
      row: q.sectionRowId,
      type: q.type,
      stem: q.stem,
      options: q.options ? q.options.map((o) => `${o.id.toUpperCase()}: ${o.text}`).join(' | ') : null,
      answer: q.correctAnswer || null,
      mark: q.mark,
      parentContext: q.parentContextTitle || null,
    })),
  };
}

/**
 * Export single exam as Multi-Sheet Excel (.xlsx) file
 */
export function exportToExcel(doc: ExamDocument): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Flat Questions Table
  const flatQuestions = getAllQuestions(doc).map((q) => {
    const optA = q.options?.find((o) => o.id === 'a')?.text || '';
    const optB = q.options?.find((o) => o.id === 'b')?.text || '';
    const optC = q.options?.find((o) => o.id === 'c')?.text || '';
    const optD = q.options?.find((o) => o.id === 'd')?.text || '';

    return {
      'No.': q.number,
      'Row ID': q.sectionRowId,
      Section: q.sectionName,
      'Question Type': q.type,
      'Question Stem': q.stem,
      'Option A': optA,
      'Option B': optB,
      'Option C': optC,
      'Option D': optD,
      'Correct Answer': q.correctAnswer || '',
      'Mark (Points)': q.mark,
      'Context / Passage / Bank': q.parentContextTitle || (q.wordBankWords ? q.wordBankWords.join(', ') : ''),
      'Has Image': q.hasImage ? 'Yes' : 'No',
      'Image Asset File': q.imageFileName || '',
      'Image Description': q.imageCaption || '',
      'Persian Instruction': q.persianInstruction || '',
    };
  });

  const wsQuestions = XLSX.utils.json_to_sheet(flatQuestions);
  XLSX.utils.book_append_sheet(wb, wsQuestions, 'Question_Bank');

  // Sheet 2: Sections & Passages Summary
  const sectionSummary = doc.sections.map((sec) => ({
    'Row ID': sec.rowId,
    Category: sec.majorCategory,
    'Section Title': sec.title || '',
    'Questions Count': sec.questions.length,
    'Total Marks': sec.markTotal,
    'Persian Instruction': sec.persianInstruction || '',
    'Word Bank Words': sec.wordBank ? sec.wordBank.join(', ') : 'None',
    'Has Passage': sec.hasPassage ? 'Yes' : 'No',
    'Passage Title': sec.passageTitle || '',
    'Passage Content': sec.passageText || '',
  }));

  const wsSections = XLSX.utils.json_to_sheet(sectionSummary);
  XLSX.utils.book_append_sheet(wb, wsSections, 'Sections_and_Passages');

  // Sheet 3: Exam Metadata
  const metadataRows = [
    { Key: 'Exam Title', Value: doc.header.courseName },
    { Key: 'School', Value: doc.header.schoolName },
    { Key: 'District', Value: doc.header.district },
    { Key: 'Grade / Major', Value: doc.header.gradeAndMajor },
    { Key: 'Exam Date', Value: doc.header.examDate },
    { Key: 'Duration (Mins)', Value: doc.header.durationMinutes },
    { Key: 'Total Questions', Value: doc.totalQuestions },
    { Key: 'Total Marks', Value: doc.totalMarks },
    { Key: 'Confidence Score', Value: `${doc.confidenceScore}%` },
    { Key: 'Original File', Value: doc.filename },
  ];
  const wsMeta = XLSX.utils.json_to_sheet(metadataRows);
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Exam_Info');

  // Write file
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadFile(blob, `${doc.id}_QuestionBank.xlsx`, blob.type);
}

/**
 * Export BATCH of all exams into a unified multi-sheet Excel (.xlsx) file
 */
export function exportBatchToExcel(documents: ExamDocument[]): void {
  const wb = XLSX.utils.book_new();

  // Master Sheet: Consolidated Questions across ALL exams
  const consolidatedQuestions = documents.flatMap((doc) =>
    getAllQuestions(doc).map((q) => {
      const optA = q.options?.find((o) => o.id === 'a')?.text || '';
      const optB = q.options?.find((o) => o.id === 'b')?.text || '';
      const optC = q.options?.find((o) => o.id === 'c')?.text || '';
      const optD = q.options?.find((o) => o.id === 'd')?.text || '';

      return {
        'Exam ID': doc.id,
        'Exam Name': doc.header.courseName,
        'School / Institution': doc.header.schoolName,
        Grade: doc.header.gradeAndMajor,
        'Question No.': q.number,
        'Row Letter': q.sectionRowId,
        Category: q.sectionName,
        'Question Type': q.type,
        'Question Stem': q.stem,
        'Option A': optA,
        'Option B': optB,
        'Option C': optC,
        'Option D': optD,
        'Correct Answer': q.correctAnswer || '',
        Mark: q.mark,
        'Has Image': q.hasImage ? 'Yes' : 'No',
        'Image Asset File': q.imageFileName || '',
        'Image Description': q.imageCaption || '',
        'Attached Context': q.parentContextTitle || '',
        'Persian Instruction': q.persianInstruction || '',
      };
    }),
  );

  const wsConsolidated = XLSX.utils.json_to_sheet(consolidatedQuestions);
  XLSX.utils.book_append_sheet(wb, wsConsolidated, 'ALL_QUESTIONS_MASTER');

  // Individual sheets per exam (cleanly truncated sheet names)
  documents.forEach((doc, idx) => {
    const sheetName = `Exam_${idx + 1}_${doc.header.gradeAndMajor.replace(/[^\w]/g, '').slice(0, 10)}`;
    const examQuestions = getAllQuestions(doc).map((q) => ({
      'No.': q.number,
      'Row ID': q.sectionRowId,
      Section: q.sectionName,
      Type: q.type,
      Stem: q.stem,
      'Answer Key': q.correctAnswer || '',
      Mark: q.mark,
      Context: q.parentContextTitle || '',
    }));
    const ws = XLSX.utils.json_to_sheet(examQuestions);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Batch Overview Sheet
  const overviewRows = documents.map((doc, idx) => ({
    '#': idx + 1,
    'Exam Title': doc.header.courseName,
    School: doc.header.schoolName,
    Grade: doc.header.gradeAndMajor,
    'Date / Term': doc.header.examDate,
    'Total Questions': doc.totalQuestions,
    'Total Marks': doc.totalMarks,
    'Confidence Score': `${doc.confidenceScore}%`,
    Filename: doc.filename,
  }));
  const wsOverview = XLSX.utils.json_to_sheet(overviewRows);
  XLSX.utils.book_append_sheet(wb, wsOverview, 'BATCH_SUMMARY');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadFile(blob, `Batch_Exams_Export_${documents.length}_Files.xlsx`, blob.type);
}

/**
 * Export single exam as CSV
 */
export function exportToCsv(doc: ExamDocument): string {
  const allQ = getAllQuestions(doc);
  return formatQuestionsCsv(allQ);
}

/**
 * Export BATCH of all exams as CSV
 */
export function exportBatchToCsv(documents: ExamDocument[]): string {
  const allQ = documents.flatMap((d) => getAllQuestions(d));
  return formatQuestionsCsv(allQ);
}

function formatQuestionsCsv(allQ: QuestionItem[]): string {
  const headers = [
    'number',
    'row_id',
    'section',
    'type',
    'stem',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer',
    'mark',
    'parent_context',
  ];

  const escapeCsv = (str: string) => {
    if (!str) return '""';
    const escaped = str.replace(/"/g, '""');
    return `"${escaped}"`;
  };

  const rows = allQ.map((q) => {
    const optA = q.options?.find((o) => o.id === 'a')?.text || '';
    const optB = q.options?.find((o) => o.id === 'b')?.text || '';
    const optC = q.options?.find((o) => o.id === 'c')?.text || '';
    const optD = q.options?.find((o) => o.id === 'd')?.text || '';

    return [
      q.number,
      escapeCsv(q.sectionRowId),
      escapeCsv(q.sectionName),
      escapeCsv(q.type),
      escapeCsv(q.stem),
      escapeCsv(optA),
      escapeCsv(optB),
      escapeCsv(optC),
      escapeCsv(optD),
      escapeCsv(q.correctAnswer || ''),
      q.mark,
      escapeCsv(q.parentContextTitle || ''),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Export in Moodle GIFT Format for direct online LMS import
 */
export function exportToMoodleGift(doc: ExamDocument): string {
  const allQ = getAllQuestions(doc);
  const giftLines: string[] = [`// ${doc.header.courseName} - ${doc.header.schoolName}`];

  for (const q of allQ) {
    giftLines.push(`\n// Question ${q.number} [${q.sectionName}]`);
    const title = `::Q${q.number}::`;

    if (q.type === 'multiple_choice' && q.options) {
      const optionsGift = q.options
        .map((opt) => {
          const isCorrect = q.correctAnswer?.toLowerCase() === opt.id.toLowerCase();
          return `${isCorrect ? '=' : '~'}${opt.text}`;
        })
        .join(' ');
      giftLines.push(`${title} ${q.stem} {${optionsGift}}`);
    } else if (q.type === 'true_false') {
      const isTrue = q.correctAnswer?.toLowerCase() === 'true';
      giftLines.push(`${title} ${q.stem} {${isTrue ? 'TRUE' : 'FALSE'}}`);
    } else {
      const ans = q.correctAnswer ? `={=${q.correctAnswer}}` : '{}';
      giftLines.push(`${title} ${q.stem} ${ans}`);
    }
  }

  return giftLines.join('\n');
}

export function getAllQuestions(doc: ExamDocument): QuestionItem[] {
  return doc.sections.flatMap((s) => s.questions);
}
