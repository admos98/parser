/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Sidebar, ScreenId } from './components/Sidebar';
import { DashboardScreen } from './components/DashboardScreen';
import { ParseScreen } from './components/ParseScreen';
import { BatchScreen } from './components/BatchScreen';
import { LibraryScreen } from './components/LibraryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { ExamDetailScreen } from './components/ExamDetailScreen';
import { ExamDocument } from './types/exam';
import { ProviderConfig, DEFAULT_PROVIDER_CONFIG } from './types/settings';
import {
  loadExams,
  saveExams,
  saveExam,
  deleteExam as deleteExamFromDb,
  loadSettings,
  saveSettings,
} from './utils/storage';
import { MOTAHARI_STAGE1_OFFLINE, BUSHEHR_STAGE1_OFFLINE } from './data/offlineSampleData';
import { MOTAHARI_GRADE9_EXAM, BUSHEHR_GRADE12_EXAM } from './data/sampleExamData';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('dashboard');
  const [parseInitialTab, setParseInitialTab] = useState<string>('upload');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);

  // Persistent Multi-Exam Store
  const [documents, setDocuments] = useState<ExamDocument[]>([
    MOTAHARI_STAGE1_OFFLINE,
    MOTAHARI_GRADE9_EXAM,
    BUSHEHR_STAGE1_OFFLINE,
    BUSHEHR_GRADE12_EXAM,
  ]);
  const [activeDocumentId, setActiveDocumentId] = useState<string>(MOTAHARI_STAGE1_OFFLINE.id);

  // Persistent Settings
  const [providerConfig, setProviderConfig] = useState<ProviderConfig>(DEFAULT_PROVIDER_CONFIG);
  const [isSolvingAi, setIsSolvingAi] = useState<boolean>(false);

  // Load from IndexedDB / Storage on startup
  useEffect(() => {
    async function initStorage() {
      try {
        const [savedExams, savedSettings] = await Promise.all([
          loadExams(),
          loadSettings(),
        ]);
        if (savedExams && savedExams.length > 0) {
          setDocuments(savedExams);
          setActiveDocumentId(savedExams[0].id);
        }
        if (savedSettings) {
          setProviderConfig(savedSettings);
        }
      } catch (e) {
        console.warn('Storage initialization error:', e);
      }
    }
    initStorage();
  }, []);

  const activeDocument = documents.find((d) => d.id === activeDocumentId) || documents[0];

  // Navigate helper
  const handleNavigate = (screen: ScreenId, initialTab?: string) => {
    if (initialTab) {
      setParseInitialTab(initialTab);
    }
    setCurrentScreen(screen);
  };

  // Select an exam and open its Exam Detail screen
  const handleSelectExam = (examId: string) => {
    setActiveDocumentId(examId);
    setCurrentScreen('detail');
  };

  // Add parsed exam(s) to store & storage
  const handleExamParsed = (newExam: ExamDocument) => {
    setDocuments((prev) => {
      const filtered = prev.filter((d) => d.id !== newExam.id);
      const next = [newExam, ...filtered];
      saveExam(newExam);
      return next;
    });
    setActiveDocumentId(newExam.id);
    setCurrentScreen('detail');
  };

  const handleAddBatchExams = (newExams: ExamDocument[]) => {
    setDocuments((prev) => {
      const existingIds = new Set(newExams.map((e) => e.id));
      const remaining = prev.filter((d) => !existingIds.has(d.id));
      const next = [...newExams, ...remaining];
      saveExams(next);
      return next;
    });
  };

  const handleUpdateDocument = (updated: ExamDocument) => {
    setDocuments((prev) => {
      const next = prev.map((d) => (d.id === updated.id ? updated : d));
      saveExam(updated);
      return next;
    });
  };

  const handleDeleteDocument = (id: string) => {
    setDocuments((prev) => {
      const next = prev.filter((d) => d.id !== id);
      deleteExamFromDb(id);
      return next;
    });
    if (activeDocumentId === id && documents.length > 1) {
      const remaining = documents.filter((d) => d.id !== id);
      setActiveDocumentId(remaining[0]?.id || '');
    }
  };

  // Save Settings
  const handleSaveSettings = async (newConfig: ProviderConfig) => {
    setProviderConfig(newConfig);
    await saveSettings(newConfig);
  };

  // Solve with AI using configured provider
  const handleSolveWithAi = async (doc: ExamDocument) => {
    setIsSolvingAi(true);
    try {
      const res = await fetch('/api/solve-parsed-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: doc,
          providerConfig,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const solvedDoc = data.document;
        handleUpdateDocument(solvedDoc);
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`AI Solve failed: ${errData.error || res.statusText}`);
      }
    } catch (e: any) {
      alert(`Network error during solve: ${e.message}`);
    } finally {
      setIsSolvingAi(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden">
      {/* Persistent Collapsible Sidebar */}
      <Sidebar
        currentScreen={currentScreen}
        onNavigate={(screen) => handleNavigate(screen)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        providerConfig={providerConfig}
        totalExams={documents.length}
      />

      {/* Main Screen Body */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6">
          {currentScreen === 'dashboard' && (
            <DashboardScreen
              exams={documents}
              providerConfig={providerConfig}
              onNavigate={handleNavigate}
              onSelectExam={handleSelectExam}
            />
          )}

          {currentScreen === 'parse' && (
            <ParseScreen
              initialTab={parseInitialTab}
              providerConfig={providerConfig}
              onExamParsed={handleExamParsed}
            />
          )}

          {currentScreen === 'batch' && (
            <BatchScreen
              providerConfig={providerConfig}
              onAddExamsToLibrary={handleAddBatchExams}
              onOpenExamDetail={handleSelectExam}
            />
          )}

          {currentScreen === 'library' && (
            <LibraryScreen
              exams={documents}
              providerConfig={providerConfig}
              onSelectExam={handleSelectExam}
              onUpdateExam={handleUpdateDocument}
              onDeleteExam={handleDeleteDocument}
              onImportExams={handleAddBatchExams}
              onSolveExam={handleSolveWithAi}
            />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              config={providerConfig}
              onSaveConfig={handleSaveSettings}
            />
          )}

          {currentScreen === 'detail' && activeDocument && (
            <ExamDetailScreen
              document={activeDocument}
              allDocuments={documents}
              onBackToLibrary={() => setCurrentScreen('library')}
              onUpdateDocument={handleUpdateDocument}
              onSolveWithAi={handleSolveWithAi}
              isSolvingAi={isSolvingAi}
            />
          )}
        </main>
      </div>
    </div>
  );
}
