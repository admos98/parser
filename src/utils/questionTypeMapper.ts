import { QuestionType } from '../types/exam';

export interface QuestionTypeDefinition {
  type: QuestionType;
  enName: string;
  faName: string;
  category: 'Vocabulary' | 'Grammar' | 'Reading' | 'Writing' | 'Listening' | 'General';
  defaultEnInstruction: string;
  defaultFaInstruction: string;
  description: string;
}

export const QUESTION_TYPE_REGISTRY: Record<QuestionType, QuestionTypeDefinition> = {
  multiple_choice: {
    type: 'multiple_choice',
    enName: 'Multiple Choice (MCQ)',
    faName: 'چهار گزینه‌ای (تستی)',
    category: 'General',
    defaultEnInstruction: 'Choose the best answer from options (a, b, c, d).',
    defaultFaInstruction: 'گزینه صحیح را از میان موارد (الف، ب، ج، د) انتخاب کنید.',
    description: 'Standard 4-option or 3-option multiple choice test item.',
  },
  cloze_item: {
    type: 'cloze_item',
    enName: 'Cloze Test Item',
    faName: 'کلوز تست (تکمیل جای خالی متن)',
    category: 'Reading',
    defaultEnInstruction: 'Read the passage and choose the best option for each blank.',
    defaultFaInstruction: 'متن زیر را بخوانید و برای هر جای خالی مناسب‌ترین گزینه را برگزینید.',
    description: 'Blank within a connected paragraph with dedicated choice options.',
  },
  word_bank_fill: {
    type: 'word_bank_fill',
    enName: 'Word Bank Fill',
    faName: 'جای خالی با جعبه واژگان',
    category: 'Vocabulary',
    defaultEnInstruction: 'Fill in the blanks using the words given in the box. (One extra word).',
    defaultFaInstruction: 'جاهای خالی را با کلمات داده شده در جعبه کامل کنید. (یک کلمه اضافی است).',
    description: 'Sentences completed using candidate words extracted from a shared word box.',
  },
  fill_blank: {
    type: 'fill_blank',
    enName: 'Direct Fill in the Blank',
    faName: 'جای خالی مستقیم (تکمیلی)',
    category: 'General',
    defaultEnInstruction: 'Fill in the blanks with appropriate words.',
    defaultFaInstruction: 'جاهای خالی را با کلمات مناسب کامل کنید.',
    description: 'Direct completion question without a closed word box.',
  },
  matching: {
    type: 'matching',
    enName: 'Matching Pairs',
    faName: 'وصل کردنی (تطابق دو ستون)',
    category: 'Vocabulary',
    defaultEnInstruction: 'Match items from Column A with the correct definitions in Column B.',
    defaultFaInstruction: 'موارد ستون الف را با تعاریف یا عبارات ستون ب مطابقت دهید.',
    description: 'Connecting items from Column A to descriptions or letters in Column B.',
  },
  true_false: {
    type: 'true_false',
    enName: 'True / False',
    faName: 'درست / نادرست (صحیح و غلط)',
    category: 'Reading',
    defaultEnInstruction: 'Read the statements and mark them as True (T) or False (F).',
    defaultFaInstruction: 'جملات زیر را بخوانید و درست (ص) یا نادرست (غ) بودن آنها را مشخص کنید.',
    description: 'Verification of statements against a reading passage or factual prompt.',
  },
  short_answer: {
    type: 'short_answer',
    enName: 'Short Answer Question',
    faName: 'پاسخ کوتاه',
    category: 'General',
    defaultEnInstruction: 'Answer the following questions in a brief sentence.',
    defaultFaInstruction: 'به سوالات زیر با یک پاسخ کوتاه و مشخص جواب دهید.',
    description: 'Brief 1-2 sentence response to a direct question.',
  },
  long_answer_essay: {
    type: 'long_answer_essay',
    enName: 'Essay / Descriptive Answer',
    faName: 'پاسخ تشریحی (انشا / توصیفی)',
    category: 'Writing',
    defaultEnInstruction: 'Write a comprehensive response or paragraph on the given prompt.',
    defaultFaInstruction: 'در مورد موضوع خواسته شده، یک پاسخ کامل یا بند بنویسید.',
    description: 'Longer paragraph, composition, or extended explanation.',
  },
  unscramble: {
    type: 'unscramble',
    enName: 'Unscramble Sentence',
    faName: 'مرتب‌سازی کلمات (جمله‌سازی)',
    category: 'Grammar',
    defaultEnInstruction: 'Put the scrambled words in the correct order to make a sentence.',
    defaultFaInstruction: 'کلمات به هم ریخته را مرتب کرده و یک جمله کامل بنویسید.',
    description: 'Reordering scrambled words into grammatically correct sentences.',
  },
  form_in_parentheses: {
    type: 'form_in_parentheses',
    enName: 'Correct Form in Parentheses',
    faName: 'شکل صحیح کلمه در پرانتز',
    category: 'Grammar',
    defaultEnInstruction: 'Put the verbs/words in parentheses in their correct grammatical forms.',
    defaultFaInstruction: 'کلمات داخل پرانتز را به شکل گرامری مناسب در جای خالی قرار دهید.',
    description: 'Transforming base verbs or adjectives into proper tense/comparative forms.',
  },
  combine_sentences: {
    type: 'combine_sentences',
    enName: 'Combine Sentences',
    faName: 'ترکیب جملات (با موصول/ربط‌دهنده)',
    category: 'Writing',
    defaultEnInstruction: 'Combine the two sentences using the conjunction or relative pronoun in brackets.',
    defaultFaInstruction: 'دو جمله داده شده را با استفاده از کلمه ربط یا ضمیر موصولی ترکیب کنید.',
    description: 'Merging two independent clauses using who, which, although, because, etc.',
  },
  active_passive: {
    type: 'active_passive',
    enName: 'Active / Passive Voice',
    faName: 'تبدیل مجهول و معلوم',
    category: 'Grammar',
    defaultEnInstruction: 'Rewrite the sentences in the passive or active voice.',
    defaultFaInstruction: 'جملات زیر را به حالت مجهول یا معلوم بازنویسی کنید.',
    description: 'Rewriting active sentence to passive structure or vice-versa.',
  },
  error_correction: {
    type: 'error_correction',
    enName: 'Error Identification & Correction',
    faName: 'شناسایی و تصحیح اشتباهات',
    category: 'Grammar',
    defaultEnInstruction: 'Find the grammatical or spelling error in each sentence and correct it.',
    defaultFaInstruction: 'اشتباه گرامری یا املایی موجود در هر جمله را پیدا کرده و تصحیح نمایید.',
    description: 'Finding erroneous words in a sentence and writing the corrected form.',
  },
  letter_reorder: {
    type: 'letter_reorder',
    enName: 'Letter Reorder / Spelling',
    faName: 'حروف درهم ریخته (املا و هجی)',
    category: 'Vocabulary',
    defaultEnInstruction: 'Unscramble the letters to make meaningful words according to pictures or definitions.',
    defaultFaInstruction: 'حروف درهم ریخته را مرتب کنید تا کلمه معناداری ساخته شود.',
    description: 'Arranging jumbled letters to spell the targeted target vocabulary word.',
  },
  inline_choice: {
    type: 'inline_choice',
    enName: 'Inline Bracketed Choice',
    faName: 'انتخاب دوگزینه‌ای داخل متن [ / ]',
    category: 'Grammar',
    defaultEnInstruction: 'Choose the correct form from the words inside brackets.',
    defaultFaInstruction: 'از بین گزینه‌های داخل پرانتز یا کروشه، مورد صحیح را برگزینید.',
    description: 'Selecting between binary choices embedded directly in the sentence, e.g. [is / are].',
  },
  dialogue_response: {
    type: 'dialogue_response',
    enName: 'Dialogue / Conversation Completion',
    faName: 'تکمیل مکالمه و گفتگو',
    category: 'Writing',
    defaultEnInstruction: 'Complete the dialogue between speakers with appropriate responses.',
    defaultFaInstruction: 'مکالمه زیر را با عبارات مناسب کامل کنید.',
    description: 'Supplying missing communicative turns in everyday conversations.',
  },
  odd_one_out: {
    type: 'odd_one_out',
    enName: 'Odd One Out',
    faName: 'کلمه یا گزینه ناهماهنگ',
    category: 'Vocabulary',
    defaultEnInstruction: 'Identify the word that does not belong in each group.',
    defaultFaInstruction: 'در هر گروه، کلمه‌ای که با بقیه ناهماهنگ است را مشخص کنید.',
    description: 'Finding the word or term with a different semantic category or stress.',
  },
  phonetic_pronunciation: {
    type: 'phonetic_pronunciation',
    enName: 'Pronunciation & Word Stress',
    faName: 'تلفظ و استرس کلمات',
    category: 'Listening',
    defaultEnInstruction: 'Identify the word with a different syllable stress or vowel pronunciation.',
    defaultFaInstruction: 'کلمه‌ای که تلفظ یا استرس آن با بقیه تفاوت دارد را مشخص کنید.',
    description: 'Phonetic minimal pairs, falling/rising intonation, and stress patterns.',
  },
  sentence_ordering: {
    type: 'sentence_ordering',
    enName: 'Paragraph Sentence Ordering',
    faName: 'مرتب‌سازی جملات پاراگراف',
    category: 'Writing',
    defaultEnInstruction: 'Order the sentences to form a coherent, logical paragraph.',
    defaultFaInstruction: 'جملات زیر را به ترتیبی مرتب کنید که یک بند منسجم و منطقی تشکیل شود.',
    description: 'Numbering sentences (1 to 4) to reconstruct cohesive paragraphs.',
  },
  picture_description: {
    type: 'picture_description',
    enName: 'Picture Description / Image Prompt',
    faName: 'پاسخ بر اساس تصویر (سوال تصویری)',
    category: 'General',
    defaultEnInstruction: 'Look at the picture and answer the question or complete the sentence.',
    defaultFaInstruction: 'با توجه به تصویر، به سوال پاسخ داده یا جمله را کامل کنید.',
    description: 'Visual question where stimulus requires inspecting an embedded image.',
  },
  translation: {
    type: 'translation',
    enName: 'Translation (EN <-> FA)',
    faName: 'ترجمه (انگلیسی به فارسی یا بالعکس)',
    category: 'Writing',
    defaultEnInstruction: 'Translate the following sentences into Persian or English accurately.',
    defaultFaInstruction: 'جملات زیر را با دقت به فارسی یا انگلیسی ترجمه کنید.',
    description: 'Accurate rendering between target language and native language.',
  },
  definition_matching: {
    type: 'definition_matching',
    enName: 'Definition Matching',
    faName: 'تطابق واژه با تعریف',
    category: 'Vocabulary',
    defaultEnInstruction: 'Match each vocabulary term with its proper dictionary definition.',
    defaultFaInstruction: 'هر واژه را با تعریف لغت‌نامه‌ای صحیح آن تطابق دهید.',
    description: 'Associating words with conceptual explanations or synonyms.',
  },
  numerical_calculation: {
    type: 'numerical_calculation',
    enName: 'Numerical / Calculation Problem',
    faName: 'مسئله محاسباتی و عددی',
    category: 'General',
    defaultEnInstruction: 'Solve the problem and write your step-by-step calculation.',
    defaultFaInstruction: 'مسئله را حل کرده و مراحل محاسبات خود را بنویسید.',
    description: 'Quantitative scientific, math, or chemistry question.',
  },
};

