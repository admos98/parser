import React, { useState } from 'react';
import {
  FileText,
  Eye,
  Check,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
} from 'lucide-react';
import { ExamDocument, QuestionItem } from '../types/exam';

interface DocumentViewerProps {
  document: ExamDocument;
  onSelectQuestion: (question: QuestionItem) => void;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onSelectQuestion,
}) => {
  const maxPages = document.header.pageCount || 2;
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<'visual' | 'extracted_text'>('visual');

  // Clamp current page when document switches
  const safePage = Math.min(currentPage, maxPages);

  return (
    <div className="space-y-4">
      {/* Top Controls: Page switcher & view mode */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Page Navigation:</span>
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              disabled={safePage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: maxPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setCurrentPage(pageNum)}
                className={`px-2.5 py-1 text-xs font-semibold rounded ${
                  safePage === pageNum
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-300 hover:bg-slate-700'
                }`}
              >
                Page {pageNum}
              </button>
            ))}
            <button
              disabled={safePage === maxPages}
              onClick={() => setCurrentPage((p) => Math.min(maxPages, p + 1))}
              className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">View Style:</span>
          <div className="inline-flex rounded-lg bg-slate-800 p-1 border border-slate-700 text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium ${
                viewMode === 'visual'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Authentic Exam Sheet
            </button>
            <button
              onClick={() => setViewMode('extracted_text')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded font-medium ${
                viewMode === 'extracted_text'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              OCR / Docx Text Stream
            </button>
          </div>
        </div>
      </div>

      {/* Main Page Display */}
      {viewMode === 'visual' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-6 overflow-x-auto flex justify-center">
          <div className="bg-white text-slate-900 w-full max-w-4xl p-6 sm:p-8 rounded-lg shadow-2xl border border-slate-300 min-h-[950px] font-sans selection:bg-yellow-200 selection:text-black">
            {/* Header Box (Common to Page 1) */}
            {safePage === 1 && (
              <div className="grid grid-cols-3 border-2 border-slate-900 rounded-2xl p-4 mb-4 text-xs font-persian">
                {/* Left Header Box */}
                <div className="space-y-1 text-right border-l-2 border-slate-300 pl-2">
                  <div><span className="font-bold">نام درس:</span> {document.header.courseName}</div>
                  <div><span className="font-bold">نام دبیر:</span> ....................</div>
                  <div><span className="font-bold">تاریخ آزمون:</span> {document.header.examDate}</div>
                  <div><span className="font-bold">مدت آزمون:</span> {document.header.durationMinutes} دقیقه</div>
                </div>

                {/* Center Header Box */}
                <div className="text-center space-y-1 px-2">
                  <div className="font-bold text-sm">جمهوری اسلامی ایران</div>
                  <div>اداره کل آموزش و پرورش شهر بوشهر</div>
                  <div>اداره آموزش و پرورش خارگ</div>
                  <div className="font-bold">{document.header.schoolName}</div>
                </div>

                {/* Right Header Box */}
                <div className="space-y-1 text-right border-r-2 border-slate-300 pr-2">
                  <div><span className="font-bold">نام:</span> ....................</div>
                  <div><span className="font-bold">نام خانوادگی:</span> ....................</div>
                  <div><span className="font-bold">مقطع و رشته:</span> {document.header.gradeAndMajor}</div>
                  <div><span className="font-bold">تعداد صفحه سوال:</span> {maxPages}</div>
                </div>
              </div>
            )}

            {/* Standard Exam Table Structure */}
            <div className="border-2 border-slate-900 text-xs sm:text-sm">
              {/* Table Column Headers */}
              <div className="grid grid-cols-[50px_1fr_60px] border-b-2 border-slate-900 bg-slate-100 font-bold text-center py-1.5">
                <div>row</div>
                <div>Questions & Sections</div>
                <div>mark</div>
              </div>

              {/* Page Specific Contents */}
              {document.id === 'motahari-grade9-exam' ? (
                <>
                  {safePage === 1 && renderMotahariPage1(document, onSelectQuestion)}
                  {safePage === 2 && renderMotahariPage2(document, onSelectQuestion)}
                </>
              ) : (
                <>
                  {safePage === 1 && renderPage1(document, onSelectQuestion)}
                  {safePage === 2 && renderPage2(document, onSelectQuestion)}
                  {safePage === 3 && renderPage3(document, onSelectQuestion)}
                  {safePage === 4 && renderPage4(document, onSelectQuestion)}
                  {safePage === 5 && renderPage5(document, onSelectQuestion)}
                </>
              )}
            </div>

            <div className="mt-4 text-center text-xs text-slate-500 font-medium">
              Page {safePage} of {maxPages} • {document.header.schoolName} Examination
            </div>
          </div>
        </div>
      ) : (
        /* Text Stream View */
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 font-code text-xs text-slate-300 overflow-x-auto">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <span className="font-semibold text-indigo-400">Raw Structure Stream (Page {currentPage})</span>
            <span className="text-slate-500">LibreOffice XML AST Extraction</span>
          </div>
          <pre className="whitespace-pre-wrap leading-relaxed">
            {getPageTextDump(currentPage, document)}
          </pre>
        </div>
      )}
    </div>
  );
};

