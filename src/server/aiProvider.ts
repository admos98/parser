import { GoogleGenAI, Type } from '@google/genai';
import { ProviderConfig, PROVIDER_DEFAULT_BASE_URLS } from '../types/settings';

export interface AIResponse {
  rawText: string;
  parsedJson: any;
  model: string;
  latencyMs: number;
}

export async function executeAIRequest({
  systemPrompt,
  userPrompt,
  fileData,
  mimeType,
  providerConfig,
  geminiSchema,
}: {
  systemPrompt: string;
  userPrompt: string;
  fileData?: string;
  mimeType?: string;
  providerConfig?: Partial<ProviderConfig>;
  geminiSchema?: any;
}): Promise<AIResponse> {
  const provider = providerConfig?.provider || 'gemini';
  const model = providerConfig?.model || (provider === 'gemini' ? 'gemini-2.5-flash' : 'gpt-4o-mini');
  const temperature = providerConfig?.temperature ?? 0.2;
  const maxTokens = providerConfig?.maxTokens ?? 8192;
  const startTime = Date.now();

  if (provider === 'gemini') {
    const apiKey = providerConfig?.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Google Gemini API Key is missing. Please set it in Settings or GEMINI_API_KEY environment variable.');
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'exaparse-pro',
        },
      },
    });

    const parts: any[] = [];
    if (fileData && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: fileData,
        },
      });
    }
    parts.push({ text: userPrompt });

    const config: any = {
      systemInstruction: systemPrompt,
      responseMimeType: 'application/json',
      temperature,
      maxOutputTokens: maxTokens,
    };
    if (geminiSchema) {
      config.responseSchema = geminiSchema;
    }

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config,
    });

    const text = response.text || '{}';
    const latencyMs = Date.now() - startTime;
    return {
      rawText: text,
      parsedJson: cleanAndParseJson(text),
      model,
      latencyMs,
    };
  }

  // OpenAI-Compatible Providers (OpenAI, OpenRouter, Vercel AI Gateway, Ollama, Custom)
  const defaultBase = PROVIDER_DEFAULT_BASE_URLS[provider] || 'https://api.openai.com/v1';
  let baseURL = (providerConfig?.baseURL || defaultBase).trim().replace(/\/+$/, '');
  const apiKey = providerConfig?.apiKey || '';

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://exaparse.app';
    headers['X-Title'] = 'ExaParse Pro';
  }

  // Build message content
  let userContent: any = userPrompt;
  if (fileData && mimeType && mimeType.startsWith('image/')) {
    userContent = [
      { type: 'text', text: userPrompt },
      {
        type: 'image_url',
        image_url: {
          url: `data:${mimeType};base64,${fileData}`,
        },
      },
    ];
  }

  const promptWithJsonInstructions = `${systemPrompt}\n\nIMPORTANT: Return valid, raw JSON only. Do not wrap in markdown or backticks.`;

  const payload: any = {
    model,
    messages: [
      { role: 'system', content: promptWithJsonInstructions },
      { role: 'user', content: userContent },
    ],
    temperature,
    max_tokens: maxTokens,
  };

  // Only pass response_format if not using models that reject it
  if (!model.includes('instruct') && !model.includes('o1-')) {
    payload.response_format = { type: 'json_object' };
  }

  const url = `${baseURL}/chat/completions`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
  } catch (netErr: any) {
    throw new Error(`Failed to connect to ${provider} endpoint at ${url}: ${netErr.message || netErr}`);
  }

  if (!res.ok) {
    const errorBody = await res.text();
    let msg = `Provider ${provider} returned HTTP ${res.status}: ${res.statusText}`;
    try {
      const parsedErr = JSON.parse(errorBody);
      if (parsedErr.error?.message) {
        msg += ` - ${parsedErr.error.message}`;
      } else if (parsedErr.message) {
        msg += ` - ${parsedErr.message}`;
      }
    } catch {
      if (errorBody) msg += ` - ${errorBody.slice(0, 200)}`;
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const rawText = data.choices?.[0]?.message?.content || '{}';
  const latencyMs = Date.now() - startTime;

  return {
    rawText,
    parsedJson: cleanAndParseJson(rawText),
    model: data.model || model,
    latencyMs,
  };
}

export function cleanAndParseJson(text: string): any {
  let cleaned = text.trim();
  // Strip markdown ```json ... ``` blocks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  }
  return JSON.parse(cleaned);
}
