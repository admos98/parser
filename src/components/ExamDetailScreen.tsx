import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  Download,
  RotateCcw,
  CheckCircle2,
  Clock,
  BookOpen,
} from 'lucide-react';
import { ExamDocument, QuestionItem } from '../types/exam';
import { TabsNav } from './TabsNav';
import { PipelineStageBanner } from './PipelineStageBanner';
import { QuestionBankView } from './QuestionBankView';
import { DocumentViewer } from './DocumentViewer';
import { ContextGraphView } from './ContextGraphView';
import { AnomalyInspector } from './AnomalyInspector';
import { ArchitectureGuide } from './ArchitectureGuide';
import { QuestionDetailModal } from './QuestionDetailModal';
import { PassageModal } from './PassageModal';
import { ExportModal } from './ExportModal';
import { createOfflineUnsolvedDocument } from '../data/offlineSampleData';

interface ExamDetailScreenProps {
  document: ExamDocument;
  allDocuments: ExamDocument[];
  onBackToLibrary: () => void;
  onUpdateDocument: (updated: ExamDocument) => void;
  onSolveWithAi: (doc: ExamDocument) => Promise<void>;
  isSolvingAi: boolean;
}

export const ExamDetailScreen: React.FC<ExamDetailScreenProps> = ({
  document,
  allDocuments,
  onBackToLibrary,
  onUpdateDocument,
  onSolveWithAi,
  isSolvingAi,
}) => {
  const [activeTab, setActiveTab] = useState<string>('questions');
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionItem | null>(null);
  const [viewingPassage, setViewingPassage] = useState<{ title: string; text: string } | null>(null);

  const isSolved = document.isAiSolved || document.parseStage === 'stage2_ai_solved';
  const unresolvedCount = document.anomalies.filter((a) => !a.isResolved).length;

  // Handle anomaly resolution
  const handleResolveAnomaly = (anomalyId: string) => {
    const updatedAnomalies = document.anomalies.map((a) =>
      a.id === anomalyId ? { ...a, isResolved: true } : a,
    );
    const remainingUnresolved = updatedAnomalies.filter((a) => !a.isResolved).length;
    const newScore = remainingUnresolved === 0 ? 100 : Math.min(100, document.confidenceScore + 0.8);

    onUpdateDocument({
      ...document,
      anomalies: updatedAnomalies,
      confidenceScore: Math.round(newScore * 10) / 10,
    });
  };

  // Handle question edit
  const handleSaveQuestion = (updated: QuestionItem) => {
    const nextSections = document.sections.map((sec) => {
      if (sec.rowId !== updated.sectionRowId) return sec;
      return {
        ...sec,
        questions: sec.questions.map((q) => (q.id === updated.id ? updated : q)),
      };
    });
    onUpdateDocument({
      ...document,
      sections: nextSections,
    });
  };

  // Revert to Stage 1 raw
  const handleRevertToOfflineRaw = () => {
    const raw = createOfflineUnsolvedDocument(document);
    onUpdateDocument({
      ...raw,
      id: document.id,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToLibrary}
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition"
            title="Back to Exam Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg font-extrabold text-white">
                {document.header.courseName}
              </h1>
              {isSolved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3" /> Stage 2: AI-Solved
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <Clock className="w-3 h-3" /> Stage 1: Offline Raw (Unsolved)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{document.header.schoolName}</span>
              <span>•</span>
              <span>{document.header.gradeAndMajor}</span>
              <span>•</span>
              <span className="font-mono text-slate-500">{document.filename}</span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          {!isSolved ? (
            <button
              disabled={isSolvingAi}
              onClick={() => onSolveWithAi(document)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSolvingAi ? 'Solving with AI...' : 'Solve with AI'}</span>
            </button>
          ) : (
            <button
              onClick={handleRevertToOfflineRaw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold border border-slate-700 transition"
              title="Strip answers to inspect Stage 1 offline AST"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert to Raw</span>
            </button>
          )}

          <button
            onClick={() => setShowExportModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <TabsNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        anomaliesCount={unresolvedCount}
        totalQuestions={document.totalQuestions}
      />

      {/* Stage 1 vs Stage 2 Pipeline Banner */}
      <PipelineStageBanner
        document={document}
        onSolveWithAi={() => onSolveWithAi(document)}
        onResetToOffline={handleRevertToOfflineRaw}
        isSolving={isSolvingAi}
      />

      {/* Main Tab Content */}
      <div className="space-y-6">
        {activeTab === 'questions' && (
          <QuestionBankView
            document={document}
            onEditQuestion={(q) => setEditingQuestion(q)}
            onSelectPassage={(title, text) => setViewingPassage({ title, text })}
          />
        )}

        {activeTab === 'document' && (
          <DocumentViewer
            document={document}
            onSelectQuestion={(q) => setEditingQuestion(q)}
          />
        )}

        {activeTab === 'context' && (
          <ContextGraphView
            document={document}
            onSelectQuestion={(q) => setEditingQuestion(q)}
          />
        )}

        {activeTab === 'anomalies' && (
          <AnomalyInspector
            document={document}
            onResolveAnomaly={handleResolveAnomaly}
            onSelectTab={setActiveTab}
          />
        )}

        {activeTab === 'architecture' && <ArchitectureGuide />}
      </div>

      {/* Modals */}
      {showExportModal && (
        <ExportModal
          document={document}
          documents={allDocuments}
          onClose={() => setShowExportModal(false)}
        />
      )}

      {editingQuestion && (
        <QuestionDetailModal
          question={editingQuestion}
          onSave={handleSaveQuestion}
          onClose={() => setEditingQuestion(null)}
        />
      )}

      {viewingPassage && (
        <PassageModal
          title={viewingPassage.title}
          text={viewingPassage.text}
          onClose={() => setViewingPassage(null)}
        />
      )}
    </div>
  );
};
