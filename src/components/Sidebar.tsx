import React from 'react';
import {
  Home,
  FilePlus,
  Layers,
  BookOpen,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Zap,
  Cpu,
  CheckCircle2,
} from 'lucide-react';
import { ProviderConfig } from '../types/settings';

export type ScreenId = 'dashboard' | 'parse' | 'batch' | 'library' | 'settings' | 'detail';

interface SidebarProps {
  currentScreen: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  providerConfig: ProviderConfig;
  totalExams: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentScreen,
  onNavigate,
  collapsed,
  onToggleCollapse,
  providerConfig,
  totalExams,
}) => {
  const navItems = [
    { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: Home },
    { id: 'parse' as ScreenId, label: 'Parse Exam', icon: FilePlus },
    { id: 'batch' as ScreenId, label: 'Batch Processing', icon: Layers },
    { id: 'library' as ScreenId, label: 'Exam Library', icon: BookOpen, badge: totalExams },
    { id: 'settings' as ScreenId, label: 'AI Provider & Settings', icon: Settings },
  ];

  const hasConfiguredKey = Boolean(providerConfig.apiKey || providerConfig.provider === 'ollama');

  return (
    <aside
      className={`relative flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-200 z-30 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800">
        {!collapsed ? (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-white tracking-wide flex items-center gap-1.5">
                ExaParse <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">PRO</span>
              </div>
              <p className="text-[10px] text-slate-400">Offline & AI Exam AST Engine</p>
            </div>
          </div>
        ) : (
          <div className="w-9 h-9 mx-auto rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Zap className="w-5 h-5 fill-current" />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition hidden sm:block"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id || (item.id === 'library' && currentScreen === 'detail');

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span>{item.label}</span>
                  {typeof item.badge === 'number' && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive ? 'bg-indigo-800/80 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Provider Status Chip at Bottom */}
      <div className="p-3 border-t border-slate-800">
        {!collapsed ? (
          <div
            onClick={() => onNavigate('settings')}
            className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 cursor-pointer transition group"
          >
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="text-slate-400 flex items-center gap-1.5 font-medium">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" />
                AI Engine
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  hasConfiguredKey ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
            </div>
            <div className="text-xs font-semibold text-slate-200 truncate group-hover:text-indigo-300 transition">
              {providerConfig.provider.toUpperCase()}
            </div>
            <div className="text-[10px] text-slate-500 truncate font-mono">
              {hasConfiguredKey ? providerConfig.model : 'Offline Only (No Key)'}
            </div>
          </div>
        ) : (
          <button
            onClick={() => onNavigate('settings')}
            className="w-10 h-10 mx-auto rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition"
            title={`Provider: ${providerConfig.provider} (${providerConfig.model})`}
          >
            <Cpu className="w-4 h-4 text-indigo-400" />
          </button>
        )}
      </div>
    </aside>
  );
};
