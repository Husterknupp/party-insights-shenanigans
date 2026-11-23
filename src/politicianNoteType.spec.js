import { jest } from "@jest/globals";
import { makeExporter, addNote } from "./AnkiApkgExportFacade.res.mjs";
import {
  noteIdentity,
  modelId as POLITICIAN_MODEL_ID,
  modelName as POLITICIAN_MODEL_NAME,
  fields as POLITICIAN_FIELDS,
} from "./PoliticianNoteType.res.mjs";

// the exporter owns a WASM database: close every one a test opens
const opened = [];
const makeTrackedExporter = async (deckName) => {
  const exporter = await makeExporter(deckName);
  opened.push(exporter);
  return exporter;
};
afterEach(() => {
  while (opened.length) opened.pop().close();
});

const notes = (exporter) =>
  exporter.db.exec("select id, mid, flds from notes")[0]?.values ?? [];
const guids = (exporter) =>
  (exporter.db.exec("select guid from notes")[0]?.values ?? []).map(
    ([guid]) => guid,
  );
const noteMods = (exporter) =>
  (exporter.db.exec("select mod from notes")[0]?.values ?? []).map(
    ([mod]) => mod,
  );
const guidOf = async (deckName, fieldValues) => {
  const exporter = await makeTrackedExporter(deckName);
  addNote(exporter, fieldValues);
  return guids(exporter)[0];
};

const cards = (exporter) =>
  exporter.db.exec("select id, nid, ord from cards")[0]?.values ?? [];
const model = (exporter) => {
  const modelsJson = exporter.db.exec("select models from col")[0].values[0][0];
  return JSON.parse(modelsJson)[POLITICIAN_MODEL_ID];
};

const MERZ = ["Friedrich Merz", "CDU", "Bundeskanzler", '<img src="0.jpg">'];

describe("makeExporter", () => {
  it("uses the fixed model id and name, not a fresh per-run one", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");

    expect(model(exporter).id).toBe(POLITICIAN_MODEL_ID);
    expect(model(exporter).name).toBe(POLITICIAN_MODEL_NAME);
  });

  it("produces the same model id/name across independently-built decks", async () => {
    const first = await makeTrackedExporter("DeckOne");
    const second = await makeTrackedExporter("DeckTwo");

    expect(model(first).id).toBe(model(second).id);
    expect(model(first).name).toBe(model(second).name);
  });

  it("puts only the politician note type into the collection, no leftover Front/Back model", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");
    const modelsJson = exporter.db.exec("select models from col")[0].values[0][0];

    expect(Object.keys(JSON.parse(modelsJson))).toEqual([String(POLITICIAN_MODEL_ID)]);
  });

  it("defines the 4 politician fields in order and both card templates", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");
    const m = model(exporter);

    expect(m.flds.map((f) => f.name)).toEqual(POLITICIAN_FIELDS);
    expect(m.tmpls.map((t) => t.name)).toEqual(["Amt zu Person", "Gesicht zu Amt"]);
  });
});

