// The "Deutschland:Politiker" note type: four fields, two card templates.

type cardTemplate = {
  name: string,
  questionFormat: string,
  answerFormat: string,
  // a card is only written when all of these fields are non-empty
  requiredFields: array<string>,
}
type model = {
  // Anki ids are too big for ReScript's 32-bit int
  id: float,
  name: string,
  fields: array<string>,
  templates: array<cardTemplate>,
  css: string,
}

// fixed, so every deck imports as the same note type
let modelId = 1500000000001.
let modelName = "Deutschland:Politiker"

// order matters: it's the order of the values passed to `addNote`
let fields = ["Name", "Partei", "Amt/Ministerium", "Profil-Photo"]

let profilePhotoOrd = fields->Array.indexOf("Profil-Photo")

// "Gesicht zu Amt" needs the photo, so a politician without one only gets "Amt zu Person" (#49)
let model: model = {
  id: modelId,
  name: modelName,
  fields,
  templates: [
    {
      name: "Amt zu Person",
      questionFormat: "{{Amt/Ministerium}}",
      answerFormat: `{{FrontSide}}

<hr id="answer">

{{Name}}, {{Partei}}
<div style="margin-bottom:20px"></div>
{{Profil-Photo}}`,
      requiredFields: ["Amt/Ministerium"],
    },
    {
      name: "Gesicht zu Amt",
      questionFormat: "{{Profil-Photo}}",
      answerFormat: `{{FrontSide}}

<hr id="answer">

{{Name}}, {{Partei}}<br>
{{Amt/Ministerium}}`,
      requiredFields: ["Profil-Photo"],
    },
  ],
  css: `.card {
  font-family: arial;
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
}
`,
}

// Anki's field separator; the library rejects it inside field values, so joins can't collide
let fieldSeparator = String.fromCharCode(31)

// What the library turns into the note's GUID, i.e. how an import recognizes a note: every field
// except the photo. A new person, party or ministry is a new note to learn; a new photo, or an
// image index shifted by an unrelated politician, updates the note in place. Don't add anything
// that changes on its own, or every re-import duplicates the deck (#71).
let noteIdentity = (fieldValues: array<string>): string =>
  fieldValues
  ->Array.filterWithIndex((_, ord) => ord != profilePhotoOrd)
  ->Array.join(fieldSeparator)
