import React from 'react';
import {
  ListChecks,
  FileSpreadsheet,
  Network,
  AlertTriangle,
  Code2,
  Sliders,
} from 'lucide-react';

interface TabsNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  anomaliesCount: number;
  totalQuestions: number;
}

export const TabsNav: React.FC<TabsNavProps> = ({
  activeTab,
  onTabChange,
  anomaliesCount,
  totalQuestions,
}) => {
  const tabs = [
    {
      id: 'questions',
      label: 'Question Bank & AST',
      icon: ListChecks,
      count: totalQuestions,
    },
    {
      id: 'document',
      label: 'Exam Page Viewer (5 Pages)',
      icon: FileSpreadsheet,
    },
    {
      id: 'context',
      label: 'Context & Grouping Graph',
      icon: Network,
    },
    {
      id: 'anomalies',
      label: 'QA & Anomaly Inspector',
      icon: AlertTriangle,
      badge: anomaliesCount > 0 ? anomaliesCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    },
    {
      id: 'architecture',
      label: 'Architecture & Python Script',
      icon: Code2,
      badge: 'How It Works',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
    },
  ];

  return (
    <div className="bg-slate-900 border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-1 sm:space-x-4 overflow-x-auto py-2 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-2 py-2 px-3 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-700/80 text-slate-300 font-semibold">
                    {tab.count}
                  </span>
                )}
                {tab.badge && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
