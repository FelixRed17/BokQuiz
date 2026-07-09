type RoundAnswersDTO = {
  round_number: number;
  questions: Array<{
    round: number;
    index: number;
    text: string;
    options: string[];
    correct_index: number;
    correct_answer: string;
  }>;
};

type LocalQuestion = {
  text: string;
  options: string[];
  correct_index: number;
};

type LocalRound = {
  number: number;
  questions: LocalQuestion[];
};

type LocalQuestionsFile = {
  rounds: LocalRound[];
};

let cachedQuestions: LocalQuestionsFile | null = null;

async function loadQuestionsFile(): Promise<LocalQuestionsFile> {
  if (cachedQuestions) return cachedQuestions;

  const response = await fetch("/questions.json", { cache: "force-cache" });
  if (!response.ok) {
    throw new Error("Failed to load bundled quiz questions");
  }

  cachedQuestions = (await response.json()) as LocalQuestionsFile;
  return cachedQuestions;
}

export async function fetchLocalRoundAnswers(
  roundNumber: number
): Promise<RoundAnswersDTO> {
  const data = await loadQuestionsFile();
  const round = data.rounds.find((entry) => entry.number === roundNumber);

  if (!round) {
    throw new Error(`No bundled questions found for round ${roundNumber}`);
  }

  const questions = round.questions.map((question, index) => {
    const correctIndex = question.correct_index;
    return {
      round: roundNumber,
      index,
      text: question.text,
      options: question.options,
      correct_index: correctIndex,
      correct_answer: question.options[correctIndex] ?? "",
    };
  });

  return {
    round_number: roundNumber,
    questions,
  };
}
