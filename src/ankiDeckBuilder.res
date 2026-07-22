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
            amt: ?(fields->Dict.get("amt")->Option.flatMap(JSON.Decode.string)),
            state: ?(fields->Dict.get("state")->Option.flatMap(JSON.Decode.string)),
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
            urlCabinet: ?(fields->Dict.get("urlCabinet")->Option.flatMap(JSON.Decode.string)),
          }: OutputHelpers.politician
        )

      | None => Error.panic(`Error deserializing single politician object from ${fileName}`)
      }
    })
  | None => Error.panic(`Error deserializing politicians array from ${fileName}`)
  }
}

// [Name, Partei, Amt/Ministerium, Profil-Photo] — matches POLITICIAN_FIELDS' order
// (politicianNoteTypeSql.js); Profil-Photo is left blank here and filled in by the caller
// once the image (if any) has been downloaded, since that happens async and per-index in
// exportJsonFileToApkg below
let fieldsFor = (politician: OutputHelpers.politician): array<string> => {
  let amtOrState = switch (politician.amt, politician.state) {
  | (Some(amt), _) => amt
  | (None, Some(state)) => state
  | (None, None) =>
    Error.panic(
      `Politician must have either 'amt' or 'state' for the Amt/Ministerium field, but got: ${JSON.stringifyAny(
          politician,
        )->Option.getExn}`,
    )
  }
  [politician.name, politician.party, amtOrState, ""]
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

let _downloadImage = async (imageUrl: string): ApkgWriterFacade.mediaData => {
  let response: Axios.response<ApkgWriterFacade.mediaData> = await Axios.get(imageUrl, Some(_imageConfig))
  response.data
}

// filename is index-based (not name-based) so it stays unique even for duplicate names
let _downloadMediaFor = async (politician: OutputHelpers.politician, index: int): option<(
  string,
  ApkgWriterFacade.mediaData,
)> => {
  if !OutputHelpers.hasValidImageUrl(politician) {
    Console.log(`⚠️  Skipping missing image for ${politician.name}`)
    None
  } else {
    let data = await _downloadImage(politician.imageUrl)
    Some((`${index->Int.toString}.${_fileExtensionFor(politician.imageUrl)}`, data))
  }
}

let _sleep = (ms: int): promise<unit> => {
  Promise.make((resolve, _reject) => {
    let _ = setTimeout(() => resolve(), ms)
  })
}

// Sequential with a delay, not Promise.all: a deck's politicians can number in the
// dozens (a state cabinet, the Bundesregierung), and firing every image request at
// once against Wikimedia reliably comes back 429 Too Many Requests once real decks
// (not just single-politician test fixtures) are exported — reproduced live on
// 2026-07-22 while wiring this into npm start (index.js), which exports 18 files in
// one run. Same delay-between-requests approach already used for the sequential image
// download in ministerpraesidenten.js, for the same reason.
//
// The delay only runs after an actual download (Some(...)) — a politician with no/an
// invalid image URL (None, see _downloadMediaFor) never hit Wikimedia, so throttling
// that case too would slow down exports for no reason.
let rec _downloadAllMediaSequentially = async (
  politicians: array<OutputHelpers.politician>,
  index: int,
): array<option<(string, ApkgWriterFacade.mediaData)>> => {
  if index >= politicians->Array.length {
    []
  } else {
    let media = await _downloadMediaFor(politicians->Array.getUnsafe(index), index)
    switch media {
    | Some(_) => await _sleep(1000)
    | None => ()
    }
    let rest = await _downloadAllMediaSequentially(politicians, index + 1)
    [media]->Array.concat(rest)
  }
}

let exportJsonFileToApkg = async (jsonFilePath, outputFilePath, deckName) => {
  let politicians = deserializePoliticians(jsonFilePath)
  let deck = ApkgWriterFacade.makeMultiFieldExporter(deckName)

  let media = await _downloadAllMediaSequentially(politicians, 0)

  politicians->Array.forEachWithIndex((politician, index) => {
    let fields = fieldsFor(politician)
    let fields = switch media->Array.get(index)->Option.flatMap(x => x) {
    | Some((filename, data)) =>
      ApkgWriterFacade.addMedia(deck, filename, data)
      fields->Array.mapWithIndex((field, fieldIndex) =>
        fieldIndex == 3 ? `<img src="${filename}">` : field
      )
    | None => fields
    }
    ApkgWriterFacade.addNote(deck, fields)
  })

  let data = await ApkgWriterFacade.save(deck)
  ApkgWriterFacade.writeFileSync(outputFilePath, data)
  Console.log(`Wrote ${politicians->Array.length->Int.toString} notes to ${outputFilePath}`)
}
