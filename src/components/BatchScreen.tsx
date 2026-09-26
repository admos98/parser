import React, { useState } from 'react';
import {
  Upload,
  Layers,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Loader2,
  Download,
  Trash2,
  RefreshCw,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';
import { ProviderConfig } from '../types/settings';
import { exportBatchToExcel, exportBatchToJson, downloadFile } from '../utils/exporter';
import { parseExamRawText } from '../utils/parserEngine';
import { extractTextFromFile } from '../utils/fileExtractor';

interface BatchScreenProps {
  providerConfig: ProviderConfig;
  onAddExamsToLibrary: (exams: ExamDocument[]) => void;
  onOpenExamDetail: (examId: string) => void;
}

interface QueuedFile {
  id: string;
  name: string;
  size: string;
  file: File;
  status: 'queued' | 'extracting' | 'parsing' | 'solving' | 'done' | 'error';
  progressMsg?: string;
  errorMessage?: string;
  parsedDocument?: ExamDocument;
}

export const BatchScreen: React.FC<BatchScreenProps> = ({
  providerConfig,
  onAddExamsToLibrary,
  onOpenExamDetail,
}) => {
  const [queue, setQueue] = useState<QueuedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [concurrency, setConcurrency] = useState<number>(3);
  const [solveWithAi, setSolveWithAi] = useState<boolean>(false);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: QueuedFile[] = Array.from(e.target.files).map((f) => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: f.name,
      size: `${(f.size / 1024).toFixed(1)} KB`,
      file: f,
      status: 'queued',
    }));
    setQueue((prev) => [...prev, ...newFiles]);
  };

  const handleRemove = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearDone = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'done'));
  };

  const handleRetryFailed = () => {
    setQueue((prev) =>
      prev.map((item) => (item.status === 'error' ? { ...item, status: 'queued', errorMessage: undefined } : item)),
    );
  };

  // Process a single file in the batch
  const processFile = async (item: QueuedFile): Promise<ExamDocument> => {
    // 1. Text extraction (DOCX XML, PDF layer or canvas OCR, Image OCR)
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'extracting', progressMsg: 'Extracting text...' } : q)),
    );

    const extractedText = await extractTextFromFile(item.file, (status) => {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, progressMsg: status } : q)),
      );
    });

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('Extracted text was empty');
    }

    // 2. Offline deterministic AST parsing
    setQueue((prev) =>
      prev.map((q) => (q.id === item.id ? { ...q, status: 'parsing', progressMsg: 'Parsing AST...' } : q)),
    );

    const offlineDoc = parseExamRawText(extractedText, item.name);

    // 3. AI Solving if enabled
    if (solveWithAi) {
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'solving', progressMsg: 'Solving answer keys...' } : q)),
      );

      try {
        const res = await fetch('/api/solve-parsed-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ document: offlineDoc, providerConfig }),
        });

        if (res.ok) {
          const data = await res.json();
          return data.document;
        }
      } catch (e) {
        console.warn('AI solve failed, keeping Stage 1 offline doc', e);
      }
    }

    return {
      ...offlineDoc,
      parseStage: 'stage1_offline_unsolved',
      isAiSolved: false,
    };
  };

  // Queue runner with controlled concurrency limit
  const startBatchProcessing = async () => {
    if (queue.length === 0 || isProcessing) return;

    setIsProcessing(true);
    const successfullyParsed: ExamDocument[] = [];

    // Indices of items to process
    const pendingIndices = queue
      .map((item, idx) => (item.status === 'queued' ? idx : -1))
      .filter((idx) => idx !== -1);

    // Run pool
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < pendingIndices.length) {
        const queueIdx = pendingIndices[currentIndex++];
        const item = queue[queueIdx];
        if (!item) continue;

        try {
          const parsedDoc = await processFile(item);
          successfullyParsed.push(parsedDoc);

          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'done', progressMsg: 'Completed', parsedDocument: parsedDoc }
                : q,
            ),
          );

          // Real-time add to library
          onAddExamsToLibrary([parsedDoc]);
        } catch (err: any) {
          setQueue((prev) =>
            prev.map((q) =>
              q.id === item.id
                ? { ...q, status: 'error', errorMessage: err.message || 'Processing failed' }
                : q,
            ),
          );
        }
      }
    };

    const workerCount = Math.min(concurrency, pendingIndices.length);
    const workers = Array.from({ length: workerCount }, () => worker());
    await Promise.all(workers);

    setIsProcessing(false);
  };

  const completedDocs = queue.filter((q) => q.status === 'done' && q.parsedDocument).map((q) => q.parsedDocument!);

  const handleExportAllExcel = () => {
    if (completedDocs.length === 0) return;
    exportBatchToExcel(completedDocs, `ExaParse_Batch_${completedDocs.length}_Exams.xlsx`);
  };

  const handleExportAllJson = () => {
    if (completedDocs.length === 0) return;
    const jsonStr = exportBatchToJson(completedDocs);
    downloadFile(jsonStr, `ExaParse_Batch_${completedDocs.length}_Exams.json`, 'application/json');
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white">Batch Exam Processing</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Ingest dozens or hundreds of exams concurrently. Supports PDF, Word DOCX, text dumps, and image files.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 cursor-pointer">
            <span>Solve with AI</span>
            <input
              type="checkbox"
              checked={solveWithAi}
              onChange={(e) => setSolveWithAi(e.target.checked)}
              className="accent-indigo-500 rounded"
              disabled={isProcessing}
            />
          </label>

          <div className="flex items-center gap-2 p-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
            <span>Concurrency:</span>
            <select
              value={concurrency}
              onChange={(e) => setConcurrency(parseInt(e.target.value, 10))}
              disabled={isProcessing}
              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3 (Default)</option>
              <option value={5}>5 (Fast)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div className="border-2 border-dashed border-slate-800 hover:border-indigo-500/50 rounded-2xl p-8 text-center space-y-3 bg-slate-900/40 transition">
        <div className="w-12 h-12 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
          <Layers className="w-6 h-6" />
        </div>
        <div>
          <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition">
            <Upload className="w-4 h-4" />
            <span>Select Multiple Exam Files</span>
            <input
              type="file"
              multiple
              accept=".txt,.docx,.pdf,.ocr,.json,.png,.jpg,.jpeg,.webp,.tiff"
              onChange={handleFilesSelected}
              className="hidden"
              disabled={isProcessing}
            />
          </label>
          <p className="text-xs text-slate-400 mt-2">
            Select files to queue. Files are saved into your persistent Library as they complete.
          </p>
        </div>
      </div>

      {/* Action Bar */}
      {queue.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
          <div className="text-xs text-slate-300 font-medium">
            <span className="font-bold text-white">{queue.length}</span> files queued •{' '}
            <span className="text-emerald-400">{completedDocs.length} completed</span>
          </div>

          <div className="flex items-center gap-2">
            {completedDocs.length > 0 && (
              <>
                <button
                  onClick={handleExportAllExcel}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Batch Excel</span>
                </button>
                <button
                  onClick={handleExportAllJson}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/30 text-xs font-semibold transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>JSON</span>
                </button>
              </>
            )}

            <button
              onClick={handleRetryFailed}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Retry failed items"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleClearDone}
              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition"
              title="Clear completed items"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              disabled={isProcessing || queue.filter((q) => q.status === 'queued').length === 0}
              onClick={startBatchProcessing}
              className="inline-flex items-center gap-2 px-5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Start Batch ({queue.filter((q) => q.status === 'queued').length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Queue Table */}
      {queue.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Filename</th>
                <th className="py-3 px-4">Size</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Result Details</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {queue.map((item) => (
                <tr key={item.id} className="hover:bg-slate-850/40 transition">
                  <td className="py-3 px-4 font-mono font-medium text-slate-200 truncate max-w-xs">
                    {item.name}
                  </td>
                  <td className="py-3 px-4 text-slate-400 font-mono">{item.size}</td>
                  <td className="py-3 px-4">
                    {item.status === 'queued' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-800 text-slate-400">
                        Queued
                      </span>
                    )}
                    {(item.status === 'extracting' || item.status === 'parsing' || item.status === 'solving') && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        {item.progressMsg || item.status}
                      </span>
                    )}
                    {item.status === 'done' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold">
                        <CheckCircle className="w-3 h-3" /> Done
                      </span>
                    )}
                    {item.status === 'error' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-300 font-semibold" title={item.errorMessage}>
                        <AlertCircle className="w-3 h-3" /> Error
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {item.parsedDocument ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">{item.parsedDocument.totalQuestions} Qs</span>
                        <span>•</span>
                        <span>{item.parsedDocument.totalMarks} pts</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-mono">{item.parsedDocument.confidenceScore}%</span>
                      </div>
                    ) : item.errorMessage ? (
                      <span className="text-red-400 truncate block max-w-xs">{item.errorMessage}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {item.parsedDocument && (
                      <button
                        onClick={() => onOpenExamDetail(item.parsedDocument!.id)}
                        className="p-1 px-2 text-indigo-400 hover:text-white rounded hover:bg-slate-800 text-xs font-semibold mr-2 transition"
                      >
                        Inspect
                      </button>
                    )}
                    {!isProcessing && (
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="p-1 text-slate-500 hover:text-red-400 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