// =================== PAGE RENDERING HELPERS ===================

function renderPage1(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  return (
    <>
      {/* Category Banner */}
      <div className="bg-amber-400 text-slate-900 font-bold text-center py-1 border-b border-slate-900 uppercase tracking-wider text-sm shadow-inner">
        listening
      </div>

      {/* Row A: Audio 1 */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">A</div>
        <div className="p-3 space-y-3">
          <div className="text-center font-bold text-sm">Audio 1</div>
          <div className="font-persian text-right text-xs text-slate-700">
            به فایل صوتی گوش دهید و دور یکی از چهار گزینه زیر خط بکشید .
          </div>
          <div className="text-center italic text-xs text-slate-600 font-medium">
            ( Amin & Behzad are talking together )
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[0].questions[0])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
          >
            <div className="font-medium">1."Why is Amin busy these days?</div>
            <div className="ml-3 font-medium">" Because he is ………….. ."</div>
            <div className="grid grid-cols-2 gap-2 mt-1 ml-3 text-xs">
              <div>a. working on a new project</div>
              <div>b. very tired</div>
            </div>
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[0].questions[1])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
          >
            <div className="font-medium">2.What is the most important thing to Behzad?</div>
            <div className="grid grid-cols-4 gap-2 mt-1 ml-3 text-xs">
              <div>a. money</div>
              <div>b. work</div>
              <div>c. responsibility</div>
              <div>d. health</div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>

      {/* Row B: Audio 2 */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">B</div>
        <div className="p-3 space-y-3">
          <div className="text-center font-bold text-sm">Audio 2</div>
          <div className="font-persian text-right text-xs text-slate-700">
            به فایل صوتی گوش دهید و گزینه درست را علامت بزنید .
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[1].questions[0])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
          >
            <div className="font-medium">3.When are they going to the gym?</div>
            <div className="text-slate-400 mt-1">……………………………………………………………………..</div>
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[1].questions[1])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
          >
            <div className="font-medium">4. What does Mina prefer?</div>
            <div className="text-slate-400 mt-1">……………………………………………………………………..</div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">4</div>
      </div>

      {/* Row C: Audio 3 */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">C</div>
        <div className="p-3 space-y-3">
          <div className="text-center font-bold text-sm">Audio 3</div>
          <div className="font-medium text-xs">Listen to the file about parenting and answer the questions.</div>
          <div className="font-persian text-right text-xs text-slate-700">
            به فایل صوتی گوش دهید و گزینه درست را علامت بزنید .
          </div>
          <div className="text-center italic text-xs font-semibold text-slate-800">
            ( Importance of Parenting in a Child's Life )
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[2].questions[0])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
          >
            <div className="font-medium">5.What does parenting mean? It means . . . . . . . . children.</div>
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[2].questions[1])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200"
          >
            <div className="font-medium">6. Parents should be sure that their children are . . . . . . . and enjoy life.</div>
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[2].questions[2])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 flex justify-between items-center"
          >
            <span className="font-medium">7. Every child should grow up in a loving home.</span>
            <span className="font-semibold text-xs">True ⎕ &nbsp; False ⎕</span>
          </div>

          <div
            onClick={() => onSelectQuestion(doc.sections[2].questions[3])}
            className="cursor-pointer p-2 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 flex justify-between items-center"
          >
            <span className="font-medium">8. Parents shouldn't provide a good education for their children.</span>
            <span className="font-semibold text-xs">True ⎕ &nbsp; False ⎕</span>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">3</div>
      </div>
    </>
  );
}

