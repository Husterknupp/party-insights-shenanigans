import { jest } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
// jszip and sql.js also happen to be what anki-apkg-export uses internally (see
// politicianNoteTypeSql.js, which reads/writes the exact same collection.anki2 format
// through the same two libraries) — but they're declared as our own direct dependencies
// here, not pulled in transitively through anki-apkg-export's node_modules tree. Depending
// on the exact same libraries anki-apkg-export happens to use internally, without owning
// that dependency ourselves, would make this spec's ability to even run hostage to an
// implementation detail anki-apkg-export could change or drop at any point.
import JSZip from "jszip";
import SQL from "sql.js";

// Deliberately does NOT mock AnkiDeckBuilder.res.mjs (unlike apkgFileExport.spec.js) —
// the whole point of this spec is to exercise exportOutputFileToApkg end to end, the same
// entry point ankiExportCli.js and index.js use to produce the checked-in decks, so a real
// regression in that path (e.g. #55's CJS/ESM interop bug) actually fails a test instead of
// only ever surfacing by hand. Only axios (the actual network call) is mocked.
const axiosGetMock = jest.fn();

jest.unstable_mockModule("axios", () => ({
  default: { get: axiosGetMock },
}));

const { exportOutputFileToApkg } = await import("./apkgFileExport.js");

const POLITICIAN_WITH_IMAGE = {
  name: "Erika Mustermann",
  party: "Testpartei",
  amt: "Ministerin für Tests",
  imageUrl: "https://example.com/erika.png",
};

const POLITICIAN_WITHOUT_IMAGE = {
  name: "Max Mustermann",
  party: "Andere Partei",
  amt: "Minister ohne Foto",
  imageUrl: "",
};

const readNotesAndCards = async (apkgFilePath) => {
  const zip = await JSZip.loadAsync(fs.readFileSync(apkgFilePath));
  const collectionFile = zip.file("collection.anki2");
  const collectionData = await collectionFile.async("uint8array");
  const db = new SQL.Database(collectionData);

  const notes = db.exec("select id, guid, flds from notes")[0]?.values ?? [];
  const cards = db.exec("select nid from cards")[0]?.values ?? [];

  return {
    zip,
    notes: notes.map(([id, guid, flds]) => ({ id, guid, flds })),
    cardCountByNoteId: cards.reduce((counts, [nid]) => {
      counts.set(nid, (counts.get(nid) ?? 0) + 1);
      return counts;
    }, new Map()),
  };
};

describe("exportOutputFileToApkg (integration, real anki-apkg-export)", () => {
  let tmpDir;
  let apkgFilePath;

  beforeAll(async () => {
    axiosGetMock.mockResolvedValue({ data: Buffer.from("fake-image-bytes") });

    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "apkg-integration-"));
    const jsonFilePath = path.join(tmpDir, "fixture.json");
    fs.writeFileSync(
      jsonFilePath,
      JSON.stringify([POLITICIAN_WITH_IMAGE, POLITICIAN_WITHOUT_IMAGE]),
    );

    apkgFilePath = await exportOutputFileToApkg(jsonFilePath);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("produces a valid zip containing collection.anki2", async () => {
    const { zip } = await readNotesAndCards(apkgFilePath);
    expect(zip.file("collection.anki2")).not.toBeNull();
  });

  it("gets the politician's front/back text into the produced deck", async () => {
    const { notes } = await readNotesAndCards(apkgFilePath);

    const erikaNote = notes.find((note) =>
      note.flds.includes("Erika Mustermann"),
    );
    expect(erikaNote).toBeDefined();
    expect(erikaNote.flds).toContain("Testpartei");
    expect(erikaNote.flds).toContain("Ministerin für Tests");
  });

  it("gives a note two cards when its politician has a valid image URL, and one when not", async () => {
    const { notes, cardCountByNoteId } = await readNotesAndCards(apkgFilePath);

    const erikaNote = notes.find((note) =>
      note.flds.includes("Erika Mustermann"),
    );
    const maxNote = notes.find((note) => note.flds.includes("Max Mustermann"));

    expect(cardCountByNoteId.get(erikaNote.id)).toBe(2);
    expect(cardCountByNoteId.get(maxNote.id)).toBe(1);
  });
});

