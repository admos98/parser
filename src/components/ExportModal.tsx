import React, { useState } from 'react';
import {
  X,
  FileSpreadsheet,
  FileCode,
  FileText,
  Download,
  Copy,
  Check,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';
import {
  exportToExcel,
  exportBatchToExcel,
  exportToCleanJson,
  exportBatchToJson,
  exportToCsv,
  exportBatchToCsv,
  exportToMoodleGift,
  downloadFile,
} from '../utils/exporter';

interface ExportModalProps {
  document: ExamDocument;
  documents: ExamDocument[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ document, documents, onClose }) => {
  const [scope, setScope] = useState<'current' | 'batch'>(documents.length > 1 ? 'batch' : 'current');
  const [activeFormat, setActiveFormat] = useState<'excel' | 'json' | 'csv' | 'moodle'>('excel');
  const [copied, setCopied] = useState(false);

  const jsonContent = React.useMemo(() => {
    return scope === 'batch' ? exportBatchToJson(documents) : exportToCleanJson(document);
  }, [document, documents, scope]);

  const csvContent = React.useMemo(() => {
    return scope === 'batch' ? exportBatchToCsv(documents) : exportToCsv(document);
  }, [document, documents, scope]);

  const moodleContent = React.useMemo(() => exportToMoodleGift(document), [document]);

  const handleDownloadExcel = () => {
    if (scope === 'batch') {
      exportBatchToExcel(documents);
    } else {
      exportToExcel(document);
    }
  };

  const handleDownloadJson = () => {
    const filename =
      scope === 'batch'
        ? `Batch_Exams_Export_${documents.length}_Files.json`
        : `${document.id}_CleanExam.json`;
    downloadFile(jsonContent, filename, 'application/json');
  };

  const handleDownloadCsv = () => {
    const filename =
      scope === 'batch'
        ? `Batch_Exams_Export_${documents.length}_Files.csv`
        : `${document.id}_Questions.csv`;
    downloadFile(csvContent, filename, 'text/csv');
  };

  const handleDownloadMoodle = () => {
    downloadFile(moodleContent, `${document.id}_MoodleGIFT.txt`, 'text/plain');
  };

  const handleCopyCurrent = () => {
    const text =
      activeFormat === 'json' ? jsonContent : activeFormat === 'csv' ? csvContent : moodleContent;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalQuestionsInExport =
    scope === 'batch'
      ? documents.reduce((s, d) => s + d.totalQuestions, 0)
      : document.totalQuestions;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Export Clean Exam Question Bank
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                  {totalQuestionsInExport} Solved Items
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Ready for database ingestion, LMS import, or offline spreadsheet analysis.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scope Selector: Single vs Batch */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Export Scope:</span>
            <div className="inline-flex rounded-lg bg-slate-850 p-1 border border-slate-700 text-xs font-semibold">
              <button
                onClick={() => setScope('batch')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
                  scope === 'batch'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All {documents.length} Exams in Batch</span>
              </button>
              <button
                onClick={() => setScope('current')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded transition ${
                  scope === 'current'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>Current Exam Only ({document.header.schoolName})</span>
              </button>
            </div>
          </div>

          <span className="text-xs text-indigo-400 font-mono font-medium">
            {scope === 'batch'
              ? `Exporting ${documents.length} exams (${totalQuestionsInExport} questions)`
              : `Exporting 1 exam (${totalQuestionsInExport} questions)`}
          </span>
        </div>

        {/* Format Selector Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'excel', label: 'Excel (.xlsx)', icon: FileSpreadsheet, desc: 'Multi-sheet workbook' },
            { id: 'json', label: 'Platform JSON', icon: FileCode, desc: 'Nested AST & schema' },
            { id: 'csv', label: 'CSV Table', icon: FileText, desc: 'Flat question rows' },
            { id: 'moodle', label: 'Moodle / GIFT', icon: Sparkles, desc: 'LMS direct import' },
          ].map((f) => {
            const Icon = f.icon;
            const isActive = activeFormat === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActiveFormat(f.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-t-lg text-xs font-semibold border-b-2 transition ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeFormat === 'excel' ? (
            <div className="space-y-4">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                    <span className="font-bold text-sm text-white">
                      {scope === 'batch'
                        ? `Consolidated Multi-Exam Workbook (${documents.length} Files)`
                        : `${document.header.courseName} Workbook`}
                    </span>
                  </div>
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    {scope === 'batch' ? `${documents.length + 2} Sheets` : '3 Sheets'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-300">Master Question Bank Sheet</span>
                    <p className="text-slate-400 text-[11px]">
                      Contains all {totalQuestionsInExport} questions from {scope === 'batch' ? 'all uploaded exams' : 'this exam'} with Question Stem, Option A-D, Solved Correct Answer, Points, Row, Type, and Context.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                    <span className="font-bold text-indigo-300">Dedicated Exam Sheets</span>
                    <p className="text-slate-400 text-[11px]">
                      Each exam has its own labeled sheet plus a global summary sheet of schools, dates, and total points.
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs shadow-lg shadow-emerald-900/30 transition active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      Download {scope === 'batch' ? `Batch Excel (${documents.length} Files)` : 'Excel Workbook'} (.xlsx)
                    </span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {scope === 'batch'
                    ? `Consolidated JSON Array for all ${documents.length} exams`
                    : 'Clean Structured JSON with Solved Answer Keys'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyCurrent}
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={
                      activeFormat === 'json'
                        ? handleDownloadJson
                        : activeFormat === 'csv'
                        ? handleDownloadCsv
                        : handleDownloadMoodle
                    }
                    className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download File</span>
                  </button>
                </div>
              </div>

              <pre className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs font-code text-slate-300 max-h-[360px] overflow-x-auto leading-relaxed">
                {activeFormat === 'json' && jsonContent}
                {activeFormat === 'csv' && csvContent}
                {activeFormat === 'moodle' && moodleContent}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>Processed and structured • Ready for immediate DB import</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
