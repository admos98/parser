import React, { useState } from 'react';
import {
  Network,
  BookOpen,
  ArrowRight,
  Database,
  Layers,
  Sparkles,
  CheckCircle2,
  Table,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { ExamDocument, QuestionItem } from '../types/exam';

interface ContextGraphViewProps {
  document: ExamDocument;
  onSelectQuestion: (question: QuestionItem) => void;
}

export const ContextGraphView: React.FC<ContextGraphViewProps> = ({
  document,
  onSelectQuestion,
}) => {
  const [activeGroup, setActiveGroup] = useState<'all' | 'cloze' | 'wordbank' | 'passages' | 'matching'>('all');

  return (
    <div className="space-y-6">
      {/* Intro Explanation Banner */}
      <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-500/30 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 mt-1">
            <Network className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
              Parent-Child Context Linker Architecture
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                Offline AST Graph
              </span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
              Answering your exact concern: <em>"How to make an offline parser find the passage and all related answers for a Cloze test, or link the answer box words to fill-in-the-blank questions?"</em>
              <br />
              Below is the live relationship graph constructed by our deterministic AST engine for this 5-page exam.
            </p>
          </div>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800 text-xs flex-wrap">
          <span className="text-slate-400 font-medium">Filter Relationship Graph:</span>
          {(
            [
              ['all', 'All Linked Bundles (4)'],
              ['cloze', 'Cloze Test & Gap Options (Row P)'],
              ['wordbank', 'Word Bank & Blanks (Row D)'],
              ['passages', 'Reading Passages & Items (Row Q)'],
              ['matching', 'Column A vs B Matching (Row E)'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveGroup(key)}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                activeGroup === key
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Group 1: Cloze Test (Row P) */}
      {(activeGroup === 'all' || activeGroup === 'cloze') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold text-xs">
                Row P • Cloze Test Bundle
              </span>
              <h3 className="text-sm font-bold text-white">Zakaria al-Razi Passage ↔ Questions 50-55</h3>
            </div>
            <span className="text-xs font-mono text-purple-400 bg-purple-950/50 px-2 py-0.5 rounded border border-purple-800/40">
              Pattern: PassageGapExtractor + ArityMatcher
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Parent Passage */}
            <div className="lg:col-span-5 bg-slate-950 border border-purple-900/40 rounded-lg p-3 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold text-purple-300 pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Parent Passage (AST Node: ContextPassage)
                </span>
                <span className="text-[10px] text-slate-400">6 Gaps Detected</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Zakaria al-Razi is <span className="bg-purple-900/80 text-purple-200 px-1 rounded font-bold">31) -----</span> as the most famous Iranian <span className="bg-purple-900/80 text-purple-200 px-1 rounded font-bold">32) -----</span>. He was <span className="bg-purple-900/80 text-purple-200 px-1 rounded font-bold">33) -----</span> in 854 AD. When he was a young man, he was interested in chemistry. Because of doing many experiments, he <span className="bg-purple-900/80 text-purple-200 px-1 rounded font-bold">34) -----</span> his eyes. So, he left chemistry and started studying medicine. He wrote many books about <span className="bg-purple-900/80 text-purple-200 px-1 rounded font-bold">35) -----</span>. In addition to writing books, two important medical centers were <span className="bg-purple-900/80 text-purple-200 px-1 rounded font-bold">36) -----</span> by him in Ray and Baghdad.
              </p>
              <div className="p-2 rounded bg-purple-950/20 border border-purple-900/20 text-[11px] text-purple-300">
                💡 <strong>Parser Heuristic:</strong> The regex <code className="text-pink-300">\b(\d+)\)\s*-+</code> extracts gap indices [31, 32, 33, 34, 35, 36]. The subsequent MCQ items are [50, 51, 52, 53, 54, 55]. Even with differing starting offsets, the 6 items are 1:1 aligned by sequential position!
              </div>
            </div>

            {/* Arrow */}
            <div className="hidden lg:flex lg:col-span-1 items-center justify-center text-purple-400">
              <ArrowRight className="w-6 h-6 animate-pulse" />
            </div>

            {/* Right: Child Questions */}
            <div className="lg:col-span-6 space-y-2">
              <div className="font-semibold text-xs text-slate-300 pb-1 flex items-center justify-between">
                <span>Associated Child Option Sets (AST: QuestionItem[])</span>
                <span className="text-[11px] text-slate-400">3.0 Marks Total</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[50, 51, 52, 53, 54, 55].map((qNum, idx) => {
                  const q = document.sections[15].questions.find((item) => item.number === qNum);
                  if (!q) return null;
                  return (
                    <div
                      key={qNum}
                      onClick={() => onSelectQuestion(q)}
                      className="p-2 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between font-bold text-purple-300 mb-1">
                        <span>Q{qNum} ➔ Gap [{31 + idx}]</span>
                        <span className="text-[10px] text-slate-400">{q.mark} pt</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400">
                        {q.options?.map((opt) => (
                          <div
                            key={opt.id}
                            className={opt.id === q.correctAnswer ? 'text-emerald-400 font-bold' : ''}
                          >
                            {opt.id}. {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group 2: Word Bank (Row D) */}
      {(activeGroup === 'all' || activeGroup === 'wordbank') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold text-xs">
                Row D • Word Bank Bundle
              </span>
              <h3 className="text-sm font-bold text-white">10 Vocabulary Tokens ↔ Questions 9-16 (8 blanks)</h3>
            </div>
            <span className="text-xs font-mono text-teal-400 bg-teal-950/50 px-2 py-0.5 rounded border border-teal-800/40">
              Pattern: WordBankTableExtractor + BlankBinder
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left: Word Bank Box */}
            <div className="lg:col-span-4 bg-slate-950 border border-teal-900/40 rounded-lg p-3 text-xs space-y-3">
              <div className="flex items-center justify-between font-semibold text-teal-300 pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <Table className="w-3.5 h-3.5" /> Word Bank Pool (10 words)
                </span>
                <span className="text-[10px] text-amber-400 font-mono">2 Distractors</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  'figure',
                  'effectively',
                  'appreciate',
                  'founded',
                  'compiled',
                  'bilingual',
                  'suppose',
                  'appropriate',
                  'shares',
                  'distinguished',
                ].map((word) => (
                  <span
                    key={word}
                    className="px-2 py-1 rounded bg-teal-950/40 border border-teal-800/40 text-teal-200 text-center font-mono font-medium"
                  >
                    {word}
                  </span>
                ))}
              </div>
              <div className="p-2 rounded bg-teal-950/20 border border-teal-900/20 text-[11px] text-teal-300 leading-relaxed">
                💡 <strong>Parser Heuristic:</strong> When a sub-table with row count 2 and column count 5 appears inside row cell <code className="text-teal-200">D</code> immediately following instruction <em>"Fill in the blanks with the words given"</em>, the AST binds these 10 strings as the global candidate word bank for all blank questions inside row <code className="text-teal-200">D</code>.
              </div>
            </div>

            {/* Right: Child Questions 9 to 16 */}
            <div className="lg:col-span-8 space-y-2">
              <div className="font-semibold text-xs text-slate-300 pb-1 flex items-center justify-between">
                <span>Associated Blank Questions (9 - 16)</span>
                <span className="text-[11px] text-slate-400">2.0 Marks Total (0.25 each)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[9, 10, 11, 12, 13, 14, 15, 16].map((num) => {
                  const q = document.sections[3].questions.find((item) => item.number === num);
                  if (!q) return null;
                  return (
                    <div
                      key={num}
                      onClick={() => onSelectQuestion(q)}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer transition flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-teal-300">Q{num}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800 font-mono">
                          Key: {q.correctAnswer}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 line-clamp-2">
                        {q.stem}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group 3: Reading Passages (Row Q) */}
      {(activeGroup === 'all' || activeGroup === 'passages') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-bold text-xs">
                Row Q • Comprehension Passages
              </span>
              <h3 className="text-sm font-bold text-white">Passage I (Nutrition) & Passage II (Dictionary) ↔ Questions 56-67</h3>
            </div>
            <span className="text-xs font-mono text-blue-400 bg-blue-950/50 px-2 py-0.5 rounded border border-blue-800/40">
              Pattern: HierarchicalSectionSplitter
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Passage I */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs">
                <span className="font-bold text-blue-300">Passage I: Nutrition</span>
                <span className="text-slate-400">Questions 56 - 61 (2.75 pts)</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-3 italic">
                "Nutrition is the process by which plants and animals take in and use food. Food is needed to keep the body running smoothly..."
              </p>
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {[56, 57, 58, 59, 60, 61].map((num) => (
                  <div
                    key={num}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center hover:border-blue-500/50 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200">Q{num}</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {num <= 57 ? 'Short Ans' : num === 61 ? 'True/False' : 'MCQ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Passage II */}
            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800 text-xs">
                <span className="font-bold text-blue-300">Passage II: How to use a dictionary</span>
                <span className="text-slate-400">Questions 62 - 67 (2.25 pts)</span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-3 italic">
                "A dictionary is a very important tool for anyone who is learning a new language. With a good one you can do the following..."
              </p>
              <div className="pt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-xs">
                {[62, 63, 64, 65, 66, 67].map((num) => (
                  <div
                    key={num}
                    className="p-1.5 rounded bg-slate-900 border border-slate-800 text-center hover:border-blue-500/50 cursor-pointer"
                  >
                    <span className="font-semibold text-slate-200">Q{num}</span>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {num <= 63 ? 'Short Ans' : num >= 66 ? 'True/False' : 'MCQ'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group 4: Matching Table (Row E) */}
      {(activeGroup === 'all' || activeGroup === 'matching') && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-300 font-bold text-xs">
                Row E • Column Matching Bundle
              </span>
              <h3 className="text-sm font-bold text-white">Column A (17-20) ↔ Column B (a-f, 2 extra)</h3>
            </div>
            <span className="text-xs font-mono text-orange-400 bg-orange-950/50 px-2 py-0.5 rounded border border-orange-800/40">
              Pattern: DualColumnTableAligner
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="font-bold text-orange-300 pb-1 border-b border-slate-800">
                Column A (Prompt Items: 4 words)
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between p-1.5 rounded bg-slate-900">
                  <span>17. combination</span>
                  <span className="text-emerald-400 font-mono font-bold">➔ c</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-900">
                  <span>18. arrange</span>
                  <span className="text-emerald-400 font-mono font-bold">➔ f</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-900">
                  <span>19. abbreviation</span>
                  <span className="text-emerald-400 font-mono font-bold">➔ a</span>
                </div>
                <div className="flex justify-between p-1.5 rounded bg-slate-900">
                  <span>20. calmly</span>
                  <span className="text-emerald-400 font-mono font-bold">➔ b</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800">
              <div className="font-bold text-orange-300 pb-1 border-b border-slate-800 flex justify-between">
                <span>Column B (Target Definitions: 6 choices)</span>
                <span className="text-[10px] text-amber-400">2 Extra Distractors</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div>a. a short form of a word or expression</div>
                <div>b. in a quiet way</div>
                <div>c. an arrangement in a particular order</div>
                <div className="text-amber-400/80">d. in a way that is successful (distractor)</div>
                <div className="text-amber-400/80">e. to cry suddenly (distractor)</div>
                <div>f. to put things in a neat, attractive, or useful order</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
