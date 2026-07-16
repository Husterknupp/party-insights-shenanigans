type exporter
type apkgData

@module("./ankiApkgExportCjs.js") external make: string => exporter = "default"
@send external addCard: (exporter, string, string) => unit = "addCard"
@send external save: exporter => Promise.t<apkgData> = "save"

@module("node:fs") external writeFileSync: (string, apkgData) => unit = "writeFileSync"
