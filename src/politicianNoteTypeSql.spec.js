import {
  makeMultiFieldExporter,
  addNote,
  save,
  POLITICIAN_MODEL_ID,
  POLITICIAN_MODEL_NAME,
  POLITICIAN_FIELDS,
} from "./politicianNoteTypeSql.js";

const notes = (exporter) =>
  exporter.db.exec("select id, mid, flds from notes")[0]?.values ?? [];
const cards = (exporter) =>
  exporter.db.exec("select id, nid, ord from cards")[0]?.values ?? [];
const model = (exporter) => {
  const modelsJson = exporter.db.exec("select models from col")[0].values[0][0];
  return JSON.parse(modelsJson)[POLITICIAN_MODEL_ID];
};

describe("makeMultiFieldExporter", () => {
  it("re-keys the note type onto the fixed model id and name, not a fresh per-run one", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    expect(model(exporter).id).toBe(POLITICIAN_MODEL_ID);
    expect(model(exporter).name).toBe(POLITICIAN_MODEL_NAME);
  });

  it("produces the same model id/name across independently-built decks", () => {
    const first = makeMultiFieldExporter("DeckOne");
    const second = makeMultiFieldExporter("DeckTwo");

    expect(model(first).id).toBe(model(second).id);
    expect(model(first).name).toBe(model(second).name);
  });

  it("defines the 4 politician fields in order and both card templates", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");
    const m = model(exporter);

    expect(m.flds.map((f) => f.name)).toEqual(POLITICIAN_FIELDS);
    expect(m.tmpls.map((t) => t.name)).toEqual([
      "Amt zu Person",
      "Gesicht zu Amt",
    ]);
  });

  // issue #65: the raw Exporter class re-keys the deck id from Date.now() at
  // construction time and never lets us override it, so every independently-built
  // exporter used to get a different deck id (and every card a different `did`) even
  // for the exact same deck name — deriving it from the deck name instead fixes that.
  it("re-keys the deck onto a deterministic id derived from the deck name, not a fresh per-run one", () => {
    const first = makeMultiFieldExporter("SomeDeck");
    const second = makeMultiFieldExporter("SomeDeck");

    expect(first.topDeckId).toBe(second.topDeckId);
  });

  it("gives independently-named decks distinct ids", () => {
    const first = makeMultiFieldExporter("DeckOne");
    const second = makeMultiFieldExporter("DeckTwo");

    expect(first.topDeckId).not.toBe(second.topDeckId);
  });

  it("re-keys the model's own `did` alongside the deck, not just the deck table entry", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    expect(model(exporter).did).toBe(exporter.topDeckId);
  });
});

describe("addNote", () => {
  it("writes a note with all 4 fields joined by the Anki field separator", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);

    const [[, mid, flds]] = notes(exporter);
    expect(mid).toBe(POLITICIAN_MODEL_ID);
    expect(flds).toBe('Friedrich MerzCDUBundeskanzler<img src="0.jpg">');
  });

  it("generates both cards when both Amt/Ministerium and Profil-Photo are present", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);

    const [[noteId]] = notes(exporter);
    const cardOrds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([, , ord]) => ord)
      .sort();
    expect(cardOrds).toEqual([0, 1]);
  });

  it("skips 'Gesicht zu Amt' when Profil-Photo is empty (e.g. a politician without an image)", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, ["Jane Doe", "N/A", "Ministerin", ""]);

    const [[noteId]] = notes(exporter);
    const cardOrds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([, , ord]) => ord);
    expect(cardOrds).toEqual([0]);
  });

  it("gives each card of a note its own id instead of colliding on 'insert or replace'", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);

    const [[noteId]] = notes(exporter);
    const cardIds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([id]) => id);
    expect(cardIds.length).toBe(2);
    expect(new Set(cardIds).size).toBe(2);
  });

  it("keeps notes independent across multiple addNote calls", () => {
    const exporter = makeMultiFieldExporter("SomeDeck");

    addNote(exporter, [
      "Friedrich Merz",
      "CDU",
      "Bundeskanzler",
      '<img src="0.jpg">',
    ]);
    addNote(exporter, ["Jane Doe", "N/A", "Ministerin", ""]);

    expect(notes(exporter).length).toBe(2);
    expect(cards(exporter).length).toBe(3);
  });

  // issue #65: note/card `id` and `mod` columns used to be seeded from Date.now(), so
  // two exports of the exact same politicians produced different notes/cards rows (and
  // therefore a different collection.anki2) depending purely on when each ran.
  it("produces identical note/card rows across independently-built exporters given the same content", () => {
    const build = () => {
      const exporter = makeMultiFieldExporter("SomeDeck");
      addNote(exporter, [
        "Friedrich Merz",
        "CDU",
        "Bundeskanzler",
        '<img src="0.jpg">',
      ]);
      return { notes: notes(exporter), cards: cards(exporter) };
    };

    const first = build();
    const second = build();

    expect(first.notes).toEqual(second.notes);
    expect(first.cards).toEqual(second.cards);
  });
});

describe("save", () => {
  // the regression this repo actually cares about: CI regenerates every output/**/*.apkg
  // and fails if it differs from the checked-in version (see .github/workflows/schedule.yml)
  // — that check is worthless if re-exporting the same content produces different bytes
  // every time, which is exactly what happened before issue #65's fix (Date.now()-seeded
  // ids/mod timestamps, plus JSZip defaulting every entry's date to "now")
  it("produces byte-identical .apkg output across independently-built exporters given the same content", async () => {
    const build = async () => {
      const exporter = makeMultiFieldExporter("SomeDeck");
      addNote(exporter, [
        "Friedrich Merz",
        "CDU",
        "Bundeskanzler",
        '<img src="0.jpg">',
      ]);
      return save(exporter);
    };

    const first = await build();
    // a real, non-zero gap so a lingering Date.now()/`new Date()` dependency would
    // reliably produce different bytes instead of coincidentally landing in the same ms
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await build();

    expect(Buffer.compare(first, second)).toBe(0);
  });
});
