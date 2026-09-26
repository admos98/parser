export type QuestionType =
  | 'multiple_choice'
  | 'cloze_item'
  | 'word_bank_fill'
  | 'fill_blank'
  | 'matching'
  | 'true_false'
  | 'short_answer'
  | 'unscramble'
  | 'form_in_parentheses'
  | 'combine_sentences'
  | 'active_passive'
  | 'error_correction'
  | 'letter_reorder'
  | 'inline_choice'
  | 'dialogue_response';

export interface ExamOption {
  id: string; // 'a', 'b', 'c', 'd'
  text: string;
}

export interface MatchingPair {
  leftNumber: number | string;
  leftText: string;
  rightKey?: string; // e.g. 'c'
  rightText?: string;
}

export interface QuestionItem {
  id: string;
  number: number | string;
  displayNumber: string;
  sectionRowId: string; // e.g. 'A', 'B', 'D', 'P', 'Q'
  sectionName: string; // 'Listening', 'Vocabulary', 'Grammar', 'Writing', 'Reading'
  type: QuestionType;
  stem: string;
  persianInstruction?: string;
  englishInstruction?: string;
  options?: ExamOption[];
  correctAnswer?: string;
  mark: number;
  // Parent links
  parentContextType?: 'word_bank' | 'cloze_passage' | 'reading_passage' | 'matching_table' | 'none';
  parentContextTitle?: string;
  parentContextText?: string;
  wordBankWords?: string[];
  // Match-specific
  matchingPairs?: MatchingPair[];
  matchingDistractors?: string[];
  // Attached Images
  hasImage?: boolean;
  imageUrl?: string;
  imageFileName?: string;
  imageCaption?: string;
  // Anomaly warnings
  anomalies?: string[];
  reviewed?: boolean;
}

export interface ExamSection {
  rowId: string; // 'A', 'B', 'C', 'D' ... 'Q'
  majorCategory: 'Listening' | 'Vocabulary' | 'Grammar' | 'Writing' | 'Reading' | 'General';
  title?: string;
  persianInstruction?: string;
  englishInstruction?: string;
  markTotal: number;
  questions: QuestionItem[];
  // Shared context in this section
  hasWordBank?: boolean;
  wordBank?: string[];
  hasPassage?: boolean;
  passageTitle?: string;
  passageText?: string;
  matchingColumns?: {
    columnA: { id: string | number; text: string }[];
    columnB: { id: string; text: string }[];
  };
}

export interface ExamHeader {
  courseName: string; // e.g. "زبان انگلیسی"
  teacherName?: string;
  durationMinutes: number; // 80
  examDate: string; // "03/10/17"
  schoolName: string; // "دبیرستان پسرانه شریعتی"
  district: string; // "اداره آموزش و پرورش خارگ - بوشهر"
  gradeAndMajor: string; // "مقطع و رشته: دوازدهم"
  pageCount: number; // 5
}

export interface ParsingAnomaly {
  id: string;
  severity: 'warning' | 'info' | 'error';
  sectionRowId: string;
  questionNumber?: number | string;
  title: string;
  description: string;
  suggestedFix: string;
  isResolved?: boolean;
}

export interface ExamDocument {
  id: string;
  filename: string;
  filesize?: string;
  parsedAt: string;
  header: ExamHeader;
  sections: ExamSection[];
  totalQuestions: number;
  totalMarks: number;
  anomalies: ParsingAnomaly[];
  confidenceScore: number; // e.g. 98.4
  // 2-Stage Pipeline Tracking
  parseStage?: 'stage1_offline_unsolved' | 'stage2_ai_solved';
  solvedAt?: string;
  isAiSolved?: boolean;
}
