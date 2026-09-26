import { ExamDocument } from '../types/exam';
import { ProviderConfig, DEFAULT_PROVIDER_CONFIG } from '../types/settings';
import { MOTAHARI_STAGE1_OFFLINE, BUSHEHR_STAGE1_OFFLINE } from '../data/offlineSampleData';
import { MOTAHARI_GRADE9_EXAM, BUSHEHR_GRADE12_EXAM } from '../data/sampleExamData';

const DB_NAME = 'ExaParseStorage';
const DB_VERSION = 1;
const EXAMS_STORE = 'exams';
const SETTINGS_STORE = 'settings';
const SETTINGS_KEY = 'provider_config';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EXAMS_STORE)) {
        db.createObjectStore(EXAMS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Load all saved exams from IndexedDB (with localStorage fallback).
 * If empty on first boot, seeds with the initial sample exams.
 */
export async function loadExams(): Promise<ExamDocument[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(EXAMS_STORE, 'readonly');
      const store = tx.objectStore(EXAMS_STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = req.result as ExamDocument[];
        if (results && results.length > 0) {
          resolve(results);
        } else {
          // Seed initial samples
          const defaultExams: ExamDocument[] = [
            MOTAHARI_STAGE1_OFFLINE,
            MOTAHARI_GRADE9_EXAM,
            BUSHEHR_STAGE1_OFFLINE,
            BUSHEHR_GRADE12_EXAM,
          ];
          saveExams(defaultExams).catch(() => {});
          resolve(defaultExams);
        }
      };
      req.onerror = () => {
        resolve(loadExamsFromLocalStorage());
      };
    });
  } catch (err) {
    return loadExamsFromLocalStorage();
  }
}

function loadExamsFromLocalStorage(): ExamDocument[] {
  try {
    const data = localStorage.getItem('exaparse_exams');
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load exams from localStorage', e);
  }
  return [
    MOTAHARI_STAGE1_OFFLINE,
    MOTAHARI_GRADE9_EXAM,
    BUSHEHR_STAGE1_OFFLINE,
    BUSHEHR_GRADE12_EXAM,
  ];
}

/**
 * Save all exams in IndexedDB and localStorage
 */
export async function saveExams(exams: ExamDocument[]): Promise<void> {
  // Sync to localStorage
  try {
    localStorage.setItem('exaparse_exams', JSON.stringify(exams));
  } catch (e) {
    console.warn('localStorage quota exceeded or unavailable', e);
  }

  try {
    const db = await openDB();
    const tx = db.transaction(EXAMS_STORE, 'readwrite');
    const store = tx.objectStore(EXAMS_STORE);
    store.clear();
    for (const exam of exams) {
      store.put(exam);
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Failed to save to IndexedDB', err);
  }
}

/**
 * Save or update single exam
 */
export async function saveExam(exam: ExamDocument): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXAMS_STORE, 'readwrite');
    const store = tx.objectStore(EXAMS_STORE);
    store.put(exam);
  } catch (e) {
    console.warn('IndexedDB put error', e);
  }

  // Also update in localStorage
  try {
    const current = loadExamsFromLocalStorage();
    const existingIndex = current.findIndex((e) => e.id === exam.id);
    if (existingIndex >= 0) {
      current[existingIndex] = exam;
    } else {
      current.unshift(exam);
    }
    localStorage.setItem('exaparse_exams', JSON.stringify(current));
  } catch (e) {
    // ignore
  }
}

/**
 * Delete an exam by ID
 */
export async function deleteExam(id: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXAMS_STORE, 'readwrite');
    const store = tx.objectStore(EXAMS_STORE);
    store.delete(id);
  } catch (e) {
    console.warn('IndexedDB delete error', e);
  }

  try {
    const current = loadExamsFromLocalStorage();
    const filtered = current.filter((e) => e.id !== id);
    localStorage.setItem('exaparse_exams', JSON.stringify(filtered));
  } catch (e) {
    // ignore
  }
}

/**
 * Load provider settings
 */
export async function loadSettings(): Promise<ProviderConfig> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const req = store.get(SETTINGS_KEY);
      req.onsuccess = () => {
        if (req.result) {
          resolve({ ...DEFAULT_PROVIDER_CONFIG, ...req.result });
        } else {
          resolve(loadSettingsFromLocalStorage());
        }
      };
      req.onerror = () => resolve(loadSettingsFromLocalStorage());
    });
  } catch (err) {
    return loadSettingsFromLocalStorage();
  }
}

function loadSettingsFromLocalStorage(): ProviderConfig {
  try {
    const val = localStorage.getItem('exaparse_provider_config');
    if (val) {
      return { ...DEFAULT_PROVIDER_CONFIG, ...JSON.parse(val) };
    }
  } catch (e) {
    // ignore
  }
  return DEFAULT_PROVIDER_CONFIG;
}

/**
 * Save provider settings
 */
export async function saveSettings(settings: ProviderConfig): Promise<void> {
  try {
    localStorage.setItem('exaparse_provider_config', JSON.stringify(settings));
  } catch (e) {
    // ignore
  }

  try {
    const db = await openDB();
    const tx = db.transaction(SETTINGS_STORE, 'readwrite');
    const store = tx.objectStore(SETTINGS_STORE);
    store.put(settings, SETTINGS_KEY);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB saveSettings error', err);
  }
}

/**
 * Export full exam library as formatted JSON string
 */
export function exportLibraryJson(exams: ExamDocument[]): string {
  const payload = {
    app: 'ExaParse Pro',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    totalExams: exams.length,
    exams,
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Import exams from JSON string
 */
export function importLibraryJson(jsonStr: string): ExamDocument[] {
  const parsed = JSON.parse(jsonStr);
  let importedExams: ExamDocument[] = [];
  if (Array.isArray(parsed)) {
    importedExams = parsed;
  } else if (parsed && Array.isArray(parsed.exams)) {
    importedExams = parsed.exams;
  } else if (parsed && parsed.id && parsed.sections) {
    importedExams = [parsed];
  } else {
    throw new Error('Invalid JSON format: Expected ExamDocument or array of exams.');
  }

  // Ensure unique IDs
  return importedExams.map((doc, idx) => ({
    ...doc,
    id: doc.id ? `${doc.id}-imported-${idx}` : `exam-${Date.now()}-${idx}`,
  }));
}
