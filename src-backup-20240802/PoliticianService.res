// todo
// politicoScan
// getAllCellsOfFirstColumnWithHeaderLike
// getLastCellOfFirstColumnWithHeaderLike

let checkIsValid = (amt, ministerName, party, imageUrl, urlCabinet) => {
  if (
    Option.isNone(amt) || Option.isNone(ministerName) || Option.isNone(party)
    /* || imageUrl === undefined todo un-do once data fixed */
  ) {
    Js.Console.error2(
      "This politician misses some detail: ",
      {
        "amt": Option.getOr(amt, "INVALID"),
        "ministerName": Option.getOr(ministerName, "INVALID"),
        "party": Option.getOr(party, "INVALID"),
        "imageUrl": imageUrl,
      },
    )
    Js.Console.log(`\nError with cabinet ${urlCabinet}`)
    Error.make("Could not extract table info")->Error.raise
  }
}

let politicoScan = (
  html,
  relevantTableNames,
  columnNames /* { amt, ministerName, party, image } */,
) => {
  // todo move methods and convert from landesregierungen.js to this file or to HtmlService
  let cabinetName = HtmlService.findCabinetName(html) // todo rename - findFirstH1
  let relevantTable = HtmlService.findRelevantTable(html, relevantTableNames)
  let cells = HtmlService.tableWalker(relevantTable)
  if cells.length !== 0 {
    console.log(`TableWalker worked successfully\n`)
  } else {
    console.error("found 0 tableWalker cells - aborting")
    return
  }

  // Assumption is that the "Amt" column defines the rows.
  // Ie, all cells between rowStart and rowEnd correspond to one Amt-row.
  // let amtSearch = ["amt", "ressort"];
  let amtColumn = getAllCellsOfFirstColumnWithHeaderLike(cells, columnNames.amt)
  if amtColumn.length === 0 {
    Error.make(`Found no cells for headers ${searchStrings.toString()}`)->Error.raise
  }

  let result = []
  Belt.Array.forEach(amtColumn, amt => {
    let row = cells.filter(cell => sameRow(cell, amt))
    let ministerName = getLastCellOfFirstColumnWithHeaderLike(row, columnNames.ministerName)
    let party = getLastCellOfFirstColumnWithHeaderLike(row, columnNames.party)
    let imageUrl = getLastCellOfFirstColumnWithHeaderLike(row, columnNames.image)

    checkIsValid(amt, ministerName, party, imageUrl, bundesland.urlCabinet)

    let sameName = result.find(minister => ministerName.linesOfText.includes(minister.name))
    if sameName !== undefined {
      let subTitle = sameName.amt
      sameName.amt = `${amt.linesOfText.join(", ")} (gleichzeitig: ${subTitle})`
      continue
    }

    result.push(createMinister(amt, ministerName, party, imageUrl))
  })

  {result, cabinetName}
}
