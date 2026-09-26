import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Edit3,
  Copy,
  Check,
  ChevronDown,
  Layers,
  BookOpen,
  Eye,
  EyeOff,
  Sparkles,
} from 'lucide-react';
import { ExamDocument, QuestionItem, QuestionType } from '../types/exam';

interface QuestionBankViewProps {
  document: ExamDocument;
  onEditQuestion: (question: QuestionItem) => void;
  onSelectPassage: (passageTitle: string, passageText: string) => void;
}

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  document,
  onEditQuestion,
  onSelectPassage,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSection, setSelectedSection] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [showAnswers, setShowAnswers] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Flatten all questions
  const allQuestions = useMemo(() => {
    return document.sections.flatMap((s) => s.questions);
  }, [document]);

  // Unique sections and types
  const sectionsList = useMemo(() => {
    return Array.from(new Set(document.sections.map((s) => s.majorCategory)));
  }, [document]);

  const typesList = useMemo(() => {
    return Array.from(new Set(allQuestions.map((q) => q.type)));
  }, [allQuestions]);

  // Filtered questions
  const filteredQuestions = useMemo(() => {
    return allQuestions.filter((q) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesStem = q.stem.toLowerCase().includes(query);
        const matchesNumber = String(q.number).includes(query) || q.displayNumber.toLowerCase().includes(query);
        const matchesAnswer = q.correctAnswer?.toLowerCase().includes(query);
        const matchesOptions = q.options?.some((o) => o.text.toLowerCase().includes(query));
        const matchesInstruction = q.persianInstruction?.includes(query);
        if (!matchesStem && !matchesNumber && !matchesAnswer && !matchesOptions && !matchesInstruction) {
          return false;
        }
      }

      // Section
      if (selectedSection !== 'all' && q.sectionName !== selectedSection) {
        return false;
      }

      // Type
      if (selectedType !== 'all' && q.type !== selectedType) {
        return false;
      }

      return true;
    });
  }, [allQuestions, searchTerm, selectedSection, selectedType]);

  const handleCopyJson = (q: QuestionItem) => {
    navigator.clipboard.writeText(JSON.stringify(q, null, 2));
    setCopiedId(q.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by question stem, number, option text, or answer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                Clear
              </button>
            )}
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                showAnswers
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {showAnswers ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{showAnswers ? 'Answers Shown' : 'Answers Hidden'}</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800/80 text-xs">
          <span className="text-slate-500 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            onClick={() => setSelectedSection('all')}
            className={`px-2.5 py-1 rounded-md transition ${
              selectedSection === 'all'
                ? 'bg-indigo-600 text-white font-medium'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Categories ({allQuestions.length})
          </button>
          {sectionsList.map((sec) => {
            const count = allQuestions.filter((q) => q.sectionName === sec).length;
            return (
              <button
                key={sec}
                onClick={() => setSelectedSection(sec)}
                className={`px-2.5 py-1 rounded-md transition ${
                  selectedSection === sec
                    ? 'bg-indigo-600 text-white font-medium'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {sec} ({count})
              </button>
            );
          })}

          <span className="text-slate-600 mx-1">|</span>

          <span className="text-slate-500">Type:</span>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-300 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Question Types ({typesList.length})</option>
            {typesList.map((t) => (
              <option key={t} value={t}>
                {formatQuestionType(t)}
              </option>
            ))}
          </select>

          {(searchTerm || selectedSection !== 'all' || selectedType !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedSection('all');
                setSelectedType('all');
              }}
              className="ml-auto text-indigo-400 hover:text-indigo-300 text-xs font-medium underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Results Header Count */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Showing <span className="font-bold text-slate-200">{filteredQuestions.length}</span> of {allQuestions.length} parsed items
        </span>
        <span className="text-slate-500">Click any card to inspect / edit AST properties</span>
      </div>

      {/* Questions Grid / List */}
      <div className="grid grid-cols-1 gap-3">
        {filteredQuestions.map((q) => (
          <div
            key={q.id}
            className="bg-slate-900/90 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-sm group"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2.5 border-b border-slate-800/80">
              {/* Question Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-bold font-code">
                  Q{q.displayNumber}
                </span>

                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs border border-slate-700 font-medium">
                  Row {q.sectionRowId} • {q.sectionName}
                </span>

                <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${getTypeBadgeStyle(q.type)}`}>
                  {formatQuestionType(q.type)}
                </span>

                <span className="px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-300 text-xs border border-cyan-500/20 font-medium">
                  {q.mark} pt{q.mark !== 1 ? 's' : ''}
                </span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                <button
                  onClick={() => handleCopyJson(q)}
                  title="Copy question JSON"
                  className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
                >
                  {copiedId === q.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>

                <button
                  onClick={() => onEditQuestion(q)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium border border-indigo-500/30 transition"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              </div>
            </div>

            {/* Persian Instruction if available */}
            {q.persianInstruction && (
              <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-200/90 text-xs font-persian leading-relaxed">
                <span className="font-bold ml-1">دستور سوال:</span>
                {q.persianInstruction}
              </div>
            )}

            {/* Parent Context Link Pill (Passage / Word Bank) */}
            {q.parentContextType !== 'none' && q.parentContextTitle && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300 bg-indigo-950/40 border border-indigo-800/50 rounded-lg px-2.5 py-1">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="font-medium">{q.parentContextTitle}</span>
                {q.parentContextText && (
                  <button
                    onClick={() => onSelectPassage(q.parentContextTitle || 'Passage', q.parentContextText || '')}
                    className="ml-auto text-[11px] underline text-indigo-400 hover:text-indigo-200"
                  >
                    View Passage
                  </button>
                )}
              </div>
            )}

            {/* Question Stem */}
            <div className="mt-3 text-slate-100 text-xs sm:text-sm font-medium leading-relaxed">
              {q.stem}
            </div>

            {/* Attached Cropped Image Component */}
            {q.hasImage && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-20 h-16 rounded-lg bg-indigo-950/60 border border-indigo-800/50 flex flex-col items-center justify-center text-indigo-400 flex-shrink-0 p-1">
                  <span className="text-[10px] font-mono font-bold">🖼️ CROPPED</span>
                  <span className="text-[9px] text-slate-400 truncate max-w-full">{q.imageFileName}</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-300">Exact Sheet Image Extracted</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono">
                      {q.imageFileName}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {q.imageCaption || 'Cropped visual reference for question stem.'}
                  </p>
                  <p className="text-[10px] text-emerald-400 font-medium">
                    ✓ Available for Excel cell embedding via openpyxl or accompanying media zip.
                  </p>
                </div>
              </div>
            )}

            {/* Options list for Multiple Choice & Cloze */}
            {q.options && q.options.length > 0 && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {q.options.map((opt) => {
                  const isCorrect = showAnswers && q.correctAnswer?.toLowerCase() === opt.id.toLowerCase();
                  return (
                    <div
                      key={opt.id}
                      className={`flex items-start gap-2 p-2 rounded-lg border text-xs transition ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 font-semibold shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                          isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {opt.id.toUpperCase()}
                      </span>
                      <span className="mt-0.5">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Answer Display for non-MCQ types */}
            {showAnswers && q.correctAnswer && !q.options && (
              <div className="mt-3 flex items-center gap-2 text-xs">
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Answer Key:
                </span>
                <span className="bg-emerald-950/60 border border-emerald-800/60 text-emerald-200 px-2 py-0.5 rounded font-mono font-medium">
                  {q.correctAnswer}
                </span>
              </div>
            )}

            {/* Offline Stage 1 Unsolved Indicator */}
            {!q.correctAnswer && (
              <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                <span className="px-2 py-0.5 rounded bg-slate-800/80 border border-slate-700/80 font-mono text-[10px] text-slate-400 flex items-center gap-1">
                  Stage 1 Extracted (Answer Pending Stage 2 AI)
                </span>
              </div>
            )}
          </div>
        ))}

        {filteredQuestions.length === 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center text-slate-400 space-y-2">
            <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
            <div className="text-sm font-semibold text-slate-300">No questions matched your search filter</div>
            <div className="text-xs text-slate-500">Try loosening your keyword search or category filters.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export function formatQuestionType(type: QuestionType | string): string {
  switch (type) {
    case 'multiple_choice':
      return 'Multiple Choice';
    case 'cloze_item':
      return 'Cloze Gap';
    case 'word_bank_fill':
      return 'Word Bank Blank';
    case 'fill_blank':
      return 'Fill in Blank';
    case 'matching':
      return 'Column Matching';
    case 'true_false':
      return 'True / False';
    case 'short_answer':
      return 'Short Answer';
    case 'unscramble':
      return 'Sentence Unscramble';
    case 'form_in_parentheses':
      return 'Verb / Word Form';
    case 'combine_sentences':
      return 'Sentence Combination';
    case 'active_passive':
      return 'Active / Passive Voice';
    case 'error_correction':
      return 'Mistake Correction';
    case 'letter_reorder':
      return 'Letter Reorder / Spelling';
    default:
      return type;
  }
}

export function getTypeBadgeStyle(type: QuestionType | string): string {
  switch (type) {
    case 'multiple_choice':
      return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
    case 'cloze_item':
      return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
    case 'word_bank_fill':
      return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
    case 'matching':
      return 'bg-orange-500/10 text-orange-300 border-orange-500/30';
    case 'true_false':
      return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    case 'unscramble':
    case 'combine_sentences':
    case 'active_passive':
      return 'bg-rose-500/10 text-rose-300 border-rose-500/30';
    default:
      return 'bg-slate-700/50 text-slate-300 border-slate-600';
  }
}