describe("addNote", () => {
  it("writes a note with all 4 fields joined by the Anki field separator", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");

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

  it("generates both cards when both Amt/Ministerium and Profil-Photo are present", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");

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

  it("skips 'Gesicht zu Amt' when Profil-Photo is empty (e.g. a politician without an image)", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");

    addNote(exporter, ["Jane Doe", "N/A", "Ministerin", ""]);

    const [[noteId]] = notes(exporter);
    const cardOrds = cards(exporter)
      .filter(([, nid]) => nid === noteId)
      .map(([, , ord]) => ord);
    expect(cardOrds).toEqual([0]);
  });

  it("gives each card of a note its own id instead of colliding on 'insert or replace'", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");

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

  it("writes note mod as epoch seconds, not milliseconds — Anki reads it as a TimestampSecs", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");
    const before = Math.floor(Date.now() / 1000);

    addNote(exporter, MERZ);

    // a millisecond value would land three orders of magnitude above this range (year ~58500)
    expect(noteMods(exporter)[0]).toBeGreaterThanOrEqual(before);
    expect(noteMods(exporter)[0]).toBeLessThanOrEqual(before + 60);
  });

  // Anki only overwrites a known note on import when the incoming `mod` is strictly greater
  it("gives a later export a strictly greater note mod, so an import updates instead of skipping", async () => {
    const buildTime = 1_753_900_000_000;
    const nowSpy = jest.spyOn(Date, "now");

    nowSpy.mockReturnValue(buildTime);
    const firstBuild = await makeTrackedExporter("SomeDeck");
    addNote(firstBuild, MERZ);

    nowSpy.mockReturnValue(buildTime + 86_400_000); // same deck, rebuilt a day later
    const secondBuild = await makeTrackedExporter("SomeDeck");
    addNote(secondBuild, MERZ);

    nowSpy.mockRestore();

    expect(guids(secondBuild)).toEqual(guids(firstBuild)); // Anki matches the note ...
    expect(noteMods(secondBuild)[0]).toBeGreaterThan(noteMods(firstBuild)[0]); // ... and sees it as newer
  });

  it("keeps notes independent across multiple addNote calls", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");

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
});

// Anki matches imported notes by guid: a known one is updated in place (scheduling kept), an
// unknown one becomes a new note. See #71.
describe("addNote note identity (guid)", () => {
  it("is stable across separately built decks, so an unchanged politician re-imports as an update", async () => {
    expect(await guidOf("SomeDeck", MERZ)).toBe(await guidOf("SomeDeck", MERZ));
  });

  it("ignores the profile photo, so a new picture updates the note instead of resetting progress", async () => {
    const withOtherPhoto = ["Friedrich Merz", "CDU", "Bundeskanzler", '<img src="7.png">'];

    expect(await guidOf("SomeDeck", withOtherPhoto)).toBe(await guidOf("SomeDeck", MERZ));
  });

  it("ignores a missing photo too — gaining or losing an image is not a new fact to learn", async () => {
    const withoutPhoto = ["Friedrich Merz", "CDU", "Bundeskanzler", ""];

    expect(await guidOf("SomeDeck", withoutPhoto)).toBe(await guidOf("SomeDeck", MERZ));
  });

  it.each([
    ["a new person on the post", ["Jane Doe", "CDU", "Bundeskanzler", '<img src="0.jpg">']],
    ["a party switch", ["Friedrich Merz", "SPD", "Bundeskanzler", '<img src="0.jpg">']],
    ["a renamed post", ["Friedrich Merz", "CDU", "Bundespräsident", '<img src="0.jpg">']],
  ])("changes on %s, so the user is asked the card again", async (_what, changed) => {
    expect(await guidOf("SomeDeck", changed)).not.toBe(await guidOf("SomeDeck", MERZ));
  });

  it("differs per deck, keeping a politician in two decks as two notes", async () => {
    expect(await guidOf("DeckOne", MERZ)).not.toBe(await guidOf("DeckTwo", MERZ));
  });

  it("does not depend on how many notes were added before it", async () => {
    const exporter = await makeTrackedExporter("SomeDeck");
    addNote(exporter, ["Jane Doe", "N/A", "Ministerin", ""]);
    addNote(exporter, MERZ);

    expect(guids(exporter)).toContain(await guidOf("SomeDeck", MERZ));
  });
});

// Golden values: if one of these fails, the identity changed and a re-import duplicates every
// note (#71) — don't just update the expectation. Also fails if a library upgrade changes the
// GUID scheme.
describe("note identity golden values", () => {
  it("builds the identity key from every field except the photo", () => {
    expect(noteIdentity(MERZ)).toBe("Friedrich Merz\u001fCDU\u001fBundeskanzler");
  });

  it("keeps the GUID of a known note unchanged", async () => {
    expect(await guidOf("Party Insights::Bundesregierung", MERZ)).toBe(
      "ad05c9f7ddf5bf47b2b45e24842f45ecac4e4a22",
    );
  });
});
