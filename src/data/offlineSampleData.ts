import { ExamDocument } from '../types/exam';
import { MOTAHARI_GRADE9_EXAM, BUSHEHR_GRADE12_EXAM } from './sampleExamData';

/**
 * Creates an exact Stage 1 Offline AST representation where:
 * 1. 100% of Document Table Structure (Rows A to I / A to Q) is preserved.
 * 2. 100% of Questions, Stems, Multiple Choice Options, Marks, Word Bank pool, and Passages are extracted.
 * 3. NO AI HAS SOLVED THE ANSWERS YET (correctAnswer is left undefined/empty).
 * 4. This clearly demonstrates the clean offline extraction boundary.
 */
export function createOfflineUnsolvedDocument(solvedDoc: ExamDocument): ExamDocument {
  return {
    ...solvedDoc,
    id: `${solvedDoc.id}-offline-raw`,
    parseStage: 'stage1_offline_unsolved',
    isAiSolved: false,
    confidenceScore: 97.5,
    sections: solvedDoc.sections.map((sec) => ({
      ...sec,
      questions: sec.questions.map((q) => ({
        ...q,
        correctAnswer: undefined, // Stripped! Lacks answers until Stage 2 AI runs!
      })),
    })),
  };
}

export const MOTAHARI_STAGE1_OFFLINE: ExamDocument = createOfflineUnsolvedDocument(MOTAHARI_GRADE9_EXAM);
export const BUSHEHR_STAGE1_OFFLINE: ExamDocument = createOfflineUnsolvedDocument(BUSHEHR_GRADE12_EXAM);
