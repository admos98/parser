import React from 'react';
import {
  FileText,
  Download,
  Upload,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';

interface HeaderProps {
  document: ExamDocument;
  documents: ExamDocument[];
  activeDocumentId: string;
  onSelectDocument: (id: string) => void;
  onOpenUpload: () => void;
  onOpenExport: () => void;
  onOpenBatch: () => void;
  onResetSample: () => void;
  onSelectTab: (tab: string) => void;
  activeTab: string;
}

export const Header: React.FC<HeaderProps> = ({
  document,
  documents,
  activeDocumentId,
  onSelectDocument,
  onOpenUpload,
  onOpenExport,
  onOpenBatch,
  onResetSample,
  onSelectTab,
  activeTab,
}) => {
  const unresolvedAnomalies = document.anomalies.filter((a) => !a.isResolved).length;
  const totalQuestionsInStore = documents.reduce((sum, d) => sum + d.totalQuestions, 0);

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo & Document Title & Exam Switcher */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center flex-shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  ExaParse Pro
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-300" />
                    AI Native + Batch
                  </span>
                </h1>
                <span className="text-xs text-slate-500 hidden sm:inline">|</span>

                {/* Multi-Exam Switcher */}
                <select
                  value={activeDocumentId}
                  onChange={(e) => onSelectDocument(e.target.value)}
                  className="bg-slate-800 border border-indigo-500/40 text-indigo-200 font-semibold text-xs rounded-lg px-2.5 py-1 focus:outline-none focus:border-indigo-400 cursor-pointer max-w-[280px] sm:max-w-md truncate"
                >
                  {documents.map((doc, idx) => (
                    <option key={doc.id} value={doc.id}>
                      [{idx + 1}/{documents.length}] {doc.header.schoolName} ({doc.header.courseName} - {doc.header.gradeAndMajor})
                    </option>
                  ))}
                </select>
              </div>

              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{document.header.gradeAndMajor}</span>
                <span>•</span>
                <span>{document.totalQuestions} Questions</span>
                <span>•</span>
                <span>{document.totalMarks} Marks</span>
                <span>•</span>
                <span className="text-indigo-400">Store: {documents.length} Exams ({totalQuestionsInStore} Qs Total)</span>
              </p>
            </div>
          </div>

          {/* Action buttons & Batch Queue */}
          <div className="flex items-center gap-2 flex-wrap self-end lg:self-auto">
            {/* Batch Queue Button */}
            <button
              onClick={onOpenBatch}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/40 transition active:scale-95 shadow-sm"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch Queue ({documents.length} Files)</span>
            </button>

            <button
              onClick={onResetSample}
              title="Reset to 2 Default Solved Samples"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={onOpenUpload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
            >
              <Upload className="w-3.5 h-3.5 text-indigo-400" />
              <span>Upload / AI Parse</span>
            </button>

            <button
              onClick={onOpenExport}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export (Excel / JSON)</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
