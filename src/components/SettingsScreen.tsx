import React, { useState } from 'react';
import {
  Settings,
  Cpu,
  Key,
  Globe,
  Sliders,
  Sparkles,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ProviderConfig,
  AIProvider,
  PROVIDER_DEFAULT_BASE_URLS,
  PROVIDER_DEFAULT_MODELS,
  DEFAULT_PROVIDER_CONFIG,
} from '../types/settings';

interface SettingsScreenProps {
  config: ProviderConfig;
  onSaveConfig: (newConfig: ProviderConfig) => Promise<void>;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ config, onSaveConfig }) => {
  const [provider, setProvider] = useState<AIProvider>(config.provider);
  const [baseURL, setBaseURL] = useState<string>(config.baseURL || PROVIDER_DEFAULT_BASE_URLS[config.provider] || '');
  const [apiKey, setApiKey] = useState<string>(config.apiKey || '');
  const [showKey, setShowKey] = useState<boolean>(false);
  const [model, setModel] = useState<string>(config.model || PROVIDER_DEFAULT_MODELS[config.provider]);
  const [temperature, setTemperature] = useState<number>(config.temperature ?? 0.2);
  const [maxTokens, setMaxTokens] = useState<number>(config.maxTokens ?? 8192);

  // Model Fetching state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState<boolean>(false);

  // Connection Test state
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    model?: string;
    latencyMs?: number;
    sample?: any;
    error?: string;
  } | null>(null);

  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Switch provider handler: auto-fills standard baseURL and default model
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setBaseURL(PROVIDER_DEFAULT_BASE_URLS[newProvider]);
    setModel(PROVIDER_DEFAULT_MODELS[newProvider]);
    setAvailableModels([]);
    setTestResult(null);
  };

  // Fetch models from provider
  const handleFetchModels = async () => {
    setIsFetchingModels(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/list-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          baseURL,
          apiKey,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (Array.isArray(data.models) && data.models.length > 0) {
        setAvailableModels(data.models);
      } else {
        alert('No models returned from provider list.');
      }
    } catch (err: any) {
      alert(`Failed to fetch models: ${err.message}`);
    } finally {
      setIsFetchingModels(false);
    }
  };

  // Test connection
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    const testPayload: ProviderConfig = {
      provider,
      baseURL,
      apiKey,
      model,
      temperature,
      maxTokens,
    };

    try {
      const res = await fetch('/api/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ providerConfig: testPayload }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setTestResult({
          ok: true,
          model: data.model,
          latencyMs: data.latencyMs,
          sample: data.sample,
        });
      } else {
        setTestResult({
          ok: false,
          error: data.error || 'Connection test failed',
        });
      }
    } catch (err: any) {
      setTestResult({
        ok: false,
        error: err.message || 'Network request failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Settings
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: ProviderConfig = {
      provider,
      baseURL: provider === 'gemini' ? '' : baseURL,
      apiKey: apiKey.trim(),
      model: model.trim(),
      temperature,
      maxTokens,
    };

    await onSaveConfig(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetDefaults = () => {
    if (!window.confirm('Reset AI provider settings to defaults?')) return;
    setProvider(DEFAULT_PROVIDER_CONFIG.provider);
    setBaseURL(DEFAULT_PROVIDER_CONFIG.baseURL || '');
    setApiKey('');
    setModel(DEFAULT_PROVIDER_CONFIG.model);
    setTemperature(DEFAULT_PROVIDER_CONFIG.temperature);
    setMaxTokens(DEFAULT_PROVIDER_CONFIG.maxTokens);
    setTestResult(null);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          AI Provider & Engine Settings
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          Configure which LLM powers Stage 2 exam solving. Run against Gemini, OpenAI, OpenRouter, local Ollama, or custom OpenAI-compatible gateways.
        </p>
      </div>

      {/* Regional Block & Bypass Callout */}
      <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 flex items-start gap-3 text-xs leading-relaxed text-slate-300">
        <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-indigo-300">Regional Block & VPN-Free Access Note: </span>
          Users located in regions where direct Google Gemini or OpenAI API calls are blocked (such as Iran) can configure an
          OpenAI-compatible gateway (e.g., <strong className="text-white">OpenRouter</strong>, <strong className="text-white">Vercel AI Gateway</strong>, or a local <strong className="text-white">Ollama</strong> instance on <code className="text-indigo-300 bg-slate-950 px-1 py-0.5 rounded font-mono">http://localhost:11434/v1</code>) to parse and solve exams seamlessly without needing a VPN.
          Alternatively, the <strong>Stage 1 Offline AST engine</strong> runs 100% locally with zero internet access required.
        </div>
      </div>

      {/* Main Settings Form */}
      <form onSubmit={handleSave} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
        {/* Field 1: Provider Selection */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-400" />
            AI Provider
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {[
              { id: 'gemini' as AIProvider, label: 'Google Gemini (Native)' },
              { id: 'openai' as AIProvider, label: 'OpenAI' },
              { id: 'openrouter' as AIProvider, label: 'OpenRouter' },
              { id: 'vercel' as AIProvider, label: 'Vercel AI Gateway' },
              { id: 'ollama' as AIProvider, label: 'Ollama (Local)' },
              { id: 'custom' as AIProvider, label: 'Custom (OpenAI-compatible)' },
            ].map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleProviderChange(p.id)}
                className={`p-3 rounded-xl border text-left text-xs font-semibold transition ${
                  provider === p.id
                    ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Field 2: Base URL (Hidden for Gemini Native) */}
        {provider !== 'gemini' && (
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-indigo-400" />
              API Base URL
            </label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <p className="text-[11px] text-slate-500">
              The root endpoint of your OpenAI-compatible API (calls will be routed to <code className="font-mono">{baseURL}/chat/completions</code>).
            </p>
          </div>
        )}

        {/* Field 3: API Key */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              API Key {provider === 'ollama' && <span className="text-slate-500 font-normal lowercase">(optional for local Ollama)</span>}
            </label>
            <span className="text-[11px] text-slate-500 font-mono">Stored only in your browser (IndexedDB)</span>
          </div>

          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Field 4: Model Selector with "Fetch Models" */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Model Identifier
            </label>

            <button
              type="button"
              onClick={handleFetchModels}
              disabled={isFetchingModels}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-400 text-xs font-semibold transition"
            >
              {isFetchingModels ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Fetch Models</span>
            </button>
          </div>

          <div className="space-y-2">
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. gemini-2.5-flash, gpt-4o-mini, deepseek/deepseek-chat"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
            />

            {availableModels.length > 0 && (
              <div className="p-2 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold px-2">Select from discovered models:</span>
                <div className="max-h-36 overflow-y-auto divide-y divide-slate-850">
                  {availableModels.map((m) => (
                    <div
                      key={m}
                      onClick={() => setModel(m)}
                      className={`p-1.5 px-2 rounded-lg text-xs font-mono cursor-pointer transition ${
                        model === m ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {m}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sliders: Temperature & Max Tokens */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">Temperature</span>
              <span className="font-mono text-indigo-400">{temperature}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-500 bg-slate-800 rounded-lg h-2"
            />
            <p className="text-[10px] text-slate-500">Lower values (0.1–0.3) provide more deterministic and accurate exam answer keys.</p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-300 uppercase tracking-wider">Max Output Tokens</span>
              <span className="font-mono text-indigo-400">{maxTokens}</span>
            </div>
            <input
              type="number"
              min={1000}
              max={32768}
              step={512}
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value, 10) || 8192)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Test Connection Banner */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-bold text-white">Diagnostics & Verification</h4>
              <p className="text-[11px] text-slate-400">Send a lightweight round-trip query to verify credentials and measure latency.</p>
            </div>

            <button
              type="button"
              disabled={isTesting}
              onClick={handleTestConnection}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition disabled:opacity-50"
            >
              {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              <span>Test Connection</span>
            </button>
          </div>

          {/* Test Result Display */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border text-xs space-y-1.5 animate-fadeIn ${
                testResult.ok
                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/20 border-red-500/40 text-red-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {testResult.ok ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Connection Verified Successfully</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-200">
                      {testResult.latencyMs} ms
                    </span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span>Connection Failed</span>
                  </>
                )}
              </div>

              {testResult.ok ? (
                <div className="text-[11px] text-slate-300 font-mono">
                  Model responded: <strong>{testResult.model}</strong>
                </div>
              ) : (
                <div className="text-[11px] text-red-300 leading-relaxed">
                  {testResult.error}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs text-slate-500 hover:text-slate-300 transition"
          >
            Reset to Defaults
          </button>

          <div className="flex items-center gap-3">
            {savedSuccess && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition"
            >
              Save Settings
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
