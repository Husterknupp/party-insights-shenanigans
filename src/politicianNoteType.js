// The "Deutschland:Politiker" note type: four fields and two card templates, which is more than
// anki-apkg-export's built-in Front/Back factory offers. Since v5 the library accepts a custom
// model (`ExportOptions.model`, see its docs/api.md), so everything here goes through its public
// API; see #86 for the port away from the raw v4 `Exporter` + hand-written SQL.
import { AnkiExport } from "anki-apkg-export";

// Anki's field separator is U+001F; the library rejects it inside field values, so joining on it
// cannot make two different field lists collide.
const SEPARATOR = "\u001f";

// fixed so the same note type re-imports as one shared model across independently-generated
// decks (Landesregierungen, Bundesregierung, Ministerpräsidenten, ...)
export const POLITICIAN_MODEL_ID = 1500000000001;
export const POLITICIAN_MODEL_NAME = "Deutschland:Politiker";

// field order matters: it's also the order values are passed to `addNote` below
export const POLITICIAN_FIELDS = [
  "Name",
  "Partei",
  "Amt/Ministerium",
  "Profil-Photo",
];

// the one field deliberately left out of a note's identity — see `noteIdentity` below
const PROFILE_PHOTO_ORD = POLITICIAN_FIELDS.indexOf("Profil-Photo");

// A card is only written when every field in `requiredFields` is non-empty: "Amt zu Person" needs
// Amt/Ministerium, "Gesicht zu Amt" needs Profil-Photo, so a note without an image produces only
// the "Amt zu Person" card — see #49's "skip on missing/broken image URL" case, which this is
// designed to compose with.
export const POLITICIAN_MODEL = {
  id: POLITICIAN_MODEL_ID,
  name: POLITICIAN_MODEL_NAME,
  fields: POLITICIAN_FIELDS,
  templates: [
    {
      name: "Amt zu Person",
      questionFormat: "{{Amt/Ministerium}}",
      answerFormat:
        '{{FrontSide}}\n\n<hr id="answer">\n\n{{Name}}, {{Partei}}\n<div style="margin-bottom:20px"></div>\n{{Profil-Photo}}',
      requiredFields: ["Amt/Ministerium"],
    },
    {
      name: "Gesicht zu Amt",
      questionFormat: "{{Profil-Photo}}",
      answerFormat:
        '{{FrontSide}}\n\n<hr id="answer">\n\n{{Name}}, {{Partei}}<br>\n{{Amt/Ministerium}}',
      requiredFields: ["Profil-Photo"],
    },
  ],
  css: ".card {\n  font-family: arial;\n  font-size: 20px;\n  text-align: center;\n  color: black;\n  background-color: white;\n}\n",
};

// A note's GUID is its identity to Anki, and the only lever we have over what an import does with
// it. On import, a GUID already present in the target collection has its note's fields overwritten
// in place while its cards — interval, due date, review log — are left untouched; an unseen GUID
// becomes a new note whose cards enter the new queue. That overwrite is conditional, though: the
// default import rule is `UpdateCondition::IfNewer`, which writes the incoming fields only when
// their note's `mod` is strictly greater than the one already in the collection — the library
// stamps every note with the current epoch seconds, which leaves every later export newer than
// every earlier one. There is no third option: the .apkg format cannot say "keep the scheduling
// but ask me again". So what goes into the key below decides, per field, whether a change silently
// rewrites a card the user may not be shown again for months, or is put back in front of them.
//
// The library derives the GUID from this key plus its deck and model ids, and the deck id from the
// deck name. Hence every field except the photo: a new minister, a party switch or a renamed
// ministry all change the answer being learned, so they must be re-learned: new GUID, new note,
// asked at once. A swapped profile picture does not, so it updates in place and the user's
// progress survives. The same politician in two decks (Ministerpräsidenten and their own
// Landesregierung) is two separate notes, because the deck differs.
//
// What must *not* go in is anything that moves on its own. The photo field holds
// `<img src="<array index>.<ext>">` and so changes whenever an unrelated politician is inserted
// above this one; without an explicit key the library would hash all fields, photo included, and
// fork every note again — the duplicate-everything bug of #71.
export const noteIdentity = (fieldValues) =>
  fieldValues.filter((_, ord) => ord !== PROFILE_PHOTO_ORD).join(SEPARATOR);

// The exporter owns a WASM database: the caller must `close()` it when done.
export const makeExporter = (deckName) =>
  AnkiExport.create(deckName, { model: POLITICIAN_MODEL });

// writes one note with the four POLITICIAN_FIELDS values (in that order); the library generates
// one card per template whose required fields are non-empty
export const addNote = (exporter, fieldValues, { tags = [] } = {}) => {
  exporter.addNote(fieldValues, { noteId: noteIdentity(fieldValues), tags });
};
