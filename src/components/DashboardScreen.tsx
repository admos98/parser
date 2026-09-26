import React from 'react';
import {
  FilePlus,
  FileCode,
  Layers,
  BookOpen,
  Settings,
  Sparkles,
  CheckCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Cpu,
  BarChart3,
  Calendar,
  Zap,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';
import { ProviderConfig } from '../types/settings';
import { ScreenId } from './Sidebar';

interface DashboardScreenProps {
  exams: ExamDocument[];
  providerConfig: ProviderConfig;
  onNavigate: (screen: ScreenId, initialTab?: string) => void;
  onSelectExam: (examId: string) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  exams,
  providerConfig,
  onNavigate,
  onSelectExam,
}) => {
  const totalExams = exams.length;
  const stage1Count = exams.filter((e) => e.parseStage === 'stage1_offline_unsolved' || !e.isAiSolved).length;
  const stage2Count = exams.filter((e) => e.parseStage === 'stage2_ai_solved' || e.isAiSolved).length;
  const totalQuestions = exams.reduce((sum, e) => sum + e.totalQuestions, 0);
  const avgConfidence = totalExams > 0
    ? (exams.reduce((sum, e) => sum + e.confidenceScore, 0) / totalExams).toFixed(1)
    : '0';

  const recentExams = [...exams].slice(0, 5);

  const hasConfiguredKey = Boolean(providerConfig.apiKey || providerConfig.provider === 'ollama');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Dual-Stage AST & Verification Architecture
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Iranian & Mixed-Language Exam Workbench
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Parse mixed Persian, English, and Arabic exam sheets purely offline with 0 API calls (Stage 1),
              then selectively dispatch to your configured AI provider (Stage 2) to solve answer keys and flag teacher drafting anomalies.
            </p>
          </div>

          {/* AI Provider Status Chip */}
          <div className="flex flex-col sm:items-end justify-center">
            <div
              onClick={() => onNavigate('settings')}
              className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition flex items-center gap-3 shadow-lg"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${hasConfiguredKey ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                  Active AI Engine
                </div>
                <div className="text-xs font-bold text-white">
                  {hasConfiguredKey ? `${providerConfig.provider.toUpperCase()} (${providerConfig.model})` : 'Offline Only (No Key)'}
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 ml-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Exams</div>
          <div className="text-2xl font-bold text-white mt-1 font-code">{totalExams}</div>
          <div className="text-[11px] text-slate-500 mt-1">In persistent library</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Stage 1 (Unsolved)</div>
          <div className="text-2xl font-bold text-amber-300 mt-1 font-code">{stage1Count}</div>
          <div className="text-[11px] text-slate-500 mt-1">Offline extracted</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Stage 2 (AI-Solved)</div>
          <div className="text-2xl font-bold text-emerald-300 mt-1 font-code">{stage2Count}</div>
          <div className="text-[11px] text-slate-500 mt-1">Full answer keys</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-[11px] font-semibold text-indigo-400 uppercase tracking-wider">Total Questions</div>
          <div className="text-2xl font-bold text-indigo-300 mt-1 font-code">{totalQuestions}</div>
          <div className="text-[11px] text-slate-500 mt-1">Across all papers</div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Avg Confidence</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-code">{avgConfidence}%</div>
          <div className="text-[11px] text-slate-500 mt-1">AST structural score</div>
        </div>
      </div>

      {/* Primary Action Cards */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Parse File */}
          <div
            onClick={() => onNavigate('parse', 'upload')}
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition group space-y-3 shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
              <FilePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition">Parse a File</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Upload `.pdf`, `.docx`, `.txt`, or scanned images. Supports pure offline OCR & parsing.
              </p>
            </div>
            <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
              Start parsing <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 2: Paste Text */}
          <div
            onClick={() => onNavigate('parse', 'paste')}
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition group space-y-3 shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-blue-300 transition">Paste Text / OCR</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Paste raw OCR stream or exam draft with row headers A..Q or numbered questions.
              </p>
            </div>
            <div className="text-xs font-semibold text-blue-400 flex items-center gap-1">
              Open editor <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 3: Batch Parse */}
          <div
            onClick={() => onNavigate('batch')}
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition group space-y-3 shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition">Batch Parse</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Ingest hundreds of files in parallel with controlled concurrency and live queue progress.
              </p>
            </div>
            <div className="text-xs font-semibold text-purple-400 flex items-center gap-1">
              Launch batch queue <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Card 4: Open Library */}
          <div
            onClick={() => onNavigate('library')}
            className="p-5 rounded-2xl bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition group space-y-3 shadow-lg"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition">Exam Library</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Manage, search, solve, and export your persistent catalog of parsed exams.
              </p>
            </div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
              View {totalExams} exams <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Exams List */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Recent Exams in Library</h2>
          </div>
          <button
            onClick={() => onNavigate('library')}
            className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition flex items-center gap-1"
          >
            View all in Library <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="divide-y divide-slate-800">
          {recentExams.map((exam) => {
            const isSolved = exam.isAiSolved || exam.parseStage === 'stage2_ai_solved';

            return (
              <div
                key={exam.id}
                onClick={() => onSelectExam(exam.id)}
                className="py-3 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-850/60 -mx-2 px-2 rounded-xl cursor-pointer transition group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-slate-100 group-hover:text-indigo-300 transition">
                      {exam.header.courseName}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        isSolved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {isSolved ? 'Stage 2: Solved' : 'Stage 1: Raw Unsolved'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs">
                    <span>{exam.header.schoolName}</span>
                    <span>•</span>
                    <span>{exam.header.gradeAndMajor}</span>
                    <span>•</span>
                    <span className="font-mono text-slate-500">{exam.filename}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <div className="font-bold text-slate-200">{exam.totalQuestions} Questions</div>
                    <div className="text-slate-400 text-[11px]">{exam.totalMarks} Marks</div>
                  </div>
                  <div className="w-14 text-center">
                    <div className="font-bold font-mono text-emerald-400">{exam.confidenceScore}%</div>
                    <div className="text-[10px] text-slate-500">Quality</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
