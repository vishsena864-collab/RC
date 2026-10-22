import assert from "node:assert/strict";
import { test } from "node:test";
import { MovieQuestionBank, normalizeGuess, isCorrectGuess } from "../src/movie-trivia.js";
import { anonymousNetworkKey, privacyKey } from "../src/privacy.js";

test("SQLite question bank includes 150+ distinct movies with four clues each", () => {
  const bank = new MovieQuestionBank();
  try {
    assert.ok(bank.size >= 150);
    const chosen = new Set();
    for (let i = 0; i < 20; i++) {
      const item = bank.draw([...chosen]);
      assert.equal(item.clues.length, 4);
      assert.ok(item.clues.every((c) => c.length > 12));
      assert.equal(isCorrectGuess(item, item.answer.toUpperCase()), true);
      chosen.add(item.id);
    }
    assert.equal(chosen.size, 20, "fresh questions during a session");
  } finally { bank.close(); }
});

test("movie answer normalization does not accept partial or unrelated titles", () => {
  assert.equal(normalizeGuess(" Spider-Man: No Way Home "), normalizeGuess("spiderman no way home"));
  assert.equal(isCorrectGuess({ answer: "The Lion King", aliases: [] }, "the lion king"), true);
  assert.equal(isCorrectGuess({ answer: "The Lion King", aliases: [] }, "lion"), false);
  assert.equal(isCorrectGuess({ answer: "The Lion King", aliases: [] }, {}), false);
});

test("abuse fingerprints are keyed, irreversible HMAC digests with no literal IP", () => {
  const secret = privacyKey("1".repeat(64));
  assert.equal(anonymousNetworkKey("192.0.2.4", secret), anonymousNetworkKey("192.0.2.4", secret));
  assert.notEqual(anonymousNetworkKey("192.0.2.4", secret), anonymousNetworkKey("192.0.2.5", secret));
  assert.match(anonymousNetworkKey("192.0.2.4", secret), /^[a-f0-9]{64}$/);
  assert.throws(() => privacyKey("short"), /at least 32 bytes/);
});
