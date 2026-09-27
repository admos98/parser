import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { Type } from '@google/genai';
import { executeAIRequest } from './src/server/aiProvider.js';
import { PROVIDER_DEFAULT_BASE_URLS } from './src/types/settings.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Allow large payloads for PDF / Image base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static assets from public folder (e.g. offline traineddata for tesseract)
app.use(express.static(path.join(__dirname, 'public')));

// Schema for Gemini native structured output
const EXAM_PARSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    header: {
      type: Type.OBJECT,
      properties: {
        courseName: { type: Type.STRING },
        teacherName: { type: Type.STRING },
        durationMinutes: { type: Type.NUMBER },
        examDate: { type: Type.STRING },
        schoolName: { type: Type.STRING },
        district: { type: Type.STRING },
        gradeAndMajor: { type: Type.STRING },
        pageCount: { type: Type.NUMBER },
      },
      required: ['courseName', 'schoolName', 'gradeAndMajor'],
    },
    totalQuestions: { type: Type.NUMBER },
    totalMarks: { type: Type.NUMBER },
    confidenceScore: { type: Type.NUMBER },
    anomalies: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          severity: { type: Type.STRING },
          sectionRowId: { type: Type.STRING },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          suggestedFix: { type: Type.STRING },
          isResolved: { type: Type.BOOLEAN },
        },
        required: ['id', 'severity', 'title', 'description', 'suggestedFix'],
      },
    },
    sections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          rowId: { type: Type.STRING },
          majorCategory: { type: Type.STRING },
          title: { type: Type.STRING },
          persianInstruction: { type: Type.STRING },
          englishInstruction: { type: Type.STRING },
          markTotal: { type: Type.NUMBER },
          hasWordBank: { type: Type.BOOLEAN },
          wordBank: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          hasPassage: { type: Type.BOOLEAN },
          passageTitle: { type: Type.STRING },
          passageText: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                number: { type: Type.NUMBER },
                displayNumber: { type: Type.STRING },
                sectionRowId: { type: Type.STRING },
                sectionName: { type: Type.STRING },
                type: { type: Type.STRING },
                stem: { type: Type.STRING },
                persianInstruction: { type: Type.STRING },
                mark: { type: Type.NUMBER },
                correctAnswer: { type: Type.STRING },
                parentContextType: { type: Type.STRING },
                parentContextTitle: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      id: { type: Type.STRING },
                      text: { type: Type.STRING },
                    },
                    required: ['id', 'text'],
                  },
                },
              },
              required: ['id', 'number', 'displayNumber', 'sectionRowId', 'type', 'stem', 'mark'],
            },
          },
        },
        required: ['rowId', 'majorCategory', 'markTotal', 'questions'],
      },
    },
  },
  required: ['header', 'totalQuestions', 'totalMarks', 'sections'],
};

// 1. TEST CONNECTION ENDPOINT
app.post('/api/test-provider', async (req, res) => {
  try {
    const { providerConfig } = req.body;
    const testResult = await executeAIRequest({
      systemPrompt: 'You are an API diagnostic tester. Return pure JSON only with no markdown.',
      userPrompt: 'Test ping. Please reply with JSON: {"ok": true, "status": "online", "message": "ExaParse AI connection verified"}',
      providerConfig,
    });

    res.json({
      ok: true,
      model: testResult.model,
      latencyMs: testResult.latencyMs,
      sample: testResult.parsedJson,
    });
  } catch (error: any) {
    console.error('Test Provider Error:', error);
    res.status(500).json({
      ok: false,
      error: error.message || 'Connection test failed',
    });
  }
});

