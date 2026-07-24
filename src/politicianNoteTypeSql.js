// anki-apkg-export's public factory (`AnkiExport(deckName, { questionFormat, answerFormat, css })`,
// see its src/index.js) only ever creates a note type with exactly two fields (Front/Back) and
// exactly one card template — its src/template.js hardcodes that shape, and Exporter#addCard
// always writes a 2-field note plus a single ord:0 card. There's no parameter anywhere to add
// fields or a second template.
//
// This module works around that by using the library's *other* public export, the raw
// `Exporter` class (`new Exporter(deckName, { template: <sql>, sql })`), which just runs
// whatever SQL string it's given against a fresh sql.js database. `createCollectionSql`
// below is a generalized version of the library's own template.js that accepts arbitrary
// fields/templates/req instead of the hardcoded Front/Back/Card-1 shape, and `addNote` inserts
// notes/cards directly via `exporter.db` (a public instance property), mirroring the insert
// logic in the library's own exporter.js#addCard.
//
// A note on naming, since "template" means two different things in this file: an Anki *card
// template* (a qfmt/afmt question/answer pair, e.g. POLITICIAN_TEMPLATES below — what a user of
// Anki would call a template) vs. the raw *SQL template string* that Exporter's constructor
// expects under its own `template` option (the seed SQL for a fresh collection database — see
// `createCollectionSql`/`collectionSql` below). Functions and variables here are named
// `...Sql`/`collectionSql` specifically to keep those two senses apart; `Exporter`'s `template`
// option name itself is the library's own naming and can't be changed from here.
//
// See issue #50 for the full writeup of why this workaround exists and the license/version
// tradeoffs of the alternatives (genanki-js is AGPL and pins sql.js@^1.6 vs. the sql.js@0.5.0
// already used transitively here; the `genanki` npm package is an unpublished stub).
import { createRequire } from "node:module";
import sha1 from "sha1";
import Zip from "jszip";

const require = createRequire(import.meta.url);
const { Exporter } = require("anki-apkg-export");
const sql = require("sql.js");

const SEPARATOR = "";

// fixed so the same note type re-imports as one shared model across independently-generated
// decks, instead of a fresh per-run id/name (see the re-keying workaround in makeMultiFieldExporter)
export const POLITICIAN_MODEL_ID = 1500000000001;
export const POLITICIAN_MODEL_NAME = "Deutschland:Politiker";

// field order matters: it's also the flds index used by `req` below and the order fields are
// joined in when writing a note's `flds` column
export const POLITICIAN_FIELDS = [
  "Name",
  "Partei",
  "Amt/Ministerium",
  "Profil-Photo",
];

const POLITICIAN_TEMPLATES = [
  {
    name: "Amt zu Person",
    qfmt: "{{Amt/Ministerium}}",
    afmt: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Name}}, {{Partei}}\n<div style="margin-bottom:20px"></div>\n{{Profil-Photo}}',
  },
  {
    name: "Gesicht zu Amt",
    qfmt: "{{Profil-Photo}}",
    afmt: '{{FrontSide}}\n\n<hr id="answer">\n\n{{Name}}, {{Partei}}<br>\n{{Amt/Ministerium}}',
  },
];

const POLITICIAN_CSS =
  ".card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}\n";

// req[i] = [templateOrd, "all", [fieldOrds]] — a card for that template is only written by
// addNote() when every listed field is non-empty. "Amt zu Person" needs Amt/Ministerium (ord 2),
// "Gesicht zu Amt" needs Profil-Photo (ord 3), so a note without an image produces only the
// "Amt zu Person" card — see #49's "skip on missing/broken image URL" case, which this is
// designed to compose with.
const POLITICIAN_REQ = [
  [0, "all", [2]],
  [1, "all", [3]],
];

