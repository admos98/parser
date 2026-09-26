import React, { useState } from 'react';
import {
  X,
  Save,
  Trash2,
  Plus,
  BookOpen,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
import { QuestionItem, QuestionType } from '../types/exam';
import { formatQuestionType } from './QuestionBankView';

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
    onSave({
      ...question,
      stem,
      type,
      mark,
      correctAnswer: correctAnswer || undefined,
      options: options.length ? options : undefined,
      persianInstruction: persianInstruction || undefined,
      parentContextTitle: parentContextTitle || undefined,
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
            <div>
              <label className="block text-slate-400 font-medium mb-1">Question Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="cloze_item">Cloze Item</option>
                <option value="word_bank_fill">Word Bank Blank</option>
                <option value="fill_blank">Fill Blank</option>
                <option value="matching">Matching</option>
                <option value="true_false">True / False</option>
                <option value="short_answer">Short Answer</option>
                <option value="unscramble">Unscramble</option>
                <option value="form_in_parentheses">Form in Parentheses</option>
                <option value="error_correction">Error Correction</option>
                <option value="letter_reorder">Letter Reorder</option>
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

          {/* Persian Instruction */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Persian Instruction (Optional)</label>
            <input
              type="text"
              value={persianInstruction}
              onChange={(e) => setPersianInstruction(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 font-persian focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Parent Context Title */}
          <div>
            <label className="block text-slate-400 font-medium mb-1">Linked Parent Context / Passage</label>
            <input
              type="text"
              value={parentContextTitle}
              onChange={(e) => setParentContextTitle(e.target.value)}
              placeholder="e.g. Cloze Passage: Zakaria al-Razi"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
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
