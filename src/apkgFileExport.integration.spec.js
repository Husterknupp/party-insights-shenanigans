import { jest } from "@jest/globals";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";

// Deliberately does NOT mock ankiDeckBuilder.res.mjs (unlike apkgFileExport.spec.js) —
// the whole point of this spec is to exercise exportOutputFileToApkg end to end, the same
// entry point ankiExportCli.js and index.js use to produce the checked-in decks, so a real
// regression in that path (e.g. #55's CJS/ESM interop bug) actually fails a test instead of
// only ever surfacing by hand. Only axios (the actual network call) is mocked.
const axiosGetMock = jest.fn();

jest.unstable_mockModule("axios", () => ({
  default: { get: axiosGetMock },
}));

const { exportOutputFileToApkg } = await import("./apkgFileExport.js");

// jszip and sql.js are already real (transitive) dependencies of anki-apkg-export — see
// politicianNoteTypeSql.js, which reads/writes the exact same collection.anki2 format via
// the same two libraries — so reading the produced .apkg back doesn't need a new dependency.
const require = createRequire(import.meta.url);
const JSZip = require("jszip");
const SQL = require("sql.js");

const POLITICIAN_WITH_IMAGE = {
  name: "Jane Doe",
  party: "Testpartei",
  amt: "Ministerin für Tests",
  imageUrl: "https://example.com/jane.png",
};

const POLITICIAN_WITHOUT_IMAGE = {
  name: "John Roe",
  party: "Andere Partei",
  amt: "Minister ohne Foto",
  imageUrl: "",
};

const readNotesAndCards = async (apkgFilePath) => {
  const zip = await JSZip.loadAsync(fs.readFileSync(apkgFilePath));
  const collectionFile = zip.file("collection.anki2");
  const collectionData = await collectionFile.async("uint8array");
  const db = new SQL.Database(collectionData);

  const notes = db.exec("select id, flds from notes")[0]?.values ?? [];
  const cards = db.exec("select nid from cards")[0]?.values ?? [];

  return {
    zip,
    notes: notes.map(([id, flds]) => ({ id, flds })),
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

    const janeNote = notes.find((note) => note.flds.includes("Jane Doe"));
    expect(janeNote).toBeDefined();
    expect(janeNote.flds).toContain("Testpartei");
    expect(janeNote.flds).toContain("Ministerin für Tests");
  });

  it("gives a note two cards when its politician has a valid image URL, and one when not", async () => {
    const { notes, cardCountByNoteId } = await readNotesAndCards(apkgFilePath);

    const janeNote = notes.find((note) => note.flds.includes("Jane Doe"));
    const johnNote = notes.find((note) => note.flds.includes("John Roe"));

    expect(cardCountByNoteId.get(janeNote.id)).toBe(2);
    expect(cardCountByNoteId.get(johnNote.id)).toBe(1);
  });
});
