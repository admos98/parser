import React, { useState } from 'react';
import {
  Upload,
  FileCode,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Cpu,
  Layers,
  FileText,
  Image,
} from 'lucide-react';
import { parseExamRawText } from '../utils/parserEngine';
import { extractTextFromFile } from '../utils/fileExtractor';
import { BUSHEHR_GRADE12_EXAM, MOTAHARI_GRADE9_EXAM } from '../data/sampleExamData';
import { ExamDocument } from '../types/exam';
import { ProviderConfig } from '../types/settings';

interface ParseScreenProps {
  initialTab?: string;
  providerConfig: ProviderConfig;
  onExamParsed: (exam: ExamDocument) => void;
}

export const ParseScreen: React.FC<ParseScreenProps> = ({
  initialTab = 'upload',
  providerConfig,
  onExamParsed,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste' | 'presets'>(
    initialTab === 'paste' ? 'paste' : 'upload',
  );
  const [pastedText, setPastedText] = useState('');
  const [customFileName, setCustomFileName] = useState('custom_exam.txt');
  const [solveWithAi, setSolveWithAi] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | null>(null);

  const hasConfiguredKey = Boolean(providerConfig.apiKey || providerConfig.provider === 'ollama');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setProgressPercent(null);
    setStatusMessage('Reading file...');

    try {
      // If "Solve with AI" is enabled and user has configured key
      if (solveWithAi) {
        setStatusMessage(`Sending to ${providerConfig.provider.toUpperCase()} AI model...`);

        // Check if file is small enough for direct base64 transmission
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

        try {
          const response = await fetch('/api/parse-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              filename: file.name,
              fileData: base64,
              mimeType,
              providerConfig,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            onExamParsed(data.document);
            return;
          }
        } catch (serverErr) {
          console.warn('AI Parse endpoint failed, falling back to offline AST engine:', serverErr);
        }
      }

      // Offline Extraction Path:
      // Supports .docx (unzipping word/document.xml), .pdf (digital layer or scanned canvas OCR),
      // and image files (.png, .jpg, etc.) with pure local offline OCR!
      setStatusMessage(`Extracting text from ${file.name}...`);
      const extractedText = await extractTextFromFile(file, (status, pct) => {
        setStatusMessage(status);
        setProgressPercent(pct);
      });

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('Extracted text was empty.');
      }

      setStatusMessage('Constructing exam AST with deterministic offline engine...');
      const parsedDoc = parseExamRawText(extractedText, file.name);

      // If user requested AI solve and server is available, attempt solve stage
      if (solveWithAi) {
        try {
          setStatusMessage(`Solving answer keys via ${providerConfig.provider.toUpperCase()}...`);
          const solveRes = await fetch('/api/solve-parsed-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: parsedDoc, providerConfig }),
          });
          if (solveRes.ok) {
            const data = await solveRes.json();
            onExamParsed(data.document);
            return;
          }
        } catch (e) {
          console.warn('Solve step failed, returning Stage 1 doc:', e);
        }
      }

      // Return Stage 1 offline raw document
      onExamParsed({
        ...parsedDoc,
        parseStage: 'stage1_offline_unsolved',
        isAiSolved: false,
      });
    } catch (err: any) {
      console.error('File parsing error:', err);
      alert(`Parsing Error: ${err.message || 'Failed to parse file'}`);
    } finally {
      setLoading(false);
      setStatusMessage('');
      setProgressPercent(null);
    }
  };

  const handleParsePasted = async () => {
    if (!pastedText.trim()) return;

    setLoading(true);
    setStatusMessage('Parsing text with offline AST engine...');

    try {
      const parsed = parseExamRawText(pastedText, customFileName);

      if (solveWithAi) {
        try {
          setStatusMessage(`Solving answer keys with ${providerConfig.provider.toUpperCase()}...`);
          const solveRes = await fetch('/api/solve-parsed-exam', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: parsed, providerConfig }),
          });
          if (solveRes.ok) {
            const data = await solveRes.json();
            onExamParsed(data.document);
            return;
          }
        } catch (e) {
          console.warn('Solve failed, falling back to offline raw', e);
        }
      }

      onExamParsed({
        ...parsed,
        parseStage: 'stage1_offline_unsolved',
        isAiSolved: false,
      });
    } finally {
      setLoading(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white">Parse Single Exam</h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Ingest Word `.docx`, PDF (digital or scanned), text dumps, or images. Choose between Stage 1 Offline AST and Stage 2 AI Solving.
        </p>
      </div>

      {/* Global AI Mode Banner & Toggle */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-2">
              <span>Pipeline Mode:</span>
              <span className={solveWithAi ? 'text-indigo-400' : 'text-amber-400'}>
                {solveWithAi ? 'Stage 2 (AI-Solved Answer Key)' : 'Stage 1 (Pure Offline Deterministic AST)'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {solveWithAi
                ? `Uses configured provider (${providerConfig.provider}) to solve answer keys and teacher corrections.`
                : '100% offline, 0 network requests, 0 API cost. Extracts stems, choices, marks, word banks.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs font-semibold text-slate-300">Solve with AI</span>
            <input
              type="checkbox"
              checked={solveWithAi}
              onChange={(e) => setSolveWithAi(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600 relative"></div>
          </label>
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Tab Buttons */}
        <div className="px-6 pt-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition ${
              activeTab === 'upload'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload File (.docx / .pdf / .txt / images)</span>
          </button>
          <button
            onClick={() => setActiveTab('paste')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition ${
              activeTab === 'paste'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Paste Raw Text / OCR</span>
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold border-b-2 transition ${
              activeTab === 'presets'
                ? 'border-indigo-500 text-indigo-400 bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Sample Presets</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-10 text-center space-y-4 transition bg-slate-950/40">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center mx-auto">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  {loading ? (
                    <div className="space-y-3">
                      <div className="text-sm font-bold text-indigo-400 animate-pulse">
                        {statusMessage || 'Processing file...'}
                      </div>
                      {typeof progressPercent === 'number' && (
                        <div className="max-w-xs mx-auto space-y-1">
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 transition-all duration-300"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{progressPercent}%</div>
                        </div>
                      )}
                      <p className="text-xs text-slate-500">
                        Running local offline engine (Tesseract.js / PDF.js / JSZip XML)...
                      </p>
                    </div>
                  ) : (
                    <>
                      <label className="cursor-pointer inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition">
                        <Upload className="w-4 h-4" />
                        <span>Select Exam Document or Image</span>
                        <input
                          type="file"
                          accept=".txt,.docx,.pdf,.ocr,.json,.png,.jpg,.jpeg,.webp,.tiff"
                          onChange={handleFileUpload}
                          className="hidden"
                          disabled={loading}
                        />
                      </label>
                      <p className="text-xs text-slate-400 mt-3 max-w-md mx-auto leading-relaxed">
                        Drag or select `.docx`, `.pdf`, `.txt`, `.ocr` or image files (`.png`, `.jpg`, `.jpeg`).
                        Scanned image PDFs are automatically recognized via 100% offline OCR with 0 network calls.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Paste OCR or exam text with row letters (A, B, C...) or question numbers:</span>
                <input
                  type="text"
                  value={customFileName}
                  onChange={(e) => setCustomFileName(e.target.value)}
                  placeholder="Exam title or filename..."
                  className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-slate-300 text-xs w-56 font-mono"
                />
              </div>

              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={12}
                placeholder={`Paste OCR or exam text here, e.g.:\n\nA Choose the correct answer 2\n1. "Why is Amin busy these days?"\na. working on a new project\nb. very tired\n\nD Fill in the blanks with the words given. 2\nfigure effectively appreciate founded compiled\n9. With an American father and a French mother, she is...`}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-4 text-xs font-code text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {pastedText.length > 0 ? `${pastedText.split('\n').length} lines • ${pastedText.length} characters` : ''}
                </span>

                <button
                  disabled={!pastedText.trim() || loading}
                  onClick={handleParsePasted}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition shadow-lg shadow-indigo-600/30"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{solveWithAi ? 'Parse & Solve with AI' : 'Parse with Offline AST Engine'}</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'presets' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-400 font-medium">
                Load real Iranian national and high school exam papers to test offline parser performance:
              </div>

              {/* Preset 1: Motahari */}
              <div
                onClick={() => onExamParsed(MOTAHARI_GRADE9_EXAM)}
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-emerald-500/40 hover:border-emerald-500 cursor-pointer transition space-y-2 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Motahari Boys High School - Grade 9 English (Prospect 3)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    24 Items • 10 pts
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Rows A to I. Includes MCQs with multiline choices, Bahador's New Year word bank (10 words in box for 8 blanks), teacher picture questions, dialogue completion, unscramble, spelling, and reading passage.
                </p>
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1 pt-1">
                  Load into workbench <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Preset 2: Bushehr */}
              <div
                onClick={() => onExamParsed(BUSHEHR_GRADE12_EXAM)}
                className="p-4 rounded-xl bg-slate-950 hover:bg-slate-850 border border-indigo-500/40 hover:border-indigo-500 cursor-pointer transition space-y-2 group shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-indigo-300 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-indigo-400" />
                    Bushehr Shariati High School - Grade 12 English (Attached Sample)
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                    67 Questions • 32 pts
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  5 pages. Contains Listening (Audio 1-3), Word Bank (10 words), Matching table, Grammar MCQ, Parentheses verb forms, Cloze Test, and 2 full Reading Passages.
                </p>
                <div className="text-xs font-semibold text-indigo-400 flex items-center gap-1 pt-1">
                  Load into workbench <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
