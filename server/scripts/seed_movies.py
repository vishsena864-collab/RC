"""Rebuild the bundled SQLite question database from the editable question bank.
Run in server/: python scripts/seed_movies.py
Requires only Python 3 standard library. Existing DB is backed up before replacement.
"""
import json, sqlite3, pathlib, os, tempfile
base = pathlib.Path(__file__).resolve().parent.parent / "data"
bank = json.loads((base / "movie_questions.json").read_text(encoding="utf-8"))["questions"]
assert len({x["id"] for x in bank}) == len(bank), "IDs must be unique"
assert len({x["answer"].lower() for x in bank}) == len(bank), "Answers must be unique"
assert all(len(x["clues"]) == 4 and all(x["clues"]) for x in bank), "Each question needs four clues"
fd, tmp = tempfile.mkstemp(suffix=".sqlite", dir=base)
os.close(fd)
try:
    db = sqlite3.connect(tmp)
    db.execute("CREATE TABLE movie_questions (id TEXT PRIMARY KEY, title TEXT NOT NULL UNIQUE, aliases TEXT NOT NULL, clues TEXT NOT NULL, category TEXT NOT NULL)")
    db.execute("CREATE INDEX movie_questions_category_idx ON movie_questions (category)")
    db.executemany("INSERT INTO movie_questions VALUES (?,?,?,?,?)", [
        (x["id"], x["answer"], json.dumps(x.get("aliases", [])), json.dumps(x["clues"], ensure_ascii=False), x.get("category", "movies"))
        for x in bank
    ])
    db.commit()
    db.close()
    os.replace(tmp, base / "movie_trivia.sqlite")
    print(f"Seeded {len(bank)} questions")
finally:
    if os.path.exists(tmp): os.unlink(tmp)
