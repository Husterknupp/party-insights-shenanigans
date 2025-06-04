module NodeJs = {
  type writeFileOptions = {
    mode?: int,
    flag?: string,
    encoding?: string,
  }

  @val @module("node:fs")
  external writeFileSyncWith: (string, string, writeFileOptions) => unit = "writeFileSync"
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

let formatImageUrl = (minister: politician) => {
  if (
    minister.imageUrl == "" ||
    minister.imageUrl->String.includes("replace_this_image") ||
    minister.imageUrl->String.includes("Placeholder")
  ) {
    "*Kein Bild verfügbar*"
  } else {
    `![${minister.name}](${minister.imageUrl})`
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