// 2. LIST MODELS PROXY ENDPOINT
app.all('/api/list-models', async (req, res) => {
  try {
    const provider = (req.query.provider || req.body.provider || 'gemini') as string;
    const baseURL = (req.query.baseURL || req.body.baseURL || PROVIDER_DEFAULT_BASE_URLS[provider as keyof typeof PROVIDER_DEFAULT_BASE_URLS] || '').toString().trim().replace(/\/+$/, '');
    const apiKey = (req.query.apiKey || req.body.apiKey || (provider === 'gemini' ? process.env.GEMINI_API_KEY : '')) as string;

    if (provider === 'gemini') {
      return res.json({
        models: [
          'gemini-2.5-flash',
          'gemini-2.5-pro',
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
        ],
      });
    }

    if (!baseURL) {
      return res.status(400).json({ error: 'Base URL is required to list models' });
    }

    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = 'https://exaparse.app';
      headers['X-Title'] = 'ExaParse Pro';
    }

    const response = await fetch(`${baseURL}/models`, { headers });
    if (!response.ok) {
      throw new Error(`Provider returned HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const models = Array.isArray(data.data)
      ? data.data.map((m: any) => m.id || m.name).filter(Boolean)
      : Array.isArray(data.models)
      ? data.models.map((m: any) => m.name || m.id).filter(Boolean)
      : [];

    res.json({ models });
  } catch (error: any) {
    console.warn('List Models Error:', error.message);
    res.status(500).json({ error: error.message || 'Failed to list models' });
  }
});

// 4. ENHANCE EXAM ENDPOINT (AI Refinement)
app.post('/api/enhance-exam', async (req, res) => {
  try {
    const { exam, providerConfig } = req.body;

    const systemPrompt = `You are an expert exam reviewer. Your task is to perform minimal, targeted JSON patching on the provided exam structure.

Strict Requirements:
1. Do NOT rewrite the whole exam.
2. Infer a concise 'examName' (e.g., "Grade 9 Final Exam") and add it to the header.
3. Validate 'grade' and 'term' fields in the header. If they seem generic or wrong based on the exam content, provide a better value.
4. Review anomalies for ghost indexing or mis-categorized question types and provide fixed values.
5. Return JSON only, in the format: { "fixes": { "header": { ... }, "sections": [ ... ] } }`;

    const userPrompt = `Review this exam and provide only necessary fixes:\n\n${JSON.stringify(exam)}`;

    const aiResponse = await executeAIRequest({
      systemPrompt,
      userPrompt,
      providerConfig,
    });

    const refinement = aiResponse.parsedJson;

    // Apply patches to the exam document
    const updatedExam = {
      ...exam,
      header: { ...exam.header, ...refinement.fixes?.header },
      sections: exam.sections.map((section: any, idx: number) => ({
        ...section,
        ...(refinement.fixes?.sections?.[idx] || {}),
      })),
      parseStage: 'stage2_ai_solved',
      isAiSolved: true,
      solvedAt: new Date().toISOString(),
    };

    res.json({ document: updatedExam });
  } catch (error: any) {
    console.error('Enhance Exam Error:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance exam' });
  }
});
    };

    res.json({ success: true, document: examDoc });
  } catch (error: any) {
    console.error('AI Exam Parser Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to parse exam with AI provider.',
    });
  }
});

// 4. STAGE 2 SOLVE PARSED EXAM ENDPOINT
app.post('/api/solve-parsed-exam', async (req, res) => {
  try {
    const { document, providerConfig } = req.body;

    if (!document || !document.sections) {
      return res.status(400).json({ error: 'Missing parsed exam document structure.' });
    }

    const systemPrompt = `You are an expert exam solver. You are given an exam that has ALREADY been structurally parsed (sections, questions, stems, options, and word banks are already extracted).
Your job is ONLY to SOLVE each question accurately:
1. Provide the verified "correctAnswer" for every question:
   - For multiple choice / inline choice: provide the correct option key (e.g. "a", "b", "c", or "d", or exact word).
   - For word bank fill: select the exact word from the attached word bank.
   - For error correction: identify the mistakes and provide "mistake -> correction".
   - For unscramble: provide the grammatically re-ordered sentence.
   - For spelling/letter reorder: provide the correctly spelled word.
   - For reading comprehension & dialogue: provide concise, accurate answer based on the passage or picture prompt.
2. Flag any teacher errors/typos found in the stems in the anomalies list.
3. Keep the exact section and question structure intact. Return JSON.`;

    const userPrompt = `Input Parsed Exam Structure:\n${JSON.stringify(document, null, 2)}`;

    const aiResponse = await executeAIRequest({
      systemPrompt,
      userPrompt,
      providerConfig,
    });

    const solvedData = aiResponse.parsedJson;

    // Merge answers into the existing document cleanly
    const updatedSections = document.sections.map((origSec: any) => {
      const solvedSec = (solvedData.sections || []).find((s: any) => s.rowId === origSec.rowId);
      return {
        ...origSec,
        questions: origSec.questions.map((origQ: any) => {
          const solvedQ = solvedSec?.questions?.find((sq: any) => sq.number === origQ.number || sq.id === origQ.id);
          return {
            ...origQ,
            correctAnswer: solvedQ?.correctAnswer || origQ.correctAnswer,
          };
        }),
      };
    });

    const solvedDocument = {
      ...document,
      parseStage: 'stage2_ai_solved',
      isAiSolved: true,
      solvedAt: new Date().toISOString(),
      sections: updatedSections,
      anomalies: solvedData.anomalies?.length ? solvedData.anomalies : document.anomalies,
      confidenceScore: Math.max(98.5, document.confidenceScore || 98.5),
    };

    res.json({ success: true, document: solvedDocument });
  } catch (error: any) {
    console.error('Solve Parsed Exam Error:', error);
    res.status(500).json({ error: error.message || 'Failed to solve parsed exam.' });
  }
});

// Mount Vite middleware for fast frontend serving
async function startServer() {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ExaParse Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
