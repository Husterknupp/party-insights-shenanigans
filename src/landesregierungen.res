// Alias because I'm lazy
type tableCell = TableWalker.tableCell

let sameRow = (cellA: tableCell, cellB: tableCell) => {
  (cellB.rowStart <= cellA.rowStart && cellA.rowStart <= cellB.rowEnd) ||
    (cellB.rowStart <= cellA.rowEnd && cellA.rowEnd <= cellB.rowEnd)
}

type politician = {
  mutable amt: string,
  name: string,
  imageUrl: string,
  party: string,
}

let createPoliticianAndAddToList = (
  amt: tableCell,
  politicianName: tableCell,
  party: tableCell,
  imageUrl: tableCell,
  result: array<politician>,
) => {
  let sameName =
    result->Array.find(minister => politicianName.linesOfText->Array.includes(minister.name))

  switch sameName {
  | Some(sameName) => {
      let subTitle = sameName.amt
      sameName.amt = `${amt.linesOfText->Array.join(", ")} (gleichzeitig: ${subTitle})`
    }
  | None => {
      let message = `Cannot create politician object for name ${JSON.stringifyAny(
          politicianName,
        )->Option.getExn}`

      let newPolitician = {
        amt: Array.join(amt.linesOfText, ", "),
        name: politicianName.linesOfText[
          Array.length(politicianName.linesOfText) - 1
        ]->Option.getExn(~message),
        imageUrl: imageUrl.imageUrl->Option.getExn(~message),
        party: party.linesOfText[0]->Option.getExn(~message),
      }

      result->Array.push(newPolitician)
    }
  }
}

let isColumnHeaderLike = (cell: tableCell, searchStrings: array<string>) => {
  searchStrings->Array.some(searchString => {
    let lowerSearchString = String.toLowerCase(searchString)
    let lowerHeader = String.toLowerCase(cell.header)
    String.includes(lowerHeader, lowerSearchString)
  })
}

/**
  Returns all cells of the first column that has a header like one of the
   search strings.
  
  If no such column exists, an empty array is returned.
  
  Rationale: There might be two columns of the same header.
   Eg, tables often have more than one "name" column.
 */
let getAllCellsOfFirstColumnWithHeaderLike = (
  cells: array<tableCell>,
  searchStrings: array<string>,
) => {
  let relevantCells = cells->Array.filter(cell => isColumnHeaderLike(cell, searchStrings))

  if relevantCells->Array.length > 0 {
    let firstColumnWithThatName =
      relevantCells
      ->Array.toSorted((cellA: tableCell, cellB: tableCell) =>
        0. -. Float.fromInt(cellB.colStart - cellA.colStart)
      )
      ->Array.get(0)
      ->Option.getExn(
        ~message="There should always be at least one cell with the given header. Search strings: " ++
        searchStrings->Array.join(", "),
      )
    relevantCells->Array.filter(cell => cell.colStart === firstColumnWithThatName.colStart)
  } else {
    []
  }
}

/**
  Returns the last cell of the first column that has a header like one of the
   search strings.

  If no such column exists, `Option.None` is returned.

  Rationale:
  1) There might be two columns of the same header.
   Eg, tables often have more than one "name" column. 
  2) During one term of office more than one person can have the Ministerial position.
   Wikipedia puts all those persons in one row, the latest person at the bottom of a row.
 */
let getLastCellOfFirstColumnWithHeaderLike = (cells, searchStrings) => {
  getAllCellsOfFirstColumnWithHeaderLike(cells, searchStrings)->Array.pop
}

let findRelevantTable = html => {
  // todo combine cheerio dependencies to single file (findRelevantTable, tableWalker)
  let loadedCheerio = CheerioFacade.loadCheerio(html)

  let options = [
    "Kabinett",
    "Landesregierung",
    "Mitglieder der Staatsregierung",
    "Amtierende Regierungschefs",
    "Zusammensetzung",
    "Senat",
  ]

  let maybeResult = options->Array.findMap(o => {
    let found = loadedCheerio(None, StringSelector(`h2:contains("${o}")`))
    if found->CheerioFacade.getLength !== 0 {
      Console.log(`found table '${o}'`)
      found
      ->CheerioFacade.getParent
      ->CheerioFacade.getNextAll(Some("table"))
      ->CheerioFacade.getFirst
      ->CheerioFacade.getHtml
      ->Some
    } else {
      None
    }
  })

  switch maybeResult {
  | Some(html) => html
  | None =>
    Error.panic("Could not find relevant table with any of the names " ++ options->Array.join(", "))
  }
}

let findCabinetName = html => {
  let loadedCheerio = CheerioFacade.loadCheerio(html)
  CheerioFacade.getTextByString(loadedCheerio, "h1")
}

let _checkCellsAreValid = cells => {
  if Array.length(cells) !== 0 {
    Console.log(`TableWalker worked successfully\n`)
  } else {
    Error.panic("found 0 tableWalker cells - aborting")
  }
}

type ministerpraesident = {
  state: string,
  name: string,
  party: string,
  imageUrl: string,
  urlCabinet: string,
}

let _panicOnMissingDetails = (amt, ministerName, party, imageUrl, bundesland) => {
  Console.log5("This politician misses some detail: ", amt, ministerName, party, imageUrl)
  Console.log(`\nError with cabinet ${bundesland.urlCabinet}`)
  Error.panic("Could not extract table info")
}

