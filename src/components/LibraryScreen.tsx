import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  BookOpen,
  Sparkles,
  Download,
  Trash2,
  Copy,
  ArrowRight,
  Upload,
  CheckSquare,
  Square,
  CheckCircle2,
  Clock,
  Cpu,
} from 'lucide-react';
import { ExamDocument } from '../types/exam';
import { ProviderConfig } from '../types/settings';
import { exportToCleanJson, exportExamToExcel, exportBatchToJson, exportBatchToExcel, downloadFile } from '../utils/exporter';
import { exportLibraryJson, importLibraryJson } from '../utils/storage';

interface LibraryScreenProps {
  exams: ExamDocument[];
  providerConfig: ProviderConfig;
  onSelectExam: (examId: string) => void;
  onUpdateExam: (updated: ExamDocument) => void;
  onDeleteExam: (id: string) => void;
  onImportExams: (exams: ExamDocument[]) => void;
  onSolveExam: (exam: ExamDocument) => Promise<void>;
}

export const LibraryScreen: React.FC<LibraryScreenProps> = ({
  exams,
  providerConfig,
  onSelectExam,
  onUpdateExam,
  onDeleteExam,
  onImportExams,
  onSolveExam,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | 'stage1' | 'stage2'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'confidence_desc' | 'questions_desc'>('date_desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSolvingBatch, setIsSolvingBatch] = useState(false);

  // Filter & Sort
  const filteredExams = useMemo(() => {
    return exams.filter((exam) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        exam.filename.toLowerCase().includes(q) ||
        exam.header.courseName.toLowerCase().includes(q) ||
        exam.header.schoolName.toLowerCase().includes(q) ||
        exam.header.gradeAndMajor.toLowerCase().includes(q);

      const isSolved = exam.isAiSolved || exam.parseStage === 'stage2_ai_solved';
      const matchesStage =
        stageFilter === 'all' ||
        (stageFilter === 'stage1' && !isSolved) ||
        (stageFilter === 'stage2' && isSolved);

      return matchesSearch && matchesStage;
    }).sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.parsedAt || 0).getTime() - new Date(a.parsedAt || 0).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.parsedAt || 0).getTime() - new Date(b.parsedAt || 0).getTime();
      }
      if (sortBy === 'confidence_desc') {
        return b.confidenceScore - a.confidenceScore;
      }
      if (sortBy === 'questions_desc') {
        return b.totalQuestions - a.totalQuestions;
      }
      return 0;
    });
  }, [exams, searchQuery, stageFilter, sortBy]);

  // Bulk selection toggles
  const handleToggleSelectAll = () => {
    if (selectedIds.length === filteredExams.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExams.map((e) => e.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  // Bulk Actions
  const handleBulkDelete = () => {
    if (!window.confirm(`Delete ${selectedIds.length} selected exams?`)) return;
    for (const id of selectedIds) {
      onDeleteExam(id);
    }
    setSelectedIds([]);
  };

  const handleBulkSolve = async () => {
    setIsSolvingBatch(true);
    try {
      const targets = exams.filter((e) => selectedIds.includes(e.id) && (!e.isAiSolved || e.parseStage === 'stage1_offline_unsolved'));
      for (const target of targets) {
        await onSolveExam(target);
      }
    } finally {
      setIsSolvingBatch(false);
    }
  };

  const handleBulkExportExcel = () => {
    const selectedExams = exams.filter((e) => selectedIds.includes(e.id));
    if (selectedExams.length === 0) return;
    exportBatchToExcel(selectedExams, `ExaParse_Selected_${selectedExams.length}_Exams.xlsx`);
  };

  // Row Duplicate
  const handleDuplicate = (exam: ExamDocument) => {
    const dup: ExamDocument = {
      ...exam,
      id: `exam-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      filename: `Copy of ${exam.filename}`,
      parsedAt: new Date().toISOString(),
    };
    onImportExams([dup]);
  };

  // Export & Import Library JSON
  const handleExportFullLibrary = () => {
    const jsonStr = exportLibraryJson(exams);
    downloadFile(jsonStr, `ExaParse_Library_Backup_${exams.length}_Exams.json`, 'application/json');
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importLibraryJson(text);
        onImportExams(imported);
        alert(`Successfully imported ${imported.length} exams into library.`);
      } catch (err: any) {
        alert(`Import Error: ${err.message || 'Invalid JSON backup'}`);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-indigo-400" />
            Exam Library
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Persistent storage of all parsed exams. Filter by Stage 1 (Unsolved) and Stage 2 (AI-Solved).
          </p>
        </div>

        {/* Import/Export Backup Buttons */}
        <div className="flex items-center gap-2">
          <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition">
            <Upload className="w-3.5 h-3.5 text-indigo-400" />
            <span>Import JSON</span>
            <input type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
          </label>

          <button
            onClick={handleExportFullLibrary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 transition"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Backup Library</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-lg">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by school, course, grade, or filename..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setStageFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              stageFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({exams.length})
          </button>
          <button
            onClick={() => setStageFilter('stage1')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              stageFilter === 'stage1'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stage 1 (Unsolved)
          </button>
          <button
            onClick={() => setStageFilter('stage2')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              stageFilter === 'stage2'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stage 2 (AI-Solved)
          </button>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="confidence_desc">Highest Quality</option>
            <option value="questions_desc">Most Questions</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-xs shadow-lg animate-fadeIn">
          <div className="text-indigo-200 font-semibold flex items-center gap-2">
            <span>{selectedIds.length} exams selected</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={isSolvingBatch}
              onClick={handleBulkSolve}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold shadow transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Solve Selected</span>
            </button>
            <button
              onClick={handleBulkExportExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/30 text-emerald-300 hover:bg-emerald-600/40 font-semibold border border-emerald-500/30 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleBulkDelete}
              className="p-1.5 px-2.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 font-semibold border border-red-500/30 transition"
            >
              <Trash2 className="w-3.5 h-3.5 inline mr-1" />
              <span>Delete</span>
            </button>
          </div>
        </div>
      )}

      {/* Exams Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-[11px] text-slate-400 uppercase font-semibold">
            <tr>
              <th className="py-3 px-4 w-10">
                <button onClick={handleToggleSelectAll} className="text-slate-400 hover:text-white">
                  {selectedIds.length === filteredExams.length && filteredExams.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-indigo-400" />
                  ) : (
                    <Square className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="py-3 px-4">Exam / Course</th>
              <th className="py-3 px-4">School & Grade</th>
              <th className="py-3 px-4">Items / Marks</th>
              <th className="py-3 px-4">Confidence</th>
              <th className="py-3 px-4">Stage</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filteredExams.map((exam) => {
              const isSelected = selectedIds.includes(exam.id);
              const isSolved = exam.isAiSolved || exam.parseStage === 'stage2_ai_solved';

              return (
                <tr
                  key={exam.id}
                  className={`hover:bg-slate-850/50 transition ${isSelected ? 'bg-indigo-950/20' : ''}`}
                >
                  <td className="py-3.5 px-4">
                    <button onClick={() => handleToggleSelect(exam.id)} className="text-slate-400 hover:text-white">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-400" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 max-w-xs">
                    <div
                      onClick={() => onSelectExam(exam.id)}
                      className="font-bold text-slate-100 hover:text-indigo-400 cursor-pointer transition truncate"
                    >
                      {exam.header.courseName}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 truncate">{exam.filename}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300 max-w-xs">
                    <div className="truncate">{exam.header.schoolName}</div>
                    <div className="text-[11px] text-slate-500 truncate">{exam.header.gradeAndMajor}</div>
                  </td>

                  <td className="py-3.5 px-4 text-slate-300">
                    <div className="font-semibold text-white">{exam.totalQuestions} Questions</div>
                    <div className="text-[11px] text-slate-500">{exam.totalMarks} Marks</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-mono font-bold text-emerald-400">{exam.confidenceScore}%</span>
                  </td>

                  <td className="py-3.5 px-4">
                    {isSolved ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> Stage 2 (Solved)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> Stage 1 (Raw)
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onSelectExam(exam.id)}
                        className="p-1 px-2.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600 hover:text-white text-xs font-semibold transition"
                      >
                        Open
                      </button>

                      {!isSolved && (
                        <button
                          onClick={() => onSolveExam(exam)}
                          className="p-1 px-2 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-semibold transition"
                          title="Solve with AI"
                        >
                          <Sparkles className="w-3.5 h-3.5 inline mr-1" />
                          Solve
                        </button>
                      )}

                      <button
                        onClick={() => exportExamToExcel(exam)}
                        className="p-1.5 text-slate-400 hover:text-emerald-400 transition"
                        title="Download Excel (.xlsx)"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(exam)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 transition"
                        title="Duplicate exam"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (window.confirm(`Delete "${exam.header.courseName}"?`)) {
                            onDeleteExam(exam.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-400 transition"
                        title="Delete exam"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {filteredExams.length === 0 && (
          <div className="p-12 text-center text-slate-500 text-xs">
            No exams match your current search or filter criteria.
          </div>
        )}
      </div>
    </div>
  );
};
