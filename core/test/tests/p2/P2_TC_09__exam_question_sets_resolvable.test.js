export default {
  id: 'P2-TC-09',
  title: 'AcademyDataApi löst Exam-QuestionSets aus dem JSON-Shape auf',
  phases: [2],
  kind: 'auto',
  expected: 'getExamQuestionSets(), getExamQuestionSet() und getQuestionSetForExam() lesen exam-questions.json über questionSets.',
  async run({ engine }) {
    const api = engine?.academy?.data ?? game?.janus7?.academy?.data;
    if (!api) throw new Error('AcademyDataApi nicht verfügbar');

    const exams = api.getExams?.() ?? [];
    const exam = exams.find((row) => row?.interaction?.questionSetId) ?? null;
    if (!exam) throw new Error('Kein Exam mit questionSetId gefunden');

    const questionSets = api.getExamQuestionSets?.() ?? [];
    const byId = api.getExamQuestionSet?.(exam.interaction.questionSetId) ?? null;
    const byExam = api.getQuestionSetForExam?.(exam.id) ?? null;

    const ok = questionSets.length > 0
      && byId?.id === exam.interaction.questionSetId
      && byExam?.examId === exam.id;

    if (!ok) {
      throw new Error(`QuestionSets nicht korrekt aufgelöst (sets=${questionSets.length}, byId=${byId?.id ?? 'null'}, byExam=${byExam?.id ?? 'null'})`);
    }

    return {
      ok: true,
      summary: `exam=${exam.id} questionSet=${byId.id}`,
    };
  }
};
