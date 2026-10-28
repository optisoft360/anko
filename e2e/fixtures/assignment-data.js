// Mocked API data for /enterprise/learning/assignments/6 (single-process assignment with
// one topic: a 20-card deck and a 15-question battery). QA-TEST data only.
import { withCompany } from "./app-data";

const LONG = "Harry descubre en su undécimo cumpleaños que es un mago, hijo de Lily y James Potter, "
  + "y que sobrevivió de bebé al ataque de Lord Voldemort, lo que le dejó la cicatriz en forma de rayo.";

export const CARDS = Array.from({ length: 20 }, (_, i) => ({
  id: 600 + i,
  front: `¿Pregunta de repaso número ${i + 1} sobre el mundo mágico de Harry Potter?`,
  back: i % 2 === 0 ? `${LONG} ${LONG}` : `Respuesta corta ${i + 1}`,
  explanation: i % 3 === 0 ? "Se explica en el capítulo 1 del libro, cuando Hagrid visita a Harry." : "",
}));

export const QUESTIONS = Array.from({ length: 15 }, (_, i) => {
  const multi = i % 2 === 0;
  return {
    id: 700 + i,
    question: `Pregunta ${i + 1}: ¿qué afirmaciones son ciertas sobre Hogwarts y sus casas?`,
    type: multi ? "multiselect" : "single",
    points: 1,
    explanation: `${LONG} Esto es la explicación de la pregunta ${i + 1}.`,
    page_reference: String(10 + i),
    options: [
      { id: 7000 + i * 10 + 1, text: "Gryffindor valora la valentía", correct: true },
      { id: 7000 + i * 10 + 2, text: "Slytherin valora la astucia", correct: multi },
      { id: 7000 + i * 10 + 3, text: "Hufflepuff valora la crueldad", correct: false },
      { id: 7000 + i * 10 + 4, text: "Ravenclaw no existe", correct: false },
    ],
  };
});

const KS = { id: 30, title: "Harry Potter", status: "processed", process_type: "course", difficulty: "medium", minimum_passing_score: 60 };

export const RESULTS_6 = {
  run: { status: "completed" },
  topics: [{ id: "31", title: "Harry's Unsettling Experiences", tags: ["dursley", "hogwarts", "carta"] }],
  decks: [{ id: 80, title: "Harry's Unsettling Experiences", tag_group_id: 31, cardsCount: 20 }],
  batteries: [{ id: 81, name: "Harry's Unsettling Experiences", tag_group_id: 31, question_count: 15, best_attempt_percent: 60 }],
};

export const ASSIGNMENT_6 = {
  id: 6, learning_module: 66, learning_path: null,
  assigned_by_username: "andersanchez1987", status: "in_progress", due_date: "2026-11-30",
};

export const assignmentRoutes = {
  ...withCompany,
  "GET /enterprise/learning-assignments/6/$": () => ASSIGNMENT_6,
  "GET /enterprise/learning-assignments/6/progress/$": () => ({ completed_module_ids: [] }),
  "GET /enterprise/learning-modules/66/$": () => ({ id: 66, name: "Harry Potter", knowledge_source: 30 }),
  "GET /enterprise/knowledge-sources/30/$": () => KS,
  "GET /enterprise/knowledge-sources/30/results/$": () => RESULTS_6,
  "GET /enterprise/knowledge-sources/30/documents-with-sections/$": () => ({
    documents: [{ id: 9, filename: "01_Harry_Potter_and_The_Philosophers_Stone.pdf", sections: [] }],
  }),
  "GET /flashcards/$": () => ({ count: CARDS.length, next: null, results: CARDS }),
  "GET /batteries/81/$": () => ({ id: 81, name: "Harry's Unsettling Experiences" }),
  "GET /batteries/81/questions/$": () => QUESTIONS,
  "POST /batteries/81/start_attempt/$": () => ({ id: 900 }),
  "POST /batteries/81/answer/$": () => ({}),
  "POST /batteries/81/finish_attempt/$": () => ({}),
};
