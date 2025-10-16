const crypto = require("crypto");

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Hàm shuffle câu hỏi và cả đáp án bên trong
function shuffleQuestions(questions) {
  // Shuffle toàn bộ câu hỏi
  let shuffledQuestions = shuffleArray(questions);

  // Với từng câu, shuffle các đáp án bên trong
  shuffledQuestions = shuffledQuestions.map((q) => {
    if (q.options && Array.isArray(q.options)) {
      q = { ...q, options: shuffleArray(q.options) };
    }
    if (q.pairs && Array.isArray(q.pairs)) {
      q = { ...q, pairs: shuffleArray(q.pairs) };
    }
    if (q.draggables && Array.isArray(q.draggables)) {
      q = { ...q, draggables: shuffleArray(q.draggables) };
    }
    if (q.dropzones && Array.isArray(q.dropzones)) {
      q = { ...q, dropzones: shuffleArray(q.dropzones) };
    }
    return q;
  });

  return shuffledQuestions;
}

function generateToken() {
  return crypto.randomBytes(8).toString("hex");
}

module.exports = { shuffleArray, shuffleQuestions, generateToken };
