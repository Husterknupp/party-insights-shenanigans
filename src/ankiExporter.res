// walking skeleton for issue #48: JSON output -> two-field Anki deck (no images yet)
// Reuses OutputHelpers.politician (src/outputHelpers.res) rather than a duplicate type,
// since that's the exact type all three sources (Ministerpräsidenten, Bundesregierung,
// Landesregierungen) already serialize through when writing these JSON files.
let deserializePoliticians = (fileName): array<OutputHelpers.politician> => {
  let json = OutputHelpers.NodeJs.readFileSync(fileName, {encoding: "utf-8"})->JSON.parseExn
  switch JSON.Decode.array(json) {
  | Some(entries) =>
    entries->Array.map(jsonObject => {
      switch JSON.Decode.object(jsonObject) {
      | Some(fields) =>
        (
          {
            amt: ?fields->Dict.get("amt")->Option.flatMap(JSON.Decode.string),
            state: ?fields->Dict.get("state")->Option.flatMap(JSON.Decode.string),
            name: fields
            ->Dict.get("name")
            ->Option.getExn(~message="name field missing")
            ->JSON.Decode.string
            ->Option.getExn(~message="name field expected to be a string"),
            party: fields
            ->Dict.get("party")
            ->Option.getExn(~message="party field missing")
            ->JSON.Decode.string
            ->Option.getExn(~message="party field expected to be a string"),
            imageUrl: fields
            ->Dict.get("imageUrl")
            ->Option.getExn(~message="imageUrl field missing")
            ->JSON.Decode.string
            ->Option.getExn(~message="imageUrl field expected to be a string"),
            urlCabinet: ?fields->Dict.get("urlCabinet")->Option.flatMap(JSON.Decode.string),
          }: OutputHelpers.politician
        )

      | None => Error.panic(`Error deserializing single politician object from ${fileName}`)
      }
    })
  | None => Error.panic(`Error deserializing politicians array from ${fileName}`)
  }
}

// Front: amt (or state, for output files that use that field instead) / Back: name + party
let cardFieldsFor = (politician: OutputHelpers.politician) => {
  let front = switch (politician.amt, politician.state) {
  | (Some(amt), _) => amt
  | (None, Some(state)) => state
  | (None, None) =>
    Error.panic(
      `Politician must have either 'amt' or 'state' to use as card front, but got: ${JSON.stringifyAny(
          politician,
        )->Option.getExn}`,
    )
  }
  (front, `${politician.name} (${politician.party})`)
}

// only the extensions Anki reliably renders inline; anything else falls back to jpg
let _fileExtensionFor = (imageUrl: string): string => {
  let withoutHash = imageUrl->String.split("#")->Array.get(0)->Option.getOr(imageUrl)
  let withoutQuery = withoutHash->String.split("?")->Array.get(0)->Option.getOr(withoutHash)
  switch withoutQuery->String.lastIndexOf(".") {
  | -1 => "jpg"
  | lastDot =>
    switch withoutQuery->String.sliceToEnd(~start=lastDot + 1)->String.toLowerCase {
    | ("jpg" | "jpeg" | "png" | "gif" | "webp") as ext => ext
    | _ => "jpg"
    }
  }
}

// a missing imageUrl is an expected, optional field and stays a soft skip (see
// _downloadMediaFor below) — but a valid URL that fails to download points at a real bug
// (e.g. the hardcoded-thumbnail-width issue), so that propagates and aborts the export
// instead of silently shipping a deck with missing images
let _imageConfig: Axios.axiosRequestConfig = {
  headers: Axios.defaultConfig.headers,
  responseType: "arraybuffer",
}

let _downloadImage = async (imageUrl: string): AnkiExport.mediaData => {
  let response: Axios.response<AnkiExport.mediaData> = await Axios.get(
    imageUrl,
    Some(_imageConfig),
  )
  response.data
}

// filename is index-based (not name-based) so it stays unique even for duplicate names
let _downloadMediaFor = async (politician: OutputHelpers.politician, index: int): option<(
  string,
  AnkiExport.mediaData,
)> => {
  if !OutputHelpers.hasValidImageUrl(politician) {
    Console.log(`⚠️  Skipping missing image for ${politician.name}`)
    None
  } else {
    let data = await _downloadImage(politician.imageUrl)
    Some((`${index->Int.toString}.${_fileExtensionFor(politician.imageUrl)}`, data))
  }
}

let exportJsonFileToApkg = async (jsonFilePath, outputFilePath, deckName) => {
  let politicians = deserializePoliticians(jsonFilePath)
  let deck = AnkiExport.make(deckName)

  let media = await Promise.all(
    politicians->Array.mapWithIndex((politician, index) => _downloadMediaFor(politician, index)),
  )

  politicians->Array.forEachWithIndex((politician, index) => {
    let (front, back) = cardFieldsFor(politician)
    let back = switch media->Array.get(index)->Option.flatMap(x => x) {
    | Some((filename, data)) =>
      AnkiExport.addMedia(deck, filename, data)
      `${back}<br><img src="${filename}">`
    | None => back
    }
    AnkiExport.addCard(deck, front, back)
  })

  let data = await AnkiExport.save(deck)
  AnkiExport.writeFileSync(outputFilePath, data)
  Console.log(`Wrote ${politicians->Array.length->Int.toString} cards to ${outputFilePath}`)
}
