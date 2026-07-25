type exporter
type apkgData
// binary payload for a media file; in practice the Buffer axios hands back from an image download
type mediaData

// four-field, two-template "Deutschland:Politiker" note type — see politicianNoteTypeSql.js
// for why this can't go through anki-apkg-export's own two-field/one-template factory and
// has to build the exporter via its raw Exporter class instead
@module("./politicianNoteTypeSql.js")
external makeMultiFieldExporter: string => exporter = "makeMultiFieldExporter"
@module("./politicianNoteTypeSql.js")
external addNote: (exporter, array<string>) => unit = "addNote"

@send external addMedia: (exporter, string, mediaData) => unit = "addMedia"
@send external save: exporter => Promise.t<apkgData> = "save"

@module("node:fs") external writeFileSync: (string, apkgData) => unit = "writeFileSync"