// #71: what a *re*-import does, which is decided entirely by the note guids the export writes.
// Anki matches an incoming note against the collection by guid alone — a match updates the note's
// fields and leaves its cards and their scheduling untouched, a miss adds a new note whose cards go
// into the new queue. So "does the user keep their progress" and "is the user shown the change" are
// both questions about guid equality between two exports, which is what these assert. The import
// itself is simulated by taking the union of the two guid sets, exactly what Anki keys on.
describe("exportOutputFileToApkg re-export identity", () => {
  const IMAGE_CHANGED = {
    ...POLITICIAN_WITH_IMAGE,
    imageUrl: "https://example.com/erika-new-portrait.jpg",
  };
  const SUCCESSOR = { ...POLITICIAN_WITH_IMAGE, name: "Erika Musterfrau" };

  let tmpDir;
  let guidsOf;

  // Every export goes into its own directory under the same basename: the deck name is derived
  // from the basename (deckNameFor) and is part of the guid, so re-using it is what makes these
  // two runs the same deck rather than two different ones.
  const exportRun = async (runName, politicians) => {
    const runDir = path.join(tmpDir, runName);
    fs.mkdirSync(runDir);
    const jsonFilePath = path.join(runDir, "fixture.json");
    fs.writeFileSync(jsonFilePath, JSON.stringify(politicians));
    return exportOutputFileToApkg(jsonFilePath);
  };

  beforeAll(async () => {
    axiosGetMock.mockResolvedValue({ data: Buffer.from("fake-image-bytes") });
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "apkg-reexport-"));

    const runs = {
      first: [POLITICIAN_WITH_IMAGE, POLITICIAN_WITHOUT_IMAGE],
      again: [POLITICIAN_WITH_IMAGE, POLITICIAN_WITHOUT_IMAGE],
      newImage: [IMAGE_CHANGED, POLITICIAN_WITHOUT_IMAGE],
      reordered: [POLITICIAN_WITHOUT_IMAGE, POLITICIAN_WITH_IMAGE],
      successor: [SUCCESSOR, POLITICIAN_WITHOUT_IMAGE],
    };

    const collected = {};
    for (const [runName, politicians] of Object.entries(runs)) {
      const { notes } = await readNotesAndCards(
        await exportRun(runName, politicians),
      );
      collected[runName] = new Set(notes.map((note) => note.guid));
    }
    guidsOf = (runName) => collected[runName];
    // one second of throttling per downloaded image (AnkiDeckBuilder), times five runs
  }, 60_000);

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("gives unchanged input identical note guids, so a re-import updates instead of duplicating", () => {
    expect([...guidsOf("again")].sort()).toEqual([...guidsOf("first")].sort());
  });

  it("does not grow the note count when the same deck is imported twice", () => {
    const afterReimport = new Set([...guidsOf("first"), ...guidsOf("again")]);

    expect(afterReimport.size).toBe(guidsOf("first").size);
  });

  it("keeps the guids when only a politician's image changed, so learning progress survives", () => {
    expect([...guidsOf("newImage")].sort()).toEqual(
      [...guidsOf("first")].sort(),
    );
  });

  it("keeps the guids when the source file is merely reordered", () => {
    expect([...guidsOf("reordered")].sort()).toEqual(
      [...guidsOf("first")].sort(),
    );
  });

  it("gives a new person on a post a new guid, so it is imported as a new card to learn", () => {
    const added = [...guidsOf("successor")].filter(
      (guid) => !guidsOf("first").has(guid),
    );

    expect(added.length).toBe(1);
  });

  it("leaves the unchanged politician on the deck alone when someone else is replaced", () => {
    const kept = [...guidsOf("successor")].filter((guid) =>
      guidsOf("first").has(guid),
    );

    expect(kept.length).toBe(1);
  });
});
