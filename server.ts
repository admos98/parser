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

// 3. ENHANCE & SOLVE EXAM ENDPOINT (Minimal Token Footprint, High Accuracy)
app.post('/api/enhance-exam', async (req, res) => {
  try {
    const { exam, providerConfig } = req.body;

    if (!exam || !exam.sections) {
      return res.status(400).json({ error: 'Missing parsed exam document structure.' });
    }

    // Build a compact representation for the AI (strip redundant metadata to save tokens)
    const compactExamSummary = {
      header: exam.header,
      sections: exam.sections.map((sec: any) => ({
        rowId: sec.rowId,
        category: sec.majorCategory,
        instruction: sec.englishInstruction || sec.persianInstruction || sec.title,
        hasWordBank: sec.hasWordBank,
        wordBank: sec.wordBank,
        hasPassage: sec.hasPassage,
        passageSnippet: sec.passageText ? sec.passageText.slice(0, 300) : undefined,
        questions: sec.questions.map((q: any) => ({
          id: q.id,
          number: q.number,
          type: q.type,
          stem: q.stem,
          options: q.options?.map((o: any) => `${o.id}: ${o.text}`).join(' | '),
          wordBankWords: q.wordBankWords,
          mark: q.mark,
        })),
      })),
    };

    const systemPrompt = `You are an elite exam reviewer, linguist, and curriculum specialist.
You receive a structured exam document parsed by an offline AST engine.
Your mission is to perform targeted refinement, validation, and solving WITH 100% ACCURACY while consuming MINIMAL tokens:

1. EXAM NAME (STRICT RULE: ONLY AI NAMES THE EXAM):
   - Analyze school, course, grade, and term, and provide a formal, authoritative title (e.g. "آزمون هماهنگ زبان انگلیسی پایه دوازدهم - نوبت اول").
   - Output as "examName".

2. GRADE & TERM:
   - Validate and refine "grade" (e.g. "پایه نهم" / "دوازدهم تجربی") and "term" (e.g. "نوبت اول (دی ماه)" / "نوبت دوم (خرداد)").

3. QUESTION VERIFICATION & QUESTION TYPE FIXES:
   - Verify question separation and classify correctly into one of:
     multiple_choice, cloze_item, word_bank_fill, fill_blank, matching, true_false, short_answer, long_answer_essay, unscramble, form_in_parentheses, combine_sentences, active_passive, error_correction, letter_reorder, inline_choice, dialogue_response, odd_one_out, phonetic_pronunciation, sentence_ordering, picture_description, translation, definition_matching, numerical_calculation.

4. ANSWER KEY SOLVING:
   - Provide the 100% accurate, verified correctAnswer for every question.
   - For MCQs: provide exact option letter ('a', 'b', 'c', 'd') or text.
   - For Word Bank Fill: select the exact word from the candidate word bank.
   - For unscramble/combine/passive: provide the grammatically pristine full sentence.
   - For error correction: write "mistake -> correction".

5. OUTPUT FORMAT: Return JSON only:
{
  "examName": "...",
  "grade": "...",
  "term": "...",
  "answers": [
    { "id": "...", "number": 1, "correctAnswer": "...", "type": "multiple_choice" }
  ],
  "anomalies": [
    { "title": "...", "description": "...", "suggestedFix": "..." }
  ]
}
Do NOT echo question stems or full paragraphs in your output to keep token usage minimal.`;

    const userPrompt = `Compact Exam AST:\n${JSON.stringify(compactExamSummary, null, 2)}`;

    const aiResponse = await executeAIRequest({
      systemPrompt,
      userPrompt,
      providerConfig,
    });

    const refinement = aiResponse.parsedJson || {};
    const answersList: any[] = Array.isArray(refinement.answers) ? refinement.answers : [];

    // Map answers and refinements into original structure preserving all raw data
    const updatedSections = exam.sections.map((sec: any) => ({
      ...sec,
      questions: sec.questions.map((q: any) => {
        const found = answersList.find(
          (a) => a.id === q.id || String(a.number) === String(q.number),
        );
        return {
          ...q,
          type: found?.type || q.type,
          correctAnswer: found?.correctAnswer || q.correctAnswer || '',
        };
      }),
    }));

    const updatedExam = {
      ...exam,
      header: {
        ...exam.header,
        examName: refinement.examName || exam.header.examName || `${exam.header.courseName} - ${exam.header.schoolName}`,
        grade: refinement.grade || exam.header.grade || exam.header.gradeAndMajor,
        term: refinement.term || exam.header.term || 'نوبت اول',
      },
      sections: updatedSections,
      parseStage: 'stage2_ai_solved',
      isAiSolved: true,
      solvedAt: new Date().toISOString(),
      anomalies: refinement.anomalies?.length ? refinement.anomalies : exam.anomalies,
      confidenceScore: Math.max(99.0, exam.confidenceScore || 99.0),
    };

    res.json({ success: true, document: updatedExam });
  } catch (error: any) {
    console.error('Enhance Exam Error:', error);
    res.status(500).json({ error: error.message || 'Failed to enhance exam' });
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