// Builds the raw SQL string used to seed a fresh collection database — this is the "SQL
// template" sense of the word, not an Anki card template (that's `templates`/POLITICIAN_TEMPLATES
// below, the qfmt/afmt pairs that become `models[modelId].tmpls`). A generalized version of
// anki-apkg-export's src/template.js: same collection schema boilerplate, but the `models` entry
// takes arbitrary fields/templates/req instead of a hardcoded Front/Back/Card-1 shape.
export const createCollectionSql = ({
  modelId,
  modelName,
  fields,
  templates,
  req,
  css,
}) => {
  const conf = {
    nextPos: 1,
    estTimes: true,
    activeDecks: [1],
    sortType: "noteFld",
    timeLim: 0,
    sortBackwards: false,
    addToCur: true,
    curDeck: 1,
    newBury: true,
    newSpread: 0,
    dueCounts: true,
    curModel: `${modelId}`,
    collapseTime: 1200,
  };

  const models = {
    [modelId]: {
      veArs: [],
      name: modelName,
      tags: [],
      did: 1435588830424,
      usn: -1,
      req,
      flds: fields.map((name, ord) => ({
        name,
        media: [],
        sticky: false,
        rtl: false,
        ord,
        font: "Arial",
        size: 20,
      })),
      sortf: 0,
      latexPre:
        "\\documentclass[12pt]{article}\n\\special{papersize=3in,5in}\n\\usepackage[utf8]{inputenc}\n\\usepackage{amssymb,amsmath}\n\\pagestyle{empty}\n\\setlength{\\parindent}{0in}\n\\begin{document}\n",
      tmpls: templates.map((tmpl, ord) => ({
        name: tmpl.name,
        qfmt: tmpl.qfmt,
        did: null,
        bafmt: "",
        afmt: tmpl.afmt,
        ord,
        bqfmt: "",
      })),
      latexPost: "\\end{document}",
      type: 0,
      id: modelId,
      css,
      mod: 1435645658,
    },
  };

  const decks = {
    1: {
      desc: "",
      name: "Default",
      extendRev: 50,
      usn: 0,
      collapsed: false,
      newToday: [0, 0],
      timeToday: [0, 0],
      dyn: 0,
      extendNew: 10,
      conf: 1,
      revToday: [0, 0],
      lrnToday: [0, 0],
      id: 1,
      mod: 1435645724,
    },
    1435588830424: {
      desc: "",
      name: "Template",
      extendRev: 50,
      usn: -1,
      collapsed: false,
      newToday: [545, 0],
      timeToday: [545, 0],
      dyn: 0,
      extendNew: 10,
      conf: 1,
      revToday: [545, 0],
      lrnToday: [545, 0],
      id: 1435588830424,
      mod: 1435588830,
    },
  };

  const dconf = {
    1: {
      name: "Default",
      replayq: true,
      lapse: {
        leechFails: 8,
        minInt: 1,
        delays: [10],
        leechAction: 0,
        mult: 0,
      },
      rev: {
        perDay: 100,
        fuzz: 0.05,
        ivlFct: 1,
        maxIvl: 36500,
        ease4: 1.3,
        bury: true,
        minSpace: 1,
      },
      timer: 0,
      maxTaken: 60,
      usn: 0,
      new: {
        perDay: 20,
        delays: [1, 10],
        separate: true,
        ints: [1, 4, 7],
        initialFactor: 2500,
        bury: true,
        order: 1,
      },
      mod: 0,
      id: 1,
      autoplay: true,
    },
  };

  return `
    PRAGMA foreign_keys=OFF;
    BEGIN TRANSACTION;
    CREATE TABLE col (
        id              integer primary key,
        crt             integer not null,
        mod             integer not null,
        scm             integer not null,
        ver             integer not null,
        dty             integer not null,
        usn             integer not null,
        ls              integer not null,
        conf            text not null,
        models          text not null,
        decks           text not null,
        dconf           text not null,
        tags            text not null
    );
    INSERT INTO "col" VALUES(
      1,
      1388548800,
      1435645724219,
      1435645724215,
      11,
      0,
      0,
      0,
      '${JSON.stringify(conf)}',
      '${JSON.stringify(models)}',
      '${JSON.stringify(decks)}',
      '${JSON.stringify(dconf)}',
      '{}'
    );
    CREATE TABLE notes (
        id              integer primary key,   /* 0 */
        guid            text not null,         /* 1 */
        mid             integer not null,      /* 2 */
        mod             integer not null,      /* 3 */
        usn             integer not null,      /* 4 */
        tags            text not null,         /* 5 */
        flds            text not null,         /* 6 */
        sfld            integer not null,      /* 7 */
        csum            integer not null,      /* 8 */
        flags           integer not null,      /* 9 */
        data            text not null          /* 10 */
    );
    CREATE TABLE cards (
        id              integer primary key,   /* 0 */
        nid             integer not null,      /* 1 */
        did             integer not null,      /* 2 */
        ord             integer not null,      /* 3 */
        mod             integer not null,      /* 4 */
        usn             integer not null,      /* 5 */
        type            integer not null,      /* 6 */
        queue           integer not null,      /* 7 */
        due             integer not null,      /* 8 */
        ivl             integer not null,      /* 9 */
        factor          integer not null,      /* 10 */
        reps            integer not null,      /* 11 */
        lapses          integer not null,      /* 12 */
        left            integer not null,      /* 13 */
        odue            integer not null,      /* 14 */
        odid            integer not null,      /* 15 */
        flags           integer not null,      /* 16 */
        data            text not null          /* 17 */
    );
    CREATE TABLE revlog (
        id              integer primary key,
        cid             integer not null,
        usn             integer not null,
        ease            integer not null,
        ivl             integer not null,
        lastIvl         integer not null,
        factor          integer not null,
        time            integer not null,
        type            integer not null
    );
    CREATE TABLE graves (
        usn             integer not null,
        oid             integer not null,
        type            integer not null
    );
    ANALYZE sqlite_master;
    INSERT INTO "sqlite_stat1" VALUES('col',NULL,'1');
    CREATE INDEX ix_notes_usn on notes (usn);
    CREATE INDEX ix_cards_usn on cards (usn);
    CREATE INDEX ix_revlog_usn on revlog (usn);
    CREATE INDEX ix_cards_nid on cards (nid);
    CREATE INDEX ix_cards_sched on cards (did, queue, due);
    CREATE INDEX ix_revlog_cid on revlog (cid);
    CREATE INDEX ix_notes_csum on notes (csum);
    COMMIT;
  `;
};

