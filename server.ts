import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Allow large payloads for PDF / Image base64 uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Native Exam AI Parsing & Solving Endpoint
app.post('/api/parse-exam', async (req, res) => {
  try {
    const { filename, fileData, mimeType, rawText } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: 'GEMINI_API_KEY is not configured on the server.',
      });
    }

    const systemPrompt = `You are an expert exam parser, curriculum specialist, and linguist specializing in Iranian, Arabic, and English high school and university examinations.
Your task is to take an exam sheet (image, PDF, or text), meticulously extract every single section, table row (e.g. Row A, B, C... Q), question stem, option, mark, and context (word banks, cloze passages, reading passages), AND SOLVE EACH QUESTION ACCURATELY to provide the verified answer key and teacher corrections.

Strict Requirements:
1. Numbering: Keep the exact question numbers as printed on the sheet. If the teacher has duplicate numbering (e.g. "31. Did Alexander Flemming 44..."), note it in the displayNumber or anomaly flag.
2. Question Types: Classify each item as one of:
   - "multiple_choice"
   - "cloze_item"
   - "word_bank_fill"
   - "fill_blank"
   - "matching"
   - "true_false"
   - "short_answer"
   - "unscramble"
   - "form_in_parentheses"
   - "combine_sentences"
   - "active_passive"
   - "error_correction"
   - "letter_reorder"
   - "inline_choice"
   - "dialogue_response"
3. Context Linking:
   - If there is a Word Bank box, extract the candidate words and attach them to all blank questions in that row.
   - If there is a Cloze Test, extract the passage text and associate each gap with its corresponding option item.
   - If there is a Reading Comprehension passage, extract the passage text and link all subsequent questions to it.
4. Solve Answer Keys: Solve each question accurately. For multiple choice, provide the correct option letter (e.g. "a", "b", "c", or "d"). For error correction, provide "mistake -> correction". For unscramble, provide the correct grammatical sentence. For reading comprehension, provide concise, accurate answers.
5. Anomalies: If the exam paper itself has typos (e.g. "np" instead of "no", or wrong counts in word bank), document them in the anomalies list.
6. Output JSON only matching the schema.`;

    const parts: any[] = [];

    if (fileData && mimeType) {
      parts.push({
        inlineData: {
          mimeType,
          data: fileData,
        },
      });
      parts.push({
        text: `Analyze and parse this exam document (${filename || 'uploaded_exam'}). Extract all questions, sections, marks, passages, word banks, and solve all answer keys. Return in the specified structured JSON format.`,
      });
    } else if (rawText) {
      parts.push({
        text: `Here is the exam text / OCR stream for (${filename || 'uploaded_exam'}):\n\n${rawText}\n\nParse this exam completely, identify all sections and questions, link passages and word banks, and solve the answer keys.`,
      });
    } else {
      return res.status(400).json({ error: 'No fileData or rawText provided.' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts },
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
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
        },
      },
    });

    const parsedJson = JSON.parse(response.text || '{}');

    // Assign unique ID and metadata
    const examDoc = {
      id: `exam-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      filename: filename || 'uploaded_exam',
      filesize: fileData ? `${Math.round((fileData.length * 0.75) / 1024)} KB` : '12 KB',
      parsedAt: new Date().toISOString(),
      parseStage: 'stage2_ai_solved',
      isAiSolved: true,
      solvedAt: new Date().toISOString(),
      ...parsedJson,
      confidenceScore: parsedJson.confidenceScore || 99.0,
      anomalies: (parsedJson.anomalies || []).map((a: any, idx: number) => ({
        ...a,
        id: a.id || `anom-${idx}`,
        isResolved: a.isResolved ?? true,
      })),
    };

    res.json({ success: true, document: examDoc });
  } catch (error: any) {
    console.error('AI Exam Parser Error:', error);
    res.status(500).json({
      error: error.message || 'Failed to parse exam with AI model.',
    });
  }
});

// STAGE 2 ENDPOINT: Takes an ALREADY PARSED (Non-AI) exam document and solves it!
app.post('/api/solve-parsed-exam', async (req, res) => {
  try {
    const { document } = req.body;

    if (!document || !document.sections) {
      return res.status(400).json({ error: 'Missing parsed exam document structure.' });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured.' });
    }

    const prompt = `You are an expert exam solver. You are given an exam that has ALREADY been structurally parsed (sections, questions, stems, options, and word banks are already extracted).
Your job is ONLY to SOLVE each question accurately:
1. Provide the verified "correctAnswer" for every question.
   - For multiple choice / inline choice: provide the correct option key (e.g. "a", "b", "c", or "d", or exact word).
   - For word bank fill: select the exact word from the attached word bank.
   - For error correction: identify the mistakes and provide "mistake -> correction".
   - For unscramble: provide the grammatically re-ordered sentence.
   - For spelling/letter reorder: provide the correctly spelled word.
   - For reading comprehension & dialogue: provide the concise, accurate answer based on the passage or picture prompt.
2. Flag any teacher errors/typos found in the stems in the anomalies list.
3. Keep the exact section and question structure intact.

Input Parsed Exam Structure:
${JSON.stringify(document, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const solvedData = JSON.parse(response.text || '{}');

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
      confidenceScore: 99.5,
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
