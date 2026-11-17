type exporter
type apkgData
// binary payload for a media file; in practice the Buffer axios hands back from an image download
type mediaData

module Library = {
  type createOptions = {model: PoliticianNoteType.model}
  type noteOptions = {noteId: string, tags: array<string>}

  @module("anki-apkg-export") @scope("AnkiExport")
  external create: (string, createOptions) => Promise.t<exporter> = "create"
  @send external addNote: (exporter, array<string>, noteOptions) => unit = "addNote"
}

// The exporter owns a WASM database, so every `makeExporter` needs a matching `close`.
let makeExporter = (deckName: string) =>
  Library.create(deckName, {model: PoliticianNoteType.model})

// `fieldValues` in the order of `PoliticianNoteType.fields`
let addNote = (exporter: exporter, fieldValues: array<string>) =>
  Library.addNote(
    exporter,
    fieldValues,
    {noteId: PoliticianNoteType.noteIdentity(fieldValues), tags: []},
  )

@send external addMedia: (exporter, string, mediaData) => unit = "addMedia"
@send external save: exporter => Promise.t<apkgData> = "save"
@send external close: exporter => unit = "close"

@module("node:fs") external writeFileSync: (string, apkgData) => unit = "writeFileSync"
