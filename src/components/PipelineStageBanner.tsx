import React from 'react';
import {
  Cpu,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileCheck,
  ShieldCheck,
  FileText,
  RotateCcw,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';

interface PipelineStageBannerProps {
  document: ExamDocument;
  onSolveWithAi: () => Promise<void>;
  onResetToOffline: () => void;
  isSolving: boolean;
}

export const PipelineStageBanner: React.FC<PipelineStageBannerProps> = ({
  document,
  onSolveWithAi,
  onResetToOffline,
  isSolving,
}) => {
  const isSolved = document.isAiSolved || document.parseStage === 'stage2_ai_solved';
  const solvedCount = document.sections.reduce(
    (acc, sec) => acc + sec.questions.filter((q) => q.correctAnswer).length,
    0,
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: 2-Stage Pipeline Visualizer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2-Stage Architecture:
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs text-slate-300 font-medium">
              Offline Structural Extraction vs. AI Answer Solving
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Step 1 Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-xs">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold text-emerald-300">Stage 1: Offline AST Parser</span>
                <span className="text-[10px] text-emerald-400/80 block">
                  100% Extracted ({document.totalQuestions} Questions, Grid A–I, 0 API)
                </span>
              </div>
            </div>

            <ArrowRight className="w-4 h-4 text-slate-500 hidden sm:inline" />

            {/* Step 2 Indicator */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition ${
                isSolved
                  ? 'bg-purple-950/50 border-purple-500/40 text-purple-300'
                  : 'bg-slate-950 border-slate-700/80 text-slate-400'
              }`}
            >
              <Sparkles className={`w-4 h-4 ${isSolved ? 'text-purple-400' : 'text-slate-500'}`} />
              <div>
                <span className={`font-bold ${isSolved ? 'text-purple-300' : 'text-slate-300'}`}>
                  Stage 2: AI Answer Key & Verification
                </span>
                <span className="text-[10px] block">
                  {isSolved
                    ? `✓ Solved & Verified (${solvedCount}/${document.totalQuestions} Answer Keys)`
                    : 'Awaiting AI Solving Call (Answers Unfilled)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 self-start lg:self-auto flex-wrap">
          {isSolved ? (
            <>
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-950/60 px-3 py-1.5 rounded-lg border border-emerald-800/50 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" /> Fully Solved & Verified
              </span>
              <button
                onClick={onResetToOffline}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
                title="Revert to Stage 1 (offline raw questions without answers)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>View Raw (No Answers)</span>
              </button>
            </>
          ) : (
            <button
              disabled={isSolving}
              onClick={onSolveWithAi}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-purple-600/30 transition active:scale-95 disabled:opacity-50"
            >
              {isSolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>AI Solving Exam Sheet...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-purple-200" />
                  <span>Run Stage 2: Solve with AI Now</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