const checksum = (str) => parseInt(sha1(str).substr(0, 8), 16);

// stand-in for Date.now() everywhere this file (and anki-apkg-export's own Exporter
// constructor) would otherwise seed ids/mod timestamps from wall-clock time — deriving
// it from note/deck content instead means re-exporting the same JSON produces a
// byte-identical .apkg on every machine/run, which is what the checked-in
// output/**/*.apkg files and the CI "diff against checked-in output" step assume. See
// issue #65: that CI check failed on every run, even absent real content changes,
// because these ids/timestamps used to be Date.now()-based and so differed run to run.
const deterministicTimestamp = (seed) =>
  parseInt(sha1(`ts:${seed}`).substr(0, 12), 16);

const getId = (db, table, col, ts) => {
  const query = `SELECT ${col} from ${table} WHERE ${col} >= :ts ORDER BY ${col} DESC LIMIT 1`;
  const stmt = db.prepare(query);
  const rowObj = stmt.getAsObject({ ":ts": ts });
  stmt.free();
  return rowObj[col] ? +rowObj[col] + 1 : ts;
};

const getNoteId = (db, guid, ts) => {
  const query = `SELECT id from notes WHERE guid = :guid ORDER BY id DESC LIMIT 1`;
  const stmt = db.prepare(query);
  const rowObj = stmt.getAsObject({ ":guid": guid });
  stmt.free();
  return rowObj.id || getId(db, "notes", "id", ts);
};

