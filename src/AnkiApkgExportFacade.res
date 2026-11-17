type exporter
type apkgData
// binary payload for a media file; in practice the Buffer axios hands back from an image download
type mediaData

// shapes of anki-apkg-export v5's `ModelDefinition` and `CardTemplate` (see its docs/api.md)
type cardTemplate = {
  name: string,
  questionFormat: string,
  answerFormat: string,
  // a card is only written when all of these fields are non-empty
  requiredFields: array<string>,
}
type model = {
  // Anki ids are epoch-millisecond sized, beyond ReScript's 32-bit int
  id: float,
  name: string,
  fields: array<string>,
  templates: array<cardTemplate>,
  css: string,
}
type createOptions = {model: model}
type noteOptions = {noteId: string, tags: array<string>}

// The exporter owns a WASM database, so every `create` needs a matching `close`.
@module("anki-apkg-export") @scope("AnkiExport")
external create: (string, createOptions) => Promise.t<exporter> = "create"

@send external addNote: (exporter, array<string>, noteOptions) => unit = "addNote"
@send external addMedia: (exporter, string, mediaData) => unit = "addMedia"
@send external save: exporter => Promise.t<apkgData> = "save"
@send external close: exporter => unit = "close"

@module("node:fs") external writeFileSync: (string, apkgData) => unit = "writeFileSync"
