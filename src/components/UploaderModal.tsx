import React, { useState } from 'react';
import {
  X,
  Upload,
  FileText,
  FileCode,
  ArrowRight,
  BookOpen,
  Sparkles,
  CheckCircle,
} from 'lucide-react';
import { parseExamRawText } from '../utils/parserEngine';
import { extractTextFromFile } from '../utils/fileExtractor';
import { BUSHEHR_GRADE12_EXAM, MOTAHARI_GRADE9_EXAM } from '../data/sampleExamData';
import { ExamDocument } from '../types/exam';

interface UploaderModalProps {
  onClose: () => void;
  onLoadExam: (exam: ExamDocument) => void;
}

export const UploaderModal: React.FC<UploaderModalProps> = ({ onClose, onLoadExam }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'presets'>('presets');
  const [pastedText, setPastedText] = useState('');
  const [customFileName, setCustomFileName] = useState('custom_exam.txt');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [offlineOnly, setOfflineOnly] = useState<boolean>(true);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setStatusMessage('Reading and extracting text from file...');

    // If not offline-only, try server AI first
    if (!offlineOnly) {
      try {
        setStatusMessage('Attempting Stage 2 AI server parsing...');
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onload = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || res);
          };
          reader.readAsDataURL(file);
        });

        const base64 = await base64Promise;
        const mimeType = file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'text/plain');

        const response = await fetch('/api/parse-exam', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fileData: base64,
            mimeType,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          onLoadExam(data.document);
          onClose();
          return;
        }
      } catch (err) {
        console.warn('Server AI parse failed or unavailable, falling back to offline AST engine:', err);
      }
    }

    // Offline Extraction Path:
    // Extract text from DOCX (unzipping word/document.xml), PDF (via pdf.js), or plain text
    try {
      setStatusMessage(`Extracting text from ${file.name.endsWith('.docx') ? 'Word DOCX XML' : file.name.endsWith('.pdf') ? 'PDF pages' : 'text stream'}...`);
      const extractedText = await extractTextFromFile(file);

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Extracted text was empty. For scanned image-only PDFs, please provide an OCR text file.');
      }

      setStatusMessage('Parsing exam AST with offline rule-based engine...');
      const parsed = parseExamRawText(extractedText, file.name);
      onLoadExam(parsed);
      onClose();
    } catch (err: any) {
      console.error('Offline file extraction error:', err);
      alert(`Error extracting text: ${err.message || 'Unknown extraction error'}`);
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleParsePasted = async () => {
    if (!pastedText.trim()) return;
    setLoading(true);
    setStatusMessage('Parsing pasted text...');
    try {
      if (!offlineOnly) {
        try {
          setStatusMessage('Parsing with Stage 2 AI server...');
          const response = await fetch('/api/parse-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: customFileName,
              rawText: pastedText,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            onLoadExam(data.document);
            onClose();
            return;
          }
        } catch (e) {
          console.warn('AI endpoint unavailable, using offline AST parser');
        }
      }

      setStatusMessage('Parsing with Stage 1 Offline AST engine...');
      const parsed = parseExamRawText(pastedText, customFileName);
      onLoadExam(parsed);
      onClose();
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  const handleLoadBushehr = () => {
    onLoadExam(BUSHEHR_GRADE12_EXAM);
    onClose();
  };

  const handleLoadMotahari = () => {
    onLoadExam(MOTAHARI_GRADE9_EXAM);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Load or Parse Exam Document</h3>
              <p className="text-xs text-slate-400">
                Supports mixed Persian/English/Arabic exam files, OCR dumps, and Word XML.
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

        {/* Tab Selector */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold border-b-2 transition ${
              activeTab === 'presets'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Built-in Presets</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.docx / .pdf / .txt)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-t-lg text-xs font-semibold border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-400 bg-slate-800/60'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Paste Raw Text / OCR</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-medium">
                Choose a pre-analyzed realistic exam to test the offline AST engine:
              </div>

              {/* Preset 1: Newly Uploaded Motahari Exam */}
              <div
                onClick={handleLoadMotahari}
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-emerald-500/40 hover:border-emerald-500 cursor-pointer transition space-y-2 group shadow-lg shadow-emerald-950/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-300 group-hover:text-emerald-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Motahari Boys High School - Grade 9 English (Prospect 3)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    2 Pages • 24 Items • 10 pts
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The second exam you provided: Rows A to I. Includes 4 MCQs, 4 inline bracket choices (don't/doesn't), Bahador's New Year word bank (10 words in box for 8 blanks), Picture teacher questions (mother packing, waiter), Dialogue completion, Sentence unscramble, Mrs. Marta 4 mistakes table, spelling completion (commemorate, nervous), and Safa in Tabriz garden reading passage.
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span>Persian + English Mixed</span>
                  <span>•</span>
                  <span>Table Row A to I</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    Load into workbench <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>

              {/* Preset 2: Attached Bushehr Exam */}
              <div
                onClick={handleLoadBushehr}
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-indigo-500/40 hover:border-indigo-500 cursor-pointer transition space-y-2 group shadow-lg shadow-indigo-950/20"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-300 group-hover:text-indigo-200 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    Bushehr Shariati High School - Grade 12 English (Attached Sample)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    5 Pages • 67 Questions • 32 pts
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  The 5-page senior exam. Contains Listening (Audio 1-3), Word Bank (10 words with 2 distractors), Matching table A vs B, Grammar MCQ, Parentheses forms, Hafez mistake correction, Cloze Test (Zakaria al-Razi), and 2 full Reading Passages (Nutrition & Dictionary).
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span>Persian + English Mixed</span>
                  <span>•</span>
                  <span>Table Row A to Q</span>
                  <span>•</span>
                  <span className="text-indigo-400 font-medium flex items-center gap-1">
                    Load into workbench <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                <div>
                  <span className="font-semibold text-slate-200">Parsing Engine:</span>
                  <span className="text-slate-400 ml-2">
                    {offlineOnly ? 'Stage 1: Pure Offline AST (DOCX XML / PDF.js)' : 'Stage 2: Server AI Auto-Solve'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setOfflineOnly(!offlineOnly)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition ${
                    offlineOnly
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                  }`}
                >
                  {offlineOnly ? 'Offline Rule AST (Active)' : 'AI Model (Active)'}
                </button>
              </div>

              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-8 text-center space-y-3 transition bg-slate-950/40">
                <div className="w-12 h-12 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  {loading ? (
                    <div className="space-y-2">
                      <div className="text-sm font-semibold text-indigo-400 animate-pulse">
                        {statusMessage || 'Processing document...'}
                      </div>
                      <p className="text-xs text-slate-500">Unzipping docx / extracting pdf text layers...</p>
                    </div>
                  ) : (
                    <>
                      <label className="cursor-pointer text-sm font-semibold text-indigo-400 hover:text-indigo-300">
                        <span>Click to browse exam file</span>
                        <input
                          type="file"
                          accept=".txt,.docx,.pdf,.ocr,.json"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={loading}
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-1">
                        Native support for `.docx` (word/document.xml), `.pdf` (pdf.js), `.txt`, or OCR dumps
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Paste your text with row markers (A, B, C...) or question numbers:</span>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="Filename..."
                  className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-slate-300 text-xs w-44"
                />
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={10}
                placeholder={`Paste OCR or exam text here, e.g.:\n\nA Audio 1\n1. "Why is Amin busy these days?"\na. working on a new project  b. very tired\n\nD Fill in the blanks with the words given.\nfigure effectively appreciate founded compiled\n9. With an American father and a French mother, she is...`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-end">
                <button
                  disabled={!pastedText.trim() || loading}
                  onClick={handleParsePasted}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold transition"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Parse Text with Offline AST Engine</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
