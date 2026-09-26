import React, { useState } from 'react';
import {
  X,
  Upload,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText,
  Download,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';
import { exportBatchToExcel, exportBatchToJson } from '../utils/exporter';
import { parseExamRawText } from '../utils/parserEngine';
import { extractTextFromFile } from '../utils/fileExtractor';

interface BatchProcessingModalProps {
  onClose: () => void;
  onAddDocuments: (documents: ExamDocument[]) => void;
  existingDocuments: ExamDocument[];
}

interface QueuedFile {
  id: string;
  name: string;
  size: string;
  file: File;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  parsedDocument?: ExamDocument;
}

export const BatchProcessingModal: React.FC<BatchProcessingModalProps> = ({
  onClose,
  onAddDocuments,
  existingDocuments,
}) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState<number>(-1);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: QueuedFile[] = Array.from(e.target.files).map((f) => ({
      id: `q-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      file: f,
      status: 'pending',
    }));
    setQueue((prev) => [...prev, ...newFiles]);
  };

  const handleRemoveItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const startBatchProcessing = async () => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const successfullyParsed: ExamDocument[] = [];

    for (let i = 0; i < queue.length; i++) {
      if (queue[i].status === 'done') continue;

      setProcessingIndex(i);
      setQueue((prev) =>
        prev.map((item, idx) => (idx === i ? { ...item, status: 'processing' } : item)),
      );

      try {
        const item = queue[i];
        let parsedDoc: ExamDocument | null = null;

        try {
          const base64Data = await readFileAsBase64(item.file);
          const mimeType = item.file.type || 'application/pdf';

          const res = await fetch('/api/parse-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: item.name,
              fileData: base64Data,
              mimeType,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            parsedDoc = data.document;
          }
        } catch (serverErr) {
          console.warn('Server batch parse failed, using offline AST extraction:', serverErr);
        }

        // If server failed or unavailable, use offline engine
        if (!parsedDoc) {
          const extractedText = await extractTextFromFile(item.file);
          parsedDoc = parseExamRawText(extractedText, item.name);
        }

        successfullyParsed.push(parsedDoc);

        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i ? { ...it, status: 'done', parsedDocument: parsedDoc } : it,
          ),
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((it, idx) =>
            idx === i
              ? { ...it, status: 'error', errorMessage: err.message || 'Processing failed' }
              : it,
          ),
        );
      }
    }

    if (successfullyParsed.length > 0) {
      onAddDocuments(successfullyParsed);
    }

    setIsProcessing(false);
    setProcessingIndex(-1);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // strip data:...;base64,
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleExportAllCompletedExcel = () => {
    const allDocs = [
      ...existingDocuments,
      ...queue.filter((q) => q.status === 'done' && q.parsedDocument).map((q) => q.parsedDocument!),
    ];
    exportBatchToExcel(allDocs);
  };

  const handleExportAllCompletedJson = () => {
    const allDocs = [
      ...existingDocuments,
      ...queue.filter((q) => q.status === 'done' && q.parsedDocument).map((q) => q.parsedDocument!),
    ];
    const jsonStr = exportBatchToJson(allDocs);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Batch_Exams_Export_${allDocs.length}_Files.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const completedCount = queue.filter((q) => q.status === 'done').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-md">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Batch AI Exam Parser & Answer Solver
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  Multi-File Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Upload multiple exam PDFs, scans, or text files. The AI extracts questions and solves the answer keys automatically.
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

        {/* Upload Zone */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-xl p-6 text-center space-y-2 bg-slate-950/50 transition">
            <Upload className="w-8 h-8 text-indigo-400 mx-auto" />
            <div className="text-xs font-semibold text-slate-200">
              <label className="text-indigo-400 hover:text-indigo-300 cursor-pointer">
                <span>Select multiple exam files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg,.txt,.docx"
                  onChange={handleFilesSelected}
                  className="hidden"
                />
              </label>{' '}
              to add to batch queue
            </div>
            <p className="text-[11px] text-slate-500">
              Supports PDF, PNG/JPEG exam photos, and text files. Each sheet is analyzed and solved.
            </p>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Batch Queue ({queue.length} files)</span>
                <span>
                  {completedCount} of {queue.length} completed
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {queue.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-medium text-slate-200 block truncate">{item.name}</span>
                        <span className="text-[10px] text-slate-500">{item.size}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.status === 'pending' && (
                        <span className="text-[11px] text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                          Queued
                        </span>
                      )}
                      {item.status === 'processing' && (
                        <span className="text-[11px] text-indigo-400 flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60">
                          <Loader2 className="w-3 h-3 animate-spin" /> Solving...
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60">
                          <CheckCircle className="w-3 h-3" /> Solved (
                          {item.parsedDocument?.totalQuestions} Qs)
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span
                          title={item.errorMessage}
                          className="text-[11px] text-red-400 flex items-center gap-1 font-semibold px-2 py-0.5 rounded bg-red-950/60 border border-red-800/60"
                        >
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}

                      {!isProcessing && (
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-slate-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Existing Store Count */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Total Loaded Exams in Active Store: <strong className="text-white">{existingDocuments.length} exams</strong>
            </span>
            <span className="text-indigo-400 font-semibold font-mono">
              {existingDocuments.reduce((s, d) => s + d.totalQuestions, 0)} Total Solved Questions
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              disabled={existingDocuments.length === 0 && completedCount === 0}
              onClick={handleExportAllCompletedExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-semibold border border-emerald-500/30 disabled:opacity-40 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Batch Export All (Excel .xlsx)</span>
            </button>

            <button
              disabled={existingDocuments.length === 0 && completedCount === 0}
              onClick={handleExportAllCompletedJson}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 disabled:opacity-40 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Batch JSON</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition"
            >
              Close
            </button>

            <button
              disabled={queue.length === 0 || isProcessing}
              onClick={startBatchProcessing}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing Batch ({processingIndex + 1}/{queue.length})...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Process All with AI ({queue.length} Files)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
