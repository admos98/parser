import { parseExamRawText } from './parserEngine';

const TEST_1_OCR = `English Quiz - Grade 7
A) Choose the correct answer. (2 marks)
l.Acatisan.........
a)animal b)car c)book d)tree
2.Thesunis.........
a)cold  b)hot c¢)blue  d)small
B) Fill in the blanks. (2 marks)
3.1.........to school every day. (go)
4. She ......... ared car. (have)
C) Answer the questions. (1 mark)
5. What is your name?
6. How old are you?`;

const TEST_2_OCR = `نام درس: زبان انگلیسی پایه نهم    دبیرستان شهید بهشتی    تاریخ: ۱۴۰۳/۱۰/۱۵
نام دبیر: محمدی    مدت: ۶۰ دقیقه
A) Choose the best option. (2 marks)
1. She is interested in learning foreign languages.
a) on b) in c) at d) of
2. They decided to ......... the problem immediately.
a) solve b) solving c) solved d) solves
B) Fill in the blanks with the words given. One is extra. (2.5 marks)
[careful, pollution, healthy, dangerous, exercise]
3. Fast food is not ......... for your body.
4. Air ......... is a big problem in large cities.
5. You should be ......... when driving in the rain.
6. Regular ......... keeps you active and fit.
C) Find the mistake and correct it. (1.5 marks)
7. He don't know the answer to the question.
mistake: don't -> doesn't
D) Unscramble the following sentence. (1 mark)
8. / very / is / kind / my / teacher / .
E) Read the passage and answer the questions. (3 marks)
Ali lives in a small village near the mountains. Every morning, he walks two kilometers to reach his school.
9. Where does Ali live?
10. How far does he walk every morning?`;

console.log('--- RUNNING REGRESSION TEST 1 ---');
const doc1 = parseExamRawText(TEST_1_OCR, 'Test_1_Grade7_Quiz.txt');

console.log('Test 1 Sections count:', doc1.sections.length);
doc1.sections.forEach((s) => {
  console.log(`  Section ${s.rowId}: "${s.title}" (${s.markTotal} marks) -> ${s.questions.length} questions`);
  s.questions.forEach((q) => {
    console.log(`    Q${q.number}: type=${q.type}, mark=${q.mark}, opts=${q.options?.length || 0}, stem="${q.stem.slice(0, 30)}"`);
    if (q.options) {
      console.log(`       options:`, q.options.map((o) => `${o.id})${o.text}`).join(' '));
    }
  });
});
console.log('Total Questions:', doc1.totalQuestions);
console.log('Total Marks:', doc1.totalMarks);
console.log('Confidence Score:', doc1.confidenceScore, '%');
console.log('Needs Review:', doc1.needsReview);

console.log('\n--- RUNNING REGRESSION TEST 2 ---');
const doc2 = parseExamRawText(TEST_2_OCR, 'Test_2_Real_Scan.txt');

console.log('Test 2 Sections count:', doc2.sections.length);
console.log('Header Teacher:', doc2.header.teacherName);
console.log('Header Course:', doc2.header.courseName);
console.log('Header School:', doc2.header.schoolName);
doc2.sections.forEach((s) => {
  console.log(`  Section ${s.rowId}: "${s.title}" (${s.markTotal} marks, wordBank=${s.wordBank?.length || 0}) -> ${s.questions.length} questions`);
  s.questions.forEach((q) => {
    console.log(`    Q${q.number}: type=${q.type}, mark=${q.mark}, stem="${q.stem.slice(0, 35)}"`);
  });
});
console.log('Total Questions:', doc2.totalQuestions);
console.log('Total Marks:', doc2.totalMarks);
console.log('Confidence Score:', doc2.confidenceScore, '%');
console.log('Needs Review:', doc2.needsReview);