function renderPage2(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  return (
    <>
      <div className="bg-amber-400 text-slate-900 font-bold text-center py-1 border-b border-slate-900 uppercase tracking-wider text-sm">
        vocabulary
      </div>

      {/* Row D: Word Bank */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">D</div>
        <div className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-xs">
            <span className="font-bold">Fill in the blanks with the words given. (there is one extra word).</span>
            <span className="font-persian text-slate-700">جاهای خالی را با کلمات داده شده پر کنید. یک کلمه اضافی است .</span>
          </div>

          {/* Word Bank Table 2x5 */}
          <div className="border-2 border-slate-800 text-center text-xs font-semibold my-2">
            <div className="grid grid-cols-5 border-b border-slate-800 bg-slate-50 py-1.5">
              <div>figure</div>
              <div>effectively</div>
              <div>appreciate</div>
              <div>founded</div>
              <div>compiled</div>
            </div>
            <div className="grid grid-cols-5 py-1.5 bg-slate-50">
              <div>bilingual</div>
              <div>suppose</div>
              <div>appropriate</div>
              <div>shares</div>
              <div>distinguished</div>
            </div>
          </div>

          {/* Questions 9 to 16 */}
          <div className="space-y-2 mt-2">
            {[9, 10, 11, 12, 13, 14, 15, 16].map((num) => {
              const q = doc.sections[3].questions.find((item) => item.number === num);
              if (!q) return null;
              return (
                <div
                  key={num}
                  onClick={() => onSelectQuestion(q)}
                  className="cursor-pointer p-1.5 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition text-xs font-medium"
                >
                  {q.number}. {q.stem}
                </div>
              );
            })}
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">2</div>
      </div>

      {/* Row E: Matching Table A & B */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">E</div>
        <div className="p-3 space-y-2">
          <div className="text-xs font-bold leading-snug">
            Match the words in column(A)with the appropriate definitions in column(B). There are two extra definitions in column(B)
          </div>
          <div className="font-persian text-right text-xs text-slate-700">
            با توجه به ستون دوم، ستون اول را کامل کنید.
          </div>

          {/* Table A & B */}
          <div className="border border-slate-800 text-xs mt-2">
            <div className="grid grid-cols-2 bg-slate-100 font-bold text-center border-b border-slate-800 py-1">
              <div>A</div>
              <div>B</div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-800">
              <div className="p-2 space-y-3 font-medium">
                <div>17. combination …………</div>
                <div>18. arrange …………</div>
                <div>19. abbreviation ………….</div>
                <div>20. calmly ………….</div>
              </div>
              <div className="p-2 space-y-1.5 text-xs">
                <div>a. a short form of a word or expression</div>
                <div>b. in a quiet way</div>
                <div>c. an arrangement in a particular order</div>
                <div>d. in a way that is successful</div>
                <div>e. to cry suddenly</div>
                <div>f. to put things in a neat, attractive, or useful order</div>
              </div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">2</div>
      </div>

      {/* Row F: MCQ */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">F</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="font-bold">Choose the best option. (0/5pt)</div>
          <div className="space-y-2">
            <div>
              <div className="font-medium">21. It is no use trying to give technical teaching to our employees without ……….. education.</div>
              <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
                <div>a. hard working</div>
                <div>b. elementary</div>
                <div>c. wonderful</div>
                <div>d. destructive</div>
              </div>
            </div>
            <div>
              <div className="font-medium">22. I've heard that song was played ……………… times on the radio.</div>
              <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
                <div>a. advanced</div>
                <div>b. symbolic</div>
                <div>c. countless</div>
                <div>d. donate</div>
              </div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>

      {/* Row G: Fill blanks */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">G</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">Fill in the blanks</span>
            <span className="font-persian text-slate-700">جاهای خالی را کامل کنید.</span>
          </div>
          <div className="font-medium">23. When Mary heard about her grandmother's death, she …………… into tears.</div>
          <div className="font-medium">24. A: What does "I. R" ……..…for? B: Islamic Republic.</div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>
    </>
  );
}

function renderPage3(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  return (
    <>
      <div className="bg-amber-400 text-slate-900 font-bold text-center py-1 border-b border-slate-900 uppercase tracking-wider text-sm">
        grammar
      </div>

      {/* Row H: Grammar MCQ */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">H</div>
        <div className="p-3 space-y-3 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">Choose the correct answer.</span>
            <span className="font-persian text-slate-700">گزینه مناسب را انتخاب کنید.</span>
          </div>

          <div>
            <div className="font-medium">25. The television ……………… they have designed is going to be very expensive.</div>
            <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
              <div>a. which</div>
              <div>b. that it</div>
              <div>c. whom</div>
              <div>d. that is</div>
            </div>
          </div>

          <div>
            <div className="font-medium">26. What would you do if she ………………. you to borrow her your car?</div>
            <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
              <div>a. asks</div>
              <div>b. might ask</div>
              <div>c. asked</div>
              <div>d. has asked</div>
            </div>
          </div>

          <div>
            <div className="font-medium">27. 18. The heavens and the earth and also the variation of the languages and the color of people ……… by God.</div>
            <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
              <div>a. created</div>
              <div>b. have created</div>
              <div>c. were created</div>
              <div>d. was created</div>
            </div>
          </div>

          <div>
            <div className="font-medium">28. Persian ---------------- in Iran, Tajikistan and Afghanistan.</div>
            <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
              <div>a. speaks</div>
              <div>b. will speak</div>
              <div>c. are spoken</div>
              <div>d. is spoken</div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>

      {/* Row I: Parentheses */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">I</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">Write the correct form of the words in the parentheses.</span>
            <span className="font-persian text-slate-700">شکل صحیح کلمات داخل پرانتز را بنویسید.</span>
          </div>
          <div className="space-y-1.5 font-medium">
            <div>29. The window …………………. yesterday by children. (break)</div>
            <div>30. If it got warmer, They .................... to the north. (travel)</div>
            <div>31. English __________________ all around the world. (speak)</div>
            <div>32. What would you do if you-------------------- 100 dollars? (have)</div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>

      {/* Row J: Combine sentences */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">J</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="font-bold">combine the following sentences. (who – which – whom)</div>
          <div>
            <div className="font-medium">33.The driver had an accident. He is very skillful.</div>
            <div className="text-slate-400">…………………………………………………….</div>
          </div>
          <div>
            <div className="font-medium">34. I found my book. I lost it yesterday.</div>
            <div className="text-slate-400">…………………………………………………….</div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">.5</div>
      </div>

      {/* Row K: Active Passive */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">K</div>
        <div className="p-3 space-y-1 text-xs">
          <div className="font-bold">Make active and passive sentences.</div>
          <div className="font-medium italic">find/ scientists / to problems /solutions.</div>
          <div>active:35 ………………………………………………………….</div>
          <div>passive:36 …………………………………………………………</div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">.5</div>
      </div>

      {/* Row L: Unscramble */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">L</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">Unscramble the following sentences</span>
            <span className="font-persian text-slate-700">جملات درهم ریخته را مرتب کنید.</span>
          </div>
          <div>
            <div className="font-medium">37. Reza / the class / attend / in hospital / he / cannot / so / is.</div>
            <div className="text-slate-400">…………………………………………………………………………..</div>
          </div>
          <div>
            <div className="font-medium">38. by the police/ last week/ the robber/ was found</div>
            <div className="text-slate-400">…………………………………………………………………………..</div>
          </div>
          <div>
            <div className="font-medium">39. you / ever / Madrid / have / to / been / ?</div>
            <div className="text-slate-400">………………………………………………………………………………</div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">3</div>
      </div>
    </>
  );
}

function renderPage4(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  return (
    <>
      <div className="bg-amber-400 text-slate-900 font-bold text-center py-1 border-b border-slate-900 uppercase tracking-wider text-sm">
        writing
      </div>

      {/* Row M: Find 4 mistakes */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">M</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="font-bold">Find four grammatical mistakes in the following passage and correct them.</div>
          <div className="p-2 bg-slate-50 border border-slate-300 rounded leading-relaxed text-slate-800">
            Hafez are regarded as one of the greatest Persian poets of all time. He was born in Shiraz about seven
            centuries ago. He was given religious education when he was a child. You know why
            he called Hafez, doesn’t you? He is called Hafez because he was learned Holy Quran by heart.
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1 font-medium">
            <div>40……………………</div>
            <div>41…………........…</div>
            <div>42……………….……</div>
            <div>43………………</div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">2</div>
      </div>

      {/* Row N: Put letters in order */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">N</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="font-bold">According to the sentence meaning, put the letters in parenthesis in correct order</div>
          <div className="space-y-1.5 font-medium">
            <div>31. Did Alexander Flemming 44…………….. ( corevdis ) penicillin?</div>
            <div>32. A good dictionary gives the user information about words such as spelling, pronunciation and 45……………… (finidetion).</div>
            <div>33. Hafez is known to be the inspiration for many poets and 46…….……( thausor ) around the world.</div>
            <div>34. 58. The teacher became angry with the noisy student and finally 47 …………….. (heutdos)</div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>

      {/* Row O: Choose best answer */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">O</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="font-bold">Choose the best answer.</div>
          <div>
            <div className="font-medium">48.I get up early in the morning, ……….. I make an omelet myself.</div>
            <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
              <div>a. and</div>
              <div>b.but</div>
              <div>c. yet</div>
              <div>d.so</div>
            </div>
          </div>
          <div>
            <div className="font-medium">49.Behnam’s family went to the zoo last week,………….they didn’t enjoy it.</div>
            <div className="grid grid-cols-4 gap-1 mt-1 ml-2">
              <div>a. but</div>
              <div>b.so</div>
              <div>c.and</div>
              <div>d.yet</div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">1</div>
      </div>

      <div className="bg-amber-400 text-slate-900 font-bold text-center py-1 border-b border-slate-900 uppercase tracking-wider text-sm">
        reading
      </div>

      {/* Row P: Cloze Test */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">P</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">Cloze Tests – Read the following text and fill in the blanks with the words.</span>
            <span className="font-persian text-slate-700">متن زیر را بخوانید و جاهای خالی را کامل کنید.</span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded leading-relaxed text-slate-800 font-medium">
            Zakaria al-Razi is <span className="font-bold bg-amber-200 px-1 rounded">31) -----</span> as the most famous Iranian <span className="font-bold bg-amber-200 px-1 rounded">32) -----</span>. He was <span className="font-bold bg-amber-200 px-1 rounded">33) -----</span> in 854 AD. When he was a young man, he was interested in chemistry. Because of doing many experiments, he <span className="font-bold bg-amber-200 px-1 rounded">34) -----</span> his eyes. So, he left chemistry and started studying medicine. He wrote many books about <span className="font-bold bg-amber-200 px-1 rounded">35) -----</span>. In addition to writing books, two important medical centers were <span className="font-bold bg-amber-200 px-1 rounded">36) -----</span> by him in Ray and Baghdad.
          </div>

          <div className="space-y-1.5 pt-1 text-xs">
            <div className="grid grid-cols-4 gap-2">
              <div>50.a. dedicated</div>
              <div>b. distinguished</div>
              <div>c. regarded</div>
              <div>d. introduced</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>51.a. teacher</div>
              <div>b. engineer</div>
              <div>c. physician</div>
              <div>d. inventor</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>52.a. build</div>
              <div>b. born</div>
              <div>c. lived</div>
              <div>d. known</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>53.a. hurt</div>
              <div>b. is hurt</div>
              <div>c. was hurt</div>
              <div>d. has been hurt</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>54.a. diseases</div>
              <div>b. planets</div>
              <div>c. scientists</div>
              <div>d. inventions</div>
            </div>
            <div className="grid grid-cols-4 gap-2">
              <div>55.a. educated</div>
              <div>b. planed</div>
              <div>c. included</div>
              <div>d. founded</div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">3</div>
      </div>
    </>
  );
}

function renderPage5(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  return (
    <>
      {/* Row Q: Reading Comprehension */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">Q</div>
        <div className="p-3 space-y-3 text-xs">
          <div className="font-bold text-sm">Reading comprehension</div>

          {/* Passage I */}
          <div className="border border-slate-300 rounded p-2.5 bg-slate-50 space-y-2">
            <div className="font-bold">Passage I</div>
            <div className="text-slate-800 leading-relaxed text-xs">
              Nutrition is the process by which plants and animals take in and use food. Food is needed to keep the body
              running smoothly. It provides energy for work and play, for breathing, and for the beating of the heart. The building
              material for muscles, bones, and blood comes from food. You can't have a healthy body without healthy eating and
              drinking. Not enough of some foods, or too much of others, can lead to illness.
              <br /><br />
              The food and drink you take in are called your diet. (This word is sometimes used in another way, to mean eating
              less food than normal in order to lose weight, as in "going on a diet")
              <br /><br />
              A person's diet is so important because growth and health depend on it. Dietician are people with knowledge of special
              diets(dietetics), such as those used for sick people in hospital.
              <br /><br />
              We should never forget that across the world between 13 and 18million people die each year from starvation and
              the diseases it brings; most of them are babies and young children. For the millions more who suffer from lack of
              food (not enough of the right foods), healthy eating is out of the question. It is hard enough just to try and stay alive.
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div>
                <div className="font-medium">56.How can we have a healthy body?</div>
                <div className="text-slate-400">..................................................................................</div>
              </div>
              <div>
                <div className="font-medium">57. write a good topic for the passage.</div>
                <div className="text-slate-400">…………………………………………………….</div>
              </div>
              <div>
                <div className="font-medium">58. On the whole, the writer believes that by eating less food we can………….</div>
                <div className="grid grid-cols-4 gap-1 mt-0.5 ml-2">
                  <div>a. grow our health</div>
                  <div>b. lose weight</div>
                  <div>c. gain weight</div>
                  <div>d. decrease our health</div>
                </div>
              </div>
              <div>
                <div className="font-medium">59. What dose 'it' in line 2refer to?</div>
                <div className="grid grid-cols-4 gap-1 mt-0.5 ml-2">
                  <div>a. food</div>
                  <div>b. body</div>
                  <div>c. process</div>
                  <div>d. nutrition</div>
                </div>
              </div>
              <div>
                <div className="font-medium">60. The word " special" in line can be replaced by?</div>
                <div className="grid grid-cols-4 gap-1 mt-0.5 ml-2">
                  <div>a. perfect</div>
                  <div>b. patient</div>
                  <div>c. particular</div>
                  <div>d. protected</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">61. The word "diet" has two meanings, what we eat and eating less food than normal.</span>
                <span className="font-bold">True ⎕ &nbsp; False ⎕</span>
              </div>
            </div>
          </div>

          {/* Passage II */}
          <div className="border border-slate-300 rounded p-2.5 bg-slate-50 space-y-2 mt-4">
            <div className="font-bold">Passage II</div>
            <div className="font-bold italic">How to use a dictionary</div>
            <div className="text-slate-800 leading-relaxed text-xs">
              A dictionary is a very important tool for anyone who is learning a new language. With a good one you can do the
              following; you can look up the meaning of an English word you see or hear; to find a word quickly, you need to know
              the English alphabet perfectly. For words with more than one meaning you should choose one makes more sense in
              the context; checking the spelling and pronunciation are others facilities that a dictionary offers. Also, to check the
              plural of a noun, part of speech, or past tense of a verb, a dictionary is helpful. Likewise, a dictionary provides readers
              with synonym or antonym, collocations, and grammatical information about a word too. In sum, learning a new
              language is fun by the use of a dictionary.
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="font-medium">62.What is a dictionary?</div>
              <div className="font-medium">63.What can we check in a dictionary?</div>
              <div>
                <div className="font-medium">64."one" in line "1" refers to….. .</div>
                <div className="grid grid-cols-4 gap-1 mt-0.5 ml-2">
                  <div>a) language</div>
                  <div>b) tool</div>
                  <div>c) meaning</div>
                  <div>d) dictionary</div>
                </div>
              </div>
              <div>
                <div className="font-medium">65) which one is closest meaning to " look up " in line "2"?</div>
                <div className="grid grid-cols-4 gap-1 mt-0.5 ml-2">
                  <div>a) listen</div>
                  <div>b) search for</div>
                  <div>c) write</div>
                  <div>d) figure out</div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">66.Dictionary offers only one meaning for a word.</span>
                <span className="font-bold">True ⎕ &nbsp; False ⎕</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">67.An important tool for learning a language is a dictionary.</span>
                <span className="font-bold">True ⎕ &nbsp; False ⎕</span>
              </div>
            </div>
          </div>

          <div className="text-center font-bold text-sm tracking-widest text-slate-800 pt-2">
            Goodluck
          </div>
        </div>

        {/* Mark Breakdown for Q */}
        <div className="font-bold text-center py-4 border-l border-slate-900 text-xs flex flex-col justify-between">
          <div>1</div>
          <div>.75</div>
          <div>.25</div>
          <div>2</div>
          <div>.5</div>
          <div>.5</div>
        </div>
      </div>
    </>
  );
}

