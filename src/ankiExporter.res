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

let exportJsonFileToApkg = async (jsonFilePath, outputFilePath, deckName) => {
  let politicians = deserializePoliticians(jsonFilePath)
  let deck = AnkiExport.make(deckName)
  politicians->Array.forEach(politician => {
    let (front, back) = cardFieldsFor(politician)
    AnkiExport.addCard(deck, front, back)
  })
  let data = await AnkiExport.save(deck)
  AnkiExport.writeFileSync(outputFilePath, data)
  Console.log(`Wrote ${politicians->Array.length->Int.toString} cards to ${outputFilePath}`)
}
