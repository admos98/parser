export type AIProvider = 'gemini' | 'openai' | 'openrouter' | 'vercel' | 'ollama' | 'custom';

export interface ProviderConfig {
  provider: AIProvider;
  baseURL?: string;
  apiKey?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

export const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
  provider: 'gemini',
  baseURL: '',
  apiKey: '',
  model: 'gemini-2.5-flash',
  temperature: 0.2,
  maxTokens: 8192,
};

export const PROVIDER_DEFAULT_BASE_URLS: Record<AIProvider, string> = {
  gemini: '',
  openai: 'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  vercel: 'https://ai-gateway.vercel.sh/v1',
  ollama: 'http://localhost:11434/v1',
  custom: 'https://api.example.com/v1',
};

export const PROVIDER_DEFAULT_MODELS: Record<AIProvider, string> = {
  gemini: 'gemini-2.5-flash',
  openai: 'gpt-4o-mini',
  openrouter: 'deepseek/deepseek-chat',
  vercel: 'openai/gpt-4o-mini',
  ollama: 'llama3:latest',
  custom: 'gpt-4o-mini',
};
