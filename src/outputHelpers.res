module NodeJs = {
  type writeFileOptions = {
    mode?: int,
    flag?: string,
    encoding?: string,
  }

  @module("node:fs")
  external writeFileSyncWith: (string, string, writeFileOptions) => unit = "writeFileSync"

  @module("node:fs")
  external readFileSync: (string, writeFileOptions) => string = "readFileSync"
}

// mix of BUNDESREGIERUNG, MINISTERPRÄSIDENTEN, and LANDESREGIERUNGEN
type politician = {
  amt?: string /* missing for MINISTERPRÄSIDENTEN */,
  name: string,
  imageUrl: string,
  party: string,
  urlCabinet?: string /* has only MINISTERPRÄSIDENTEN */,
  state?: string /* has only MINISTERPRÄSIDENTEN */,
}

let writeAsJson = (fileName: string, output: array<politician>, ~writeFileSyncWith=?) => {
  let json = JSON.stringifyAny(output, ~space=2)->Belt.Option.getExn
  switch writeFileSyncWith {
  | Some(writeFileSyncWith) => writeFileSyncWith(fileName, json ++ "\n", {"encoding": "utf-8"})
  | None => NodeJs.writeFileSyncWith(fileName, json ++ "\n", {encoding: "utf-8"})
  }
}

// Two known placeholder filenames are matched by name (kept for the existing
// "replace_this_image.jpg"-style fixtures/tests that predate real .svg URLs).
// On top of that, Wikipedia's generic "no photo available" icons are always
// .svg uploads (Silver_-_replace_this_image_*.svg, Placeholder_staff_photo.svg,
// Keinfoto.svg, ...) — real candid photos are never .svg — so filtering by
// source file type catches every such icon in one check instead of chasing
// each new filename individually (see ImageUrl.res's normalizeWikiImageUrl,
// which keeps ".svg" in both path segments of the normalized URL for any .svg
// source, e.g. ".../Keinfoto.svg/500px-Keinfoto.svg.png").
let hasValidImageUrl = (minister: politician) => {
  minister.imageUrl != "" &&
  !(minister.imageUrl->String.includes("replace_this_image")) &&
  !(minister.imageUrl->String.includes("Placeholder")) &&
  !(minister.imageUrl->String.includes(".svg"))
}

let formatImageUrl = (minister: politician) => {
  if hasValidImageUrl(minister) {
    `![${minister.name}](${minister.imageUrl})`
  } else {
    "*Kein Bild verfügbar*"
  }
}

let writeAsMarkdown = (
  fileName: string,
  title: string,
  data: array<politician>,
  ~writeFileSyncWith=?,
) => {
  let formatted =
    `# ${title}\n` ++
    data
    ->Array.map(minister => {
      let heading: string = switch (minister.state, minister.amt) {
      | (Some(state), None) => `${state}:`
      | (None, Some(amt)) => `${amt}:`
      | _ =>
        Error.panic(
          `Politician must have either state or amt (and only one, not both), but got: ${JSON.stringifyAny(
              minister,
            )->Option.getExn}`,
        )
      }
      let maybeCabinet: string = switch minister.urlCabinet {
      | Some(urlCabinet) => `* Kabinett: ${urlCabinet}\n`
      | None => ""
      }

      `
${heading}
* Name: ${minister.name}
* Partei: ${minister.party}
${maybeCabinet}* Profilbild: ${formatImageUrl(minister)}
`
    })
    ->Array.join("")

  switch writeFileSyncWith {
  | Some(writeFileSyncWith) => writeFileSyncWith(fileName, formatted, {"encoding": "utf-8"})
  | None => NodeJs.writeFileSyncWith(fileName, formatted, {encoding: "utf-8"})
  }
}
