type exporter
type apkgData
// binary payload for a media file; in practice the Buffer axios hands back from an image download
type mediaData

@new @module("./ankiApkgExportCjs.js") external make: string => exporter = "default"
@send external addCard: (exporter, string, string) => unit = "addCard"
@send external addMedia: (exporter, string, mediaData) => unit = "addMedia"
@send external save: exporter => Promise.t<apkgData> = "save"

@module("node:fs") external writeFileSync: (string, apkgData) => unit = "writeFileSync"