// scoped to (noteId, ord), not just noteId — a note can have more than one card here (unlike
// exporter.js's single-card-per-note original), so looking up by noteId alone would make the
// second card's "insert or replace" collide with and overwrite the first
const getCardId = (db, noteId, ord, ts) => {
  const query = `SELECT id from cards WHERE nid = :note_id AND ord = :ord ORDER BY id DESC LIMIT 1`;
  const stmt = db.prepare(query);
  const rowObj = stmt.getAsObject({ ":note_id": noteId, ":ord": ord });
  stmt.free();
  return rowObj.id || getId(db, "cards", "id", ts);
};

// builds an Exporter (from anki-apkg-export's raw, un-hardcoded constructor) wired up with the
// Deutschland:Politiker model, and re-keys the model back onto a fixed id/name — left alone,
// Exporter's constructor unconditionally re-keys the model under a fresh per-run id and renames
// it to the deck name, which would make every deck (Landesregierungen, Bundesregierung,
// Ministerpräsidenten, ...) import as a differently-named, differently-id'd note type instead of
// one shared, reusable one.
export const makeMultiFieldExporter = (deckName) => {
  const collectionSql = createCollectionSql({
    modelId: POLITICIAN_MODEL_ID,
    modelName: POLITICIAN_MODEL_NAME,
    fields: POLITICIAN_FIELDS,
    templates: POLITICIAN_TEMPLATES,
    req: POLITICIAN_REQ,
    css: POLITICIAN_CSS,
  });

  // `template` here is `Exporter`'s own option name (see anki-apkg-export/src/exporter.js) for
  // what it expects to be a SQL string, not an Anki card template — named explicitly rather than
  // via `{ collectionSql, sql }` shorthand so that distinction stays visible at the call site.
  const exporter = new Exporter(deckName, { template: collectionSql, sql });

  // Same re-keying, but for the deck id: left alone, Exporter's constructor sets
  // topDeckId from Date.now() too, which — unlike topModelId below — was never
  // re-keyed anywhere, so it (and every card's `did` column) changed on every run.
  // Deriving it from deckName instead keeps it both deterministic *and* distinct per
  // deck (Landesregierungen, Bundesregierung, Ministerpräsidenten, ... each get their
  // own stable id, rather than sharing POLITICIAN_MODEL_ID's single constant).
  const deterministicDeckId = deterministicTimestamp(`deck:${deckName}`);
  const decks = JSON.parse(
    exporter.db.exec("select decks from col")[0].values[0][0],
  );
  const deck = decks[exporter.topDeckId];
  delete decks[exporter.topDeckId];
  deck.id = deterministicDeckId;
  decks[deterministicDeckId] = deck;
  exporter.db
    .prepare("update col set decks=:decks where id=1")
    .getAsObject({ ":decks": JSON.stringify(decks) });

  const models = JSON.parse(
    exporter.db.exec("select models from col")[0].values[0][0],
  );
  const model = models[exporter.topModelId];
  delete models[exporter.topModelId];
  model.id = POLITICIAN_MODEL_ID;
  model.name = POLITICIAN_MODEL_NAME;
  // the constructor also stamped the model's own `did` with its (non-deterministic)
  // topDeckId before we got a chance to re-key it above — needs the same fix, or this
  // field alone still makes every export differ from the last
  model.did = deterministicDeckId;
  models[POLITICIAN_MODEL_ID] = model;
  exporter.db
    .prepare("update col set models=:models where id=1")
    .getAsObject({ ":models": JSON.stringify(models) });
  exporter.topModelId = POLITICIAN_MODEL_ID;
  exporter.topDeckId = deterministicDeckId;

  return exporter;
};