let extractPoliticians = (
  amtColumn: array<tableCell>,
  cells: array<tableCell>,
  bundesland: ministerpraesident,
): array<politician> => {
  let result: array<politician> = []
  amtColumn->Array.forEach(amt => {
    if amt.linesOfText->Array.length === 0 {
      Error.panic(`amt.linesOfText is empty for amt: ${JSON.stringifyAny(amt)->Option.getExn}`)
    }

    let row = cells->Array.filter(cell => sameRow(cell, amt))
    let ministerName = getLastCellOfFirstColumnWithHeaderLike(row, ["amtsinhaber", "name"])
    let party = getLastCellOfFirstColumnWithHeaderLike(row, ["partei", "parteien"])
    let imageUrl = getLastCellOfFirstColumnWithHeaderLike(row, ["foto", "bild"])

    switch (ministerName, party, imageUrl) {
    | (Some(ministerName), Some(party), Some(imageUrl)) =>
      createPoliticianAndAddToList(amt, ministerName, party, imageUrl, result)
    | _ => _panicOnMissingDetails(amt, ministerName, party, imageUrl, bundesland)
    }
  })

  result
}

let fetchAndPrepareTableData = async bundesland => {
  let response: Axios.response<string> = await Axios.get(bundesland.urlCabinet, None)

  let cabinetName = findCabinetName(response.data)
  let relevantTable = findRelevantTable(response.data)
  let cells = TableWalker.tableWalker(relevantTable)
  _checkCellsAreValid(cells)

  (cabinetName, cells)
}

let _extract = async (bundesland: ministerpraesident) => {
  Console.log(`\nextracting ${bundesland.urlCabinet} (${bundesland.state})`)
  let (cabinetName, cells) = await fetchAndPrepareTableData(bundesland)

  let amtSearch = ["amt", "ressort"]
  let amtColumn = getAllCellsOfFirstColumnWithHeaderLike(cells, amtSearch)
  let result = switch amtColumn->Array.length {
  | length if length > 0 => extractPoliticians(amtColumn, cells, bundesland)
  | _ => Error.panic(`Found no cells for headers ${amtSearch->Array.join(", ")}`)
  }

  Console.log(`\nfound ${result->Array.length->Int.toString} politicians\n`)
  Console.log(result)

  let toOutputType = (p: politician): OutputHelpers.politician => {
    {
      amt: p.amt,
      name: p.name,
      imageUrl: p.imageUrl,
      party: p.party,
    }
  }

  // todo also add URL of cabinet to output files
  OutputHelpers.writeAsJson(
    `output/landesregierungen/${bundesland.state->String.toLocaleLowerCase}.json`,
    result->Array.map(toOutputType),
  )
  OutputHelpers.writeAsMarkdown(
    `output/landesregierungen/${bundesland.state->String.toLocaleLowerCase}.md`,
    `${bundesland.state} - ${cabinetName}`,
    result->Array.map(toOutputType),
  )
}

let deserializeMinisterpraesidenten = fileName => {
  let json = OutputHelpers.NodeJs.readFileSync(fileName, {encoding: "utf-8"})->JSON.parseExn
  switch JSON.Decode.array(json) {
  | Some(ministerpraesidenten) =>
    ministerpraesidenten->Array.map(jsonObject => {
      switch JSON.Decode.object(jsonObject) {
      | Some(mp) => {
          state: mp
          ->Dict.get("state")
          ->Option.getExn(~message="state field missing")
          ->JSON.Decode.string
          ->Option.getExn(~message="state field expected to be a string"),
          name: mp
          ->Dict.get("name")
          ->Option.getExn(~message="name field missing")
          ->JSON.Decode.string
          ->Option.getExn(~message="name field expected to be a string"),
          party: mp
          ->Dict.get("party")
          ->Option.getExn(~message="party field missing")
          ->JSON.Decode.string
          ->Option.getExn(~message="party field expected to be a string"),
          imageUrl: mp
          ->Dict.get("imageUrl")
          ->Option.getExn(~message="imageUrl field missing")
          ->JSON.Decode.string
          ->Option.getExn(~message="imageUrl field expected to be a string"),
          urlCabinet: mp
          ->Dict.get("urlCabinet")
          ->Option.getExn(~message="urlCabinet field missing")
          ->JSON.Decode.string
          ->Option.getExn(~message="urlCabinet field expected to be a string"),
        }
      | None => Error.panic(`Error deserializing single ministerpraesident object from ${fileName}`)
      }
    })
  | None => Error.panic(`Error deserializing ministerpraesidenten array from ${fileName}`)
  }
}

let extract = async () => {
  let ministerpraesidenten = deserializeMinisterpraesidenten("./output/ministerpraesidenten.json")

  let promises = ministerpraesidenten->Array.map(async mp => {
    switch mp.state {
    | "Sachsen"
    | "Baden-Württemberg"
    | "Bayern"
    | "Thüringen"
    | "Schleswig-Holstein"
    | "Sachsen-Anhalt"
    | "Saarland"
    | "Rheinland-Pfalz"
    | "Nordrhein-Westfalen"
    | "Niedersachsen"
    | "Mecklenburg-Vorpommern"
    | "Hessen"
    | "Hamburg"
    | "Bremen"
    | "Brandenburg"
    | "Berlin" => {
        await _extract(mp)
        None
      }
    | _ => Some(mp.state)
    }
  })

  let notMapped = (await Promise.all(promises))->Array.keepSome

  if notMapped->Array.length > 0 {
    Console.log(`Bundesländer ${notMapped->Array.join(", ")} not mapped yet.`)
  }
}
