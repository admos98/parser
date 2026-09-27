import React, { useState } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  BookOpen,
  CheckCircle,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { QuestionItem, QuestionType } from '../types/exam';
import { QUESTION_TYPE_REGISTRY, getQuestionTypeInfo } from '../utils/questionTypeMapper';

interface QuestionDetailModalProps {
  question: QuestionItem;
  onSave: (updatedQuestion: QuestionItem) => void;
  onClose: () => void;
}

export const QuestionDetailModal: React.FC<QuestionDetailModalProps> = ({
  question,
  onSave,
  onClose,
}) => {
  const [stem, setStem] = useState(question.stem);
  const [type, setType] = useState<QuestionType>(question.type);
  const [mark, setMark] = useState(question.mark);
  const [correctAnswer, setCorrectAnswer] = useState(question.correctAnswer || '');
  const [options, setOptions] = useState(question.options || []);
  const [persianInstruction, setPersianInstruction] = useState(question.persianInstruction || '');
  const [parentContextTitle, setParentContextTitle] = useState(question.parentContextTitle || '');
  const [parentContextText, setParentContextText] = useState(question.parentContextText || '');
  const [wordBankWordsStr, setWordBankWordsStr] = useState(
    question.wordBankWords ? question.wordBankWords.join(', ') : '',
  );

  const handleAddOption = () => {
    const nextId = String.fromCharCode(97 + options.length); // a, b, c, d...
    setOptions([...options, { id: nextId, text: '' }]);
  };

  const handleUpdateOption = (index: number, text: string) => {
    const next = [...options];
    next[index] = { ...next[index], text };
    setOptions(next);
  };

  const handleRemoveOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const typeInfo = getQuestionTypeInfo(type);
    const parsedWordBank = wordBankWordsStr
      .split(/[,،]+/)
      .map((w) => w.trim())
      .filter(Boolean);

    onSave({
      ...question,
      stem,
      type,
      typeEnName: typeInfo.enName,
      typeFaName: typeInfo.faName,
      mark,
      correctAnswer: correctAnswer || undefined,
      options: options.length ? options : undefined,
      persianInstruction: persianInstruction || undefined,
      parentContextTitle: parentContextTitle || undefined,
      parentContextText: parentContextText || undefined,
      wordBankWords: parsedWordBank.length ? parsedWordBank : undefined,
      reviewed: true,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center font-code text-sm">
              Q{question.displayNumber}
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Edit AST Question Properties</h3>
              <p className="text-xs text-slate-400">
                Row {question.sectionRowId} • {question.sectionName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {/* Row 1: Type, Mark, Parent Context */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-slate-400 font-medium mb-1">
                Question Type (Bilingual)
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 text-[11px]"
              >
                {Object.values(QUESTION_TYPE_REGISTRY).map((qt) => (
                  <option key={qt.type} value={qt.type}>
                    {qt.enName} ({qt.faName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Mark (Points)</label>
              <input
                type="number"
                step="0.25"
                value={mark}
                onChange={(e) => setMark(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">Correct Answer Key</label>
              <input
                type="text"
                value={correctAnswer}
                onChange={(e) => setCorrectAnswer(e.target.value)}
                placeholder="e.g. b, or was broken"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium text-emerald-400"
              />
            </div>
          </div>

          {/* Stem Text */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Question Stem</label>
            <textarea
              rows={3}
              value={stem}
              onChange={(e) => setStem(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            />
          </div>

          {/* Word Bank Words (Available for this question) */}
          {(type === 'word_bank_fill' || wordBankWordsStr) && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-1">
              <label className="block text-amber-300 font-bold mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                Word Box Candidate Words (Comma-Separated)
              </label>
              <input
                type="text"
                value={wordBankWordsStr}
                onChange={(e) => setWordBankWordsStr(e.target.value)}
                placeholder="e.g. compiled, appreciate, effectively, founded"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-amber-500"
              />
              <p className="text-[10px] text-slate-400">
                These candidate words are saved directly to this question and exported to Excel/JSON.
              </p>
            </div>
          )}

          {/* Linked Parent Passage / Paragraph Text */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-400 font-medium flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Linked Passage / Reading Paragraph Text
              </label>
              <input
                type="text"
                value={parentContextTitle}
                onChange={(e) => setParentContextTitle(e.target.value)}
                placeholder="Passage title (e.g. Reading 1: Edison)"
                className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[11px] text-slate-300 w-48"
              />
            </div>
            <textarea
              rows={3}
              value={parentContextText}
              onChange={(e) => setParentContextText(e.target.value)}
              placeholder="Paste or edit the full related paragraph or reading passage text..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200 focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
            />
          </div>

          {/* Options (for MCQ / Cloze) */}
          {(type === 'multiple_choice' || type === 'cloze_item' || options.length > 0) && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Answer Options</span>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Option
                </button>
              </div>

              <div className="space-y-1.5">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 text-center font-bold text-slate-400 uppercase">
                      {opt.id}.
                    </span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => handleUpdateOption(idx, e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-slate-200"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="text-slate-500 hover:text-red-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
