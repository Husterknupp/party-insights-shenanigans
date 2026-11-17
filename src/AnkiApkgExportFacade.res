type exporter
type apkgData
// binary payload for a media file; in practice the Buffer axios hands back from an image download
type mediaData

// four-field, two-template "Deutschland:Politiker" note type — see politicianNoteType.js.
// The exporter owns a WASM database, so every `makeExporter` needs a matching `close`.
@module("./politicianNoteType.js")
external makeExporter: string => Promise.t<exporter> = "makeExporter"
@module("./politicianNoteType.js")
external addNote: (exporter, array<string>) => unit = "addNote"

@send external addMedia: (exporter, string, mediaData) => unit = "addMedia"
@send external save: exporter => Promise.t<apkgData> = "save"
@send external close: exporter => unit = "close"

@module("node:fs") external writeFileSync: (string, apkgData) => unit = "writeFileSync"
