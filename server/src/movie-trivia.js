// Questions and answers never ship to the browser. The SQLite database is read-only.
// All scoring takes place on the Socket.IO server, not in the client.
import { DatabaseSync } from "node:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomInt } from "node:crypto";

const dbPath = join(dirname(fileURLToPath(import.meta.url)), "..", "data", "movie_trivia.sqlite");

export function normalizeGuess(input) {
  if (typeof input !== "string") return "";
  return input.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en").replace(/&/g, " and ").replace(/[^\p{L}\p{N}]/gu, "")
    .slice(0, 120);
}

export function isCorrectGuess(question, guess) {
  const value = normalizeGuess(guess);
  if (value.length < 2) return false;
  return [question.answer, ...question.aliases].some((candidate) => normalizeGuess(candidate) === value);
}

export class MovieQuestionBank {
  constructor(path = dbPath) {
    this.db = new DatabaseSync(path, { readOnly: true });
    this.ids = this.db.prepare("SELECT id FROM movie_questions ORDER BY id").all().map((q) => q.id);
    if (!this.ids.length) throw new Error("Movie trivia database is empty");
    this.get = this.db.prepare("SELECT id, title, aliases, clues FROM movie_questions WHERE id = ?");
  }

  get size() { return this.ids.length; }

  draw(previous = []) {
    const excluded = new Set(previous);
    const available = this.ids.filter((id) => !excluded.has(id));
    const picks = available.length ? available : this.ids;
    const row = this.get.get(picks[randomInt(picks.length)]);
    return { id: row.id, answer: row.title, aliases: JSON.parse(row.aliases), clues: JSON.parse(row.clues) };
  }

  close() { this.db.close(); }
}