/**
 * Returns bilingual metadata for a given question type.
 */
export function getQuestionTypeInfo(type: QuestionType): QuestionTypeDefinition {
  return (
    QUESTION_TYPE_REGISTRY[type] || {
      type,
      enName: type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      faName: 'سوال عمومی',
      category: 'General',
      defaultEnInstruction: 'Answer the question.',
      defaultFaInstruction: 'به سوال پاسخ دهید.',
      description: 'General question item.',
    }
  );
}

/**
 * Heuristically infers the most accurate QuestionType based on instructions and stem structure.
 */
export function inferQuestionTypeFromText(
  instructionText: string,
  stemText: string,
  hasOptions: boolean,
  hasWordBank: boolean,
): QuestionType {
  const combined = `${instructionText} ${stemText}`.toLowerCase();

  // 1. Multiple Choice / Cloze
  if (hasOptions) {
    if (/(?:cloze|passage|text|blank|گپ|کلوز)/i.test(instructionText)) {
      return 'cloze_item';
    }
    return 'multiple_choice';
  }

  // 2. Word Bank Fill
  if (hasWordBank || /(?:word bank|words given|words in the box|کلمات داده شده|جعبه کلمات|کلمات داخل کادر)/i.test(combined)) {
    return 'word_bank_fill';
  }

  // 3. Matching
  if (/(?:column a|column b|ستون الف|ستون ب|match the following|وصل کنید|تطبیق دهید)/i.test(combined)) {
    return 'matching';
  }

  // 4. True / False
  if (/(?:true|false|درست|نادرست|صحیح|غلط|\(t\/f\)|t or f|t\/f)/i.test(combined)) {
    return 'true_false';
  }

  // 5. Unscramble
  if (/(?:unscramble|reorder|put.*in.*order|کلمات.*به هم ریخته|مرتب کنید.*جمله)/i.test(combined)) {
    return 'unscramble';
  }

  // 6. Form in Parentheses
  if (/\([a-zA-Z\s]+\)/.test(stemText) && /(?:parentheses|bracket|شکل صحیح|داخل پرانتز|پرانتز)/i.test(combined)) {
    return 'form_in_parentheses';
  }

  // 7. Inline Choice
  if (/\[\s*[\w\s]+\s*\/\s*[\w\s]+\s*\]|\(\s*[\w\s]+\s*\/\s*[\w\s]+\s*\)/.test(stemText)) {
    return 'inline_choice';
  }

  // 8. Combine Sentences
  if (/(?:combine|conjunction|relative pronoun|ترکیب کنید|با استفاده از کلمه ربط)/i.test(combined)) {
    return 'combine_sentences';
  }

  // 9. Active / Passive
  if (/(?:passive|active|مجهول|معلوم)/i.test(combined)) {
    return 'active_passive';
  }

  // 10. Error Correction
  if (/(?:error|mistake|correct the.*error|اشتباه.*تصحیح|غلط.*پیدا)/i.test(combined)) {
    return 'error_correction';
  }

  // 11. Letter Reorder / Spelling
  if (/(?:spelling|letters|حروف درهم|املا|هجی)/i.test(combined)) {
    return 'letter_reorder';
  }

  // 12. Odd One Out
  if (/(?:odd one out|different word|ناهماهنگ|کلمه ناهماهنگ)/i.test(combined)) {
    return 'odd_one_out';
  }

  // 13. Pronunciation
  if (/(?:pronunciation|stress|syllable|تلفظ|استرس)/i.test(combined)) {
    return 'phonetic_pronunciation';
  }

  // 14. Dialogue
  if (/(?:dialogue|conversation|مکالمه|گفتگو)/i.test(combined)) {
    return 'dialogue_response';
  }

  // 15. Picture Description
  if (/(?:picture|look at the.*image|تصویر|عکس|با توجه به تصویر)/i.test(combined)) {
    return 'picture_description';
  }

  // 16. Translation
  if (/(?:translate|ترجمه کنید|ترجمه)/i.test(combined)) {
    return 'translation';
  }

  // 17. Fill Blank
  if (stemText.includes('...') || stemText.includes('___') || stemText.includes('----') || stemText.includes('(....)')) {
    return 'fill_blank';
  }

  // 18. Default Short Answer
  return 'short_answer';
}
