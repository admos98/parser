import * as XLSX from 'xlsx';
import { ExamDocument, QuestionItem } from '../types/exam';
import { getQuestionTypeInfo } from './questionTypeMapper';

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
      examTitle: doc.header.examName || doc.header.courseName,
      officialCourseName: doc.header.courseName,
      school: doc.header.schoolName,
      grade: doc.header.grade || doc.header.gradeAndMajor,
      term: doc.header.term || null,
      district: doc.header.district,
      date: doc.header.examDate,
      durationMinutes: doc.header.durationMinutes,
      totalQuestions: doc.totalQuestions,
      totalMarks: doc.totalMarks,
      parsedAt: doc.parsedAt,
      isAiSolved: doc.isAiSolved,
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
      questions: sec.questions.map((q) => {
        const typeInfo = getQuestionTypeInfo(q.type);
        return {
          id: q.id,
          number: q.number,
          displayNumber: q.displayNumber,
          type: q.type,
          typeEnName: q.typeEnName || typeInfo.enName,
          typeFaName: q.typeFaName || typeInfo.faName,
          stem: q.stem,
          options: q.options || null,
          correctAnswer: q.correctAnswer || null,
          mark: q.mark,
          wordBankWords: q.wordBankWords || null,
          parentContext:
            q.parentContextType !== 'none'
              ? {
                  type: q.parentContextType,
                  title: q.parentContextTitle,
                  text: q.parentContextText || null,
                  wordBankOptions: q.wordBankWords || null,
                }
              : null,
        };
      }),
    })),
    flatQuestionBank: getAllQuestions(doc).map((q) => {
      const typeInfo = getQuestionTypeInfo(q.type);
      return {
        id: q.id,
        number: q.number,
        section: q.sectionName,
        row: q.sectionRowId,
        type: q.type,
        typeEnName: q.typeEnName || typeInfo.enName,
        typeFaName: q.typeFaName || typeInfo.faName,
        stem: q.stem,
        options: q.options ? q.options.map((o) => `${o.id.toUpperCase()}: ${o.text}`).join(' | ') : null,
        answer: q.correctAnswer || null,
        mark: q.mark,
        wordBankWords: q.wordBankWords || null,
        linkedPassageText: q.parentContextText || null,
        parentContext: q.parentContextTitle || null,
      };
    }),
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
    const typeInfo = getQuestionTypeInfo(q.type);

    return {
      'No.': q.number,
      'Row ID': q.sectionRowId,
      Section: q.sectionName,
      'Question Type (EN)': q.typeEnName || typeInfo.enName,
      'نوع سوال (FA)': q.typeFaName || typeInfo.faName,
      'Question Stem': q.stem,
      'Option A': optA,
      'Option B': optB,
      'Option C': optC,
      'Option D': optD,
      'Correct Answer': q.correctAnswer || '',
      'Mark (Points)': q.mark,
      'Word Box Candidate Words': q.wordBankWords ? q.wordBankWords.join(', ') : '',
      'Linked Passage / Reading Text': q.parentContextText || '',
      'Context Title': q.parentContextTitle || '',
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
    { Key: 'AI Identified Exam Title', Value: doc.header.examName || doc.header.courseName },
    { Key: 'Course Name', Value: doc.header.courseName },
    { Key: 'School', Value: doc.header.schoolName },
    { Key: 'District', Value: doc.header.district },
    { Key: 'Grade', Value: doc.header.grade || doc.header.gradeAndMajor },
    { Key: 'Term / Exam Period', Value: doc.header.term || 'نوبت اول' },
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
  const safeTitle = (doc.header.examName || doc.header.courseName).replace(/[^\w\u0600-\u06FF]/g, '_').slice(0, 30);
  downloadFile(blob, `${safeTitle}_QuestionBank.xlsx`, blob.type);
}

/**
 * Export BATCH of all exams into a unified multi-sheet Excel (.xlsx) file
 */