function renderMotahariPage1(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  const secA = doc.sections.find((s) => s.rowId === 'A');
  const secB = doc.sections.find((s) => s.rowId === 'B');
  const secC = doc.sections.find((s) => s.rowId === 'C');
  const secD = doc.sections.find((s) => s.rowId === 'D');

  return (
    <>
      {/* Row A: MCQ */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">A</div>
        <div className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-xs font-semibold">
            <span>Read the sentences and choose the best answer.</span>
            <span className="font-persian text-slate-700">جملات زیر را بخوانید و بهترین پاسخ را انتخاب کنید.</span>
          </div>

          <div className="space-y-2.5 text-xs">
            {secA?.questions.map((q) => (
              <div
                key={q.id}
                onClick={() => onSelectQuestion(q)}
                className="cursor-pointer p-1.5 rounded hover:bg-indigo-50 border border-transparent hover:border-indigo-200 transition"
              >
                <div className="font-medium whitespace-pre-line">{q.number}- {q.stem}</div>
                {q.options && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1 ml-3 font-mono">
                    {q.options.map((opt) => (
                      <div key={opt.id}>
                        {opt.id}. {opt.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secA?.markTotal || 1}</div>
      </div>

      {/* Row B: Circle correct words */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">B</div>
        <div className="p-3 space-y-2">
          <div className="flex flex-col sm:flex-row justify-between text-xs font-semibold">
            <span>Read the text below and circle the correct words to complete it.</span>
            <span className="font-persian text-slate-700">متن زیر را بخوانید و دور کلمه صحیح خط بکشید.</span>
          </div>
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded leading-relaxed text-xs font-medium text-slate-800">
            David is British, but he <span className="font-bold text-indigo-700 bg-indigo-50 px-1 border border-indigo-200 rounded">(don’t – doesn’t)</span> live in England. He and his friend <span className="font-bold text-indigo-700 bg-indigo-50 px-1 border border-indigo-200 rounded">(play – plays)</span> football. They like football very much. Now they are at the stadium. There <span className="font-bold text-indigo-700 bg-indigo-50 px-1 border border-indigo-200 rounded">(is – are)</span> many people there. The player <span className="font-bold text-indigo-700 bg-indigo-50 px-1 border border-indigo-200 rounded">(‘s – s’)</span> clothes are green.
          </div>
          <div className="text-[11px] text-slate-500 italic">
            * 4 inline bracket choice items detected in AST
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secB?.markTotal || 1}</div>
      </div>

      {/* Row C: Bahador's New Year Word Bank */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">C</div>
        <div className="p-3 space-y-2.5">
          <div className="text-xs font-semibold leading-tight">
            Bahador writes about new year in his country. Read it and complete the sentences with the words in the boxes.
          </div>
          <div className="font-persian text-right text-xs text-slate-700">
            با انتخاب کلمات مناسب از کادر یادداشت بهادر در مورد سال جدید را کامل کنید.
          </div>

          {/* Word Box */}
          <div className="border border-slate-800 rounded p-1.5 bg-slate-100 flex flex-wrap gap-2 text-xs font-semibold justify-center">
            {secC?.wordBank?.map((w) => (
              <span key={w} className="px-2 py-0.5 bg-white border border-slate-300 rounded shadow-xs">
                {w}
              </span>
            ))}
          </div>

          {/* Passage with 8 blanks */}
          <div className="p-2.5 bg-slate-50 border border-slate-300 rounded leading-relaxed text-xs text-slate-800">
            In Iran, people <span className="font-bold text-amber-700 underline decoration-dotted">……………..</span> the first day of spring. It’s our new year. The celebration <span className="font-bold text-amber-700 underline decoration-dotted">………………</span> for two weeks. Before new year people clean the houses and buy new clothes. Children <span className="font-bold text-amber-700 underline decoration-dotted">…………….</span> The eggs and set the haft seen table. Some people are very <span className="font-bold text-amber-700 underline decoration-dotted">…………………</span> . They give some money to the poor people. At the <span className="font-bold text-amber-700 underline decoration-dotted">………………</span> the year, they sit around the table and father <span className="font-bold text-amber-700 underline decoration-dotted">………………..</span> the holy Quran. people <span className="font-bold text-amber-700 underline decoration-dotted">………………..</span> on <span className="font-bold text-amber-700 underline decoration-dotted">……………….</span> Day on the 13th of Farvardin.
          </div>
          <div className="text-[11px] text-slate-500 italic">
            * 8 blanks linked to 10-word candidate pool (2 distractors: "clear", "National")
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secC?.markTotal || 2}</div>
      </div>

      {/* Row D: Picture Questions */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">D</div>
        <div className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-xs font-semibold">
            <span>Look at the pictures and answer the teacher’s questions.</span>
            <span className="font-persian text-slate-700">به سوالات معلم با توجه به تصاویر پاسخ دهید.</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Picture 1</span>
                <span className="text-slate-500 text-[11px]">[Mother packing luggage]</span>
              </div>
              <div className="font-medium pt-1">Teacher: Is your mother packing for the trip?</div>
              <div className="text-slate-400">Student: ………………………………………………………………….. .</div>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Picture 2</span>
                <span className="text-slate-500 text-[11px]">[Waiter setting table]</span>
              </div>
              <div className="font-medium pt-1">Teacher: Does the waiter set the table?</div>
              <div className="text-slate-400">Student: ………………………………………………………………….. .</div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secD?.markTotal || 1}</div>
      </div>
    </>
  );
}

function renderMotahariPage2(doc: ExamDocument, onSelectQuestion: (q: QuestionItem) => void) {
  const secE = doc.sections.find((s) => s.rowId === 'E');
  const secF = doc.sections.find((s) => s.rowId === 'F');
  const secG = doc.sections.find((s) => s.rowId === 'G');
  const secH = doc.sections.find((s) => s.rowId === 'H');
  const secI = doc.sections.find((s) => s.rowId === 'I');

  return (
    <>
      {/* Row E: Pictures & Dialogue */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">E</div>
        <div className="p-3 space-y-3">
          <div className="flex flex-col sm:flex-row justify-between text-xs font-semibold">
            <span>Look at the pictures and complete the conversation.</span>
            <span className="font-persian text-slate-700">با توجه به تصاویر گفتگو را کامل کنید.</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Image 1: [Man running / energetic]</span>
              <div className="mt-1">
                <div className="font-medium">Secretary: Hi, are you a lazy person?</div>
                <div className="text-slate-500">Sam: ……………………………………………………………… .</div>
              </div>
            </div>

            <div className="p-2 rounded bg-slate-50 border border-slate-200">
              <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-bold text-[10px]">Image 2: [Anniversary night fireworks]</span>
              <div className="mt-1">
                <div className="font-medium">Secretary: What do you usually do at Islamic revolution anniversary night?</div>
                <div className="text-slate-500">Sam: ………….. usually …………………………………………… .</div>
              </div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secE?.markTotal || 1}</div>
      </div>

      {/* Row F: Unscramble */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">F</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row justify-between font-semibold">
            <span>Unscramble the words to make a sentence.</span>
            <span className="font-persian text-slate-700">کلمات را مرتب کنید و جمله بسازید.</span>
          </div>
          <div className="font-medium bg-slate-50 p-2 border border-slate-200 rounded">
            My – the – door – closes – uncle – the shop – of – in – evening – the .
          </div>
          <div className="text-slate-400">…………………………………………………………………………………………………………………….. .</div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secF?.markTotal || 1}</div>
      </div>

      {/* Row G: Mrs. Marta 4 mistakes */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">G</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="font-semibold">
            This text is about Mrs. Marta. but it has four mistakes. Find them and write the correct form.
          </div>
          <div className="font-persian text-right text-slate-700">
            در متن زیر اشتباهات را پیدا کرده و به همراه شکل صحیح آنها در جدول یادداشت کنید.
          </div>

          <div className="p-2 bg-slate-50 border border-slate-200 rounded leading-relaxed text-slate-800">
            Mrs. Marta is from China. There are a lot of cities in his country. People takes an express train to go to work. People is very busy and serious. Mrs. Marta teach in I.L.T. in Tehran now.
          </div>

          {/* Mistakes Table */}
          <div className="border border-slate-800 mt-2 text-xs">
            <div className="grid grid-cols-2 bg-slate-100 font-bold border-b border-slate-800 text-center py-1">
              <div>Mistakes</div>
              <div>Correct form</div>
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-800 text-slate-600 p-2 text-center">
              <div className="space-y-1">
                <div>1. his</div>
                <div>2. takes</div>
                <div>3. is</div>
                <div>4. teach</div>
              </div>
              <div className="space-y-1 font-semibold text-emerald-700">
                <div>1. her</div>
                <div>2. take</div>
                <div>3. are</div>
                <div>4. teaches</div>
              </div>
            </div>
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">{secG?.markTotal || 1}</div>
      </div>

      {/* Row H: Missing letters in words */}
      <div className="grid grid-cols-[50px_1fr_60px] border-b border-slate-900">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">H</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row justify-between font-semibold">
            <span>Fill in the blanks in the words.</span>
            <span className="font-persian text-slate-700">جاهای خالی را در لغات داخل پرانتز کامل کنید.</span>
          </div>
          <div className="font-medium bg-slate-50 p-2 border border-slate-200 rounded">
            We <span className="font-bold text-indigo-700">(c__m__emorate)</span> NE martyrs every year. He isn’t a <span className="font-bold text-indigo-700">(nervo__s)</span> person.
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900">.5</div>
      </div>

      {/* Row I: Reading Comprehension */}
      <div className="grid grid-cols-[50px_1fr_60px]">
        <div className="font-bold text-center py-4 border-r border-slate-900 text-base">I</div>
        <div className="p-3 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row justify-between font-semibold">
            <span>Read the passage and answer the questions.</span>
            <span className="font-persian text-slate-700">متن زیر را بخوانید و به سوالات پاسخ دهید.</span>
          </div>

          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded leading-relaxed text-slate-800 font-medium">
            Hello I’m Safa. I live in Tabriz. My grandfather has a beautiful garden. There are a lot of fruit trees and flowers there. My family and all my uncles, aunts and cousins go there on the 13th of Farvardin every year. My cousins and I play different games. We stay there from morning to evening.
          </div>

          <div className="pt-1 space-y-2">
            <div className="font-persian text-right text-slate-600 font-medium">
              جملات درست را با T و جملات اشتباه را با F نشان دهید.
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
              <span>1. My uncle makes rice and salad</span>
              <span className="font-bold font-mono">T [ ]  F [✓]</span>
            </div>
            <div className="flex justify-between items-center bg-slate-50 p-1.5 rounded">
              <span>2. Safa and her cousins play different games.</span>
              <span className="font-bold font-mono">T [✓]  F [ ]</span>
            </div>

            <div className="font-persian text-right text-slate-600 font-medium pt-1">
              به سوالات پاسخ کامل دهید.
            </div>
            <div>
              <div className="font-medium">3. What are there in her grandfather’s farm?</div>
              <div className="text-slate-400">…………………………………………………………………………………………………………….</div>
            </div>
            <div>
              <div className="font-medium">4. How long do they stay there?</div>
              <div className="text-slate-400">……………………………………………………………………………………</div>
            </div>
          </div>

          <div className="text-center font-bold text-xs tracking-widest text-slate-700 pt-2">
            Goodluck
          </div>
        </div>
        <div className="font-bold text-center py-4 border-l border-slate-900 text-xs flex flex-col justify-between">
          <div>.5</div>
          <div>1</div>
        </div>
      </div>
    </>
  );
}

function getPageTextDump(page: number, doc: ExamDocument): string {
  switch (page) {
    case 1:
      return `[PAGE 1: LISTENING - ROWS A, B, C]
[TABLE CELL A]: Audio 1
(Amin & Behzad are talking together)
1. "Why is Amin busy these days? / Because he is ..." (MCQ: a, b) [mark: 0.5]
2. "What is the most important thing to Behzad?" (MCQ: a, b, c, d) [mark: 0.5]
[TABLE CELL B]: Audio 2
3. "When are they going to the gym?" [mark: 2.0]
4. "What does Mina prefer?" [mark: 2.0]
[TABLE CELL C]: Audio 3
(Importance of Parenting in a Child's Life)
5. "What does parenting mean? It means ..." [mark: 0.75]
6. "Parents should be sure that their children are ..." [mark: 0.75]
7. "Every child should grow up in a loving home." (True/False) [mark: 0.75]
8. "Parents shouldn't provide a good education..." (True/False) [mark: 0.75]`;
    case 2:
      return `[PAGE 2: VOCABULARY - ROWS D, E, F, G]
[TABLE CELL D]: Word Bank (10 words)
Words: figure, effectively, appreciate, founded, compiled, bilingual, suppose, appropriate, shares, distinguished
Questions: 9, 10, 11, 12, 13, 14, 15, 16 [marks: 2.0 total, 0.25 each]
[TABLE CELL E]: Column Matching A vs B
Left: 17. combination, 18. arrange, 19. abbreviation, 20. calmly
Right: a to f definitions (2 distractors) [marks: 2.0 total]
[TABLE CELL F]: Multiple Choice
21. technical teaching without elementary education
22. song was played countless times [marks: 1.0 total]
[TABLE CELL G]: Fill in blanks
23. burst into tears
24. stand for Islamic Republic [marks: 1.0 total]`;
    case 3:
      return `[PAGE 3: GRAMMAR - ROWS H, I, J, K, L]
[TABLE CELL H]: Multiple Choice 25-28
25. which
26. asked
27. were created (Artifact "18." stripped)
28. is spoken [mark: 1.0]
[TABLE CELL I]: Verb forms in parentheses 29-32
29. (break) -> was broken
30. (travel) -> would travel
31. (speak) -> is spoken
32. (have) -> had [mark: 1.0]
[TABLE CELL J]: Combine sentences (who/which/whom) 33-34 [mark: 0.5]
[TABLE CELL K]: Active/Passive formation 35-36 [mark: 0.5]
[TABLE CELL L]: Sentence Unscramble 37-39 [mark: 3.0]`;
    case 4:
      return `[PAGE 4: WRITING & READING - ROWS M, N, O, P]
[TABLE CELL M]: Grammatical Mistakes in Hafez Passage (40-43) [mark: 2.0]
[TABLE CELL N]: Scrambled letters 44-47 (Normalized from 31/44, 32/45, 33/46, 34/58/47) [mark: 1.0]
[TABLE CELL O]: Conjunctions MCQ 48-49 [mark: 1.0]
[TABLE CELL P]: Cloze Test - Zakaria al-Razi
Passage Blanks [31-36] mapped to Items 50-55 [mark: 3.0]`;
    case 5:
      return `[PAGE 5: READING COMPREHENSION - ROW Q]
[TABLE CELL Q]: Reading Comprehension (5 pts total)
Passage I: Nutrition (Diet, starvation, sickness)
- Questions 56-57: Open short answer
- Questions 58-60: MCQ (lose weight, 'it' ref, special -> particular)
- Question 61: True/False
Passage II: How to use a dictionary
- Questions 62-63: Open short answer
- Questions 64-65: MCQ ('one' ref, 'look up' meaning)
- Questions 66-67: True/False`;
    default:
      return '';
  }
}