// writes one note with `fieldValues.length` fields (in POLITICIAN_FIELDS order) directly into
// exporter.db, generating one card per POLITICIAN_REQ entry whose required fields are all
// non-empty — mirrors Exporter#addCard's insert logic (see anki-apkg-export/src/exporter.js),
// generalized from exactly-one-card-per-note to the req-driven multi-card case
export const addNote = (exporter, fieldValues, { tags = [] } = {}) => {
  const { db, topDeckId, topModelId } = exporter;
  const flds = fieldValues.join(SEPARATOR);
  const sfld = fieldValues[0];
  const guid = sha1(`${topDeckId}${flds}`);
  // see deterministicTimestamp above — content-derived instead of Date.now(), so id/mod
  // collisions (and their resolution order via getId's "next free id >= ts" query) stay
  // reproducible across runs instead of depending on wall-clock time
  const now = deterministicTimestamp(guid);
  const noteId = getNoteId(db, guid, now);
  const strTags =
    tags.length > 0
      ? ` ${tags.map((t) => t.replace(/ /g, "_")).join(" ")} `
      : "";

  const insertNoteStmt = db.prepare(
    "insert or replace into notes values(:id,:guid,:mid,:mod,:usn,:tags,:flds,:sfld,:csum,:flags,:data)",
  );
  insertNoteStmt.getAsObject({
    ":id": noteId,
    ":guid": guid,
    ":mid": topModelId,
    ":mod": getId(db, "notes", "mod", now),
    ":usn": -1,
    ":tags": strTags,
    ":flds": flds,
    ":sfld": sfld,
    ":csum": checksum(flds),
    ":flags": 0,
    ":data": "",
  });
  insertNoteStmt.free();

  POLITICIAN_REQ.forEach(([ord, , requiredFieldOrds]) => {
    const hasAllRequiredFields = requiredFieldOrds.every(
      (fieldOrd) => (fieldValues[fieldOrd] ?? "").trim() !== "",
    );
    if (!hasAllRequiredFields) return;

    const insertCardStmt = db.prepare(
      "insert or replace into cards values(:id,:nid,:did,:ord,:mod,:usn,:type,:queue,:due,:ivl,:factor,:reps,:lapses,:left,:odue,:odid,:flags,:data)",
    );
    insertCardStmt.getAsObject({
      ":id": getCardId(db, noteId, ord, now + ord),
      ":nid": noteId,
      ":did": topDeckId,
      ":ord": ord,
      ":mod": getId(db, "cards", "mod", now),
      ":usn": -1,
      ":type": 0,
      ":queue": 0,
      ":due": 179,
      ":ivl": 0,
      ":factor": 0,
      ":reps": 0,
      ":lapses": 0,
      ":left": 0,
      ":odue": 0,
      ":odid": 0,
      ":flags": 0,
      ":data": "",
    });
    insertCardStmt.free();
  });
};

// Replaces exporter.save() (see anki-apkg-export/src/exporter.js): same collection.anki2 +
// media + per-media-file zip layout, but with every zip entry's date pinned instead of
// defaulting to `new Date()` at call time. JSZip embeds that date in each entry's local
// file header, so even once notes/cards/decks are all deterministic (see
// deterministicTimestamp above), the zip container itself still came out byte-different
// on every run — reproduced locally on 2026-07-24 while investigating issue #65: two
// exports of the same JSON, seconds apart, differed starting at byte 11, right where a
// zip local file header's mod-time field lives.
const ZIP_ENTRY_DATE = new Date(0);

export const save = (exporter) => {
  const { db, media } = exporter;
  const binaryArray = db.export();
  const mediaObj = media.reduce((prev, curr, idx) => {
    prev[idx] = curr.filename;
    return prev;
  }, {});

  const zip = new Zip();
  zip.file("collection.anki2", Buffer.from(binaryArray), {
    date: ZIP_ENTRY_DATE,
  });
  zip.file("media", JSON.stringify(mediaObj), { date: ZIP_ENTRY_DATE });
  media.forEach(({ data }, i) =>
    zip.file(`${i}`, data, { date: ZIP_ENTRY_DATE }),
  );

  return zip.generateAsync({
    type: "nodebuffer",
    base64: false,
    compression: "DEFLATE",
  });
};