export function exportBatchToExcel(documents: ExamDocument[], customFilename?: string): void {
  const wb = XLSX.utils.book_new();

  // Master Sheet: Consolidated Questions across ALL exams
  const consolidatedQuestions = documents.flatMap((doc) =>
    getAllQuestions(doc).map((q) => {
      const optA = q.options?.find((o) => o.id === 'a')?.text || '';
      const optB = q.options?.find((o) => o.id === 'b')?.text || '';
      const optC = q.options?.find((o) => o.id === 'c')?.text || '';
      const optD = q.options?.find((o) => o.id === 'd')?.text || '';

      const typeInfo = getQuestionTypeInfo(q.type);
      return {
        'Exam ID': doc.id,
        'Exam Name': doc.header.examName || doc.header.courseName,
        'School / Institution': doc.header.schoolName,
        Grade: doc.header.grade || doc.header.gradeAndMajor,
        Term: doc.header.term || 'نوبت اول',
        'Question No.': q.number,
        'Row Letter': q.sectionRowId,
        Category: q.sectionName,
        'Question Type (EN)': q.typeEnName || typeInfo.enName,
        'نوع سوال (FA)': q.typeFaName || typeInfo.faName,
        'Question Stem': q.stem,
        'Option A': optA,
        'Option B': optB,
        'Option C': optC,
        'Option D': optD,
        'Correct Answer': q.correctAnswer || '',
        Mark: q.mark,
        'Word Box Candidate Words': q.wordBankWords ? q.wordBankWords.join(', ') : '',
        'Linked Passage Text': q.parentContextText || '',
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
    const sheetName = `Exam_${idx + 1}_${(doc.header.grade || doc.header.gradeAndMajor).replace(/[^\w]/g, '').slice(0, 10)}`;
    const examQuestions = getAllQuestions(doc).map((q) => {
      const typeInfo = getQuestionTypeInfo(q.type);
      return {
        'No.': q.number,
        'Row ID': q.sectionRowId,
        Section: q.sectionName,
        'Type (EN)': q.typeEnName || typeInfo.enName,
        'نوع سوال': q.typeFaName || typeInfo.faName,
        Stem: q.stem,
        'Answer Key': q.correctAnswer || '',
        Mark: q.mark,
        'Word Box Words': q.wordBankWords ? q.wordBankWords.join(', ') : '',
        'Linked Passage': q.parentContextText ? q.parentContextText.slice(0, 150) + '...' : '',
        Context: q.parentContextTitle || '',
      };
    });
    const ws = XLSX.utils.json_to_sheet(examQuestions);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  // Batch Overview Sheet
  const overviewRows = documents.map((doc, idx) => ({
    '#': idx + 1,
    'AI Identified Exam Title': doc.header.examName || doc.header.courseName,
    'Official Course': doc.header.courseName,
    School: doc.header.schoolName,
    Grade: doc.header.grade || doc.header.gradeAndMajor,
    'Date / Term': `${doc.header.examDate} - ${doc.header.term || 'نوبت اول'}`,
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
  downloadFile(blob, customFilename || `Batch_Exams_Export_${documents.length}_Files.xlsx`, blob.type);
}

export const exportExamToExcel = exportToExcel;

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
    'type_en',
    'type_fa',
    'stem',
    'option_a',
    'option_b',
    'option_c',
    'option_d',
    'correct_answer',
    'mark',
    'word_bank_words',
    'linked_passage_text',
    'parent_context_title',
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
    const typeInfo = getQuestionTypeInfo(q.type);

    return [
      q.number,
      escapeCsv(q.sectionRowId),
      escapeCsv(q.sectionName),
      escapeCsv(q.typeEnName || typeInfo.enName),
      escapeCsv(q.typeFaName || typeInfo.faName),
      escapeCsv(q.stem),
      escapeCsv(optA),
      escapeCsv(optB),
      escapeCsv(optC),
      escapeCsv(optD),
      escapeCsv(q.correctAnswer || ''),
      q.mark,
      escapeCsv(q.wordBankWords ? q.wordBankWords.join(', ') : ''),
      escapeCsv(q.parentContextText || ''),
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
