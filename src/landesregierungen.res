// For simplicity and I'm not sure if and how things will be merged
// later. This is a copy of the type in tableWalker.res
// and should be kept in sync with it.
type tableCell = {
  colStart: int,
  colEnd: int,
  rowStart: int,
  rowEnd: int,
  imageUrl: option<string>,
  header: string,
  linesOfText: array<string>,
}

let sameRow = (cellA: tableCell, cellB: tableCell) => {
  (cellB.rowStart <= cellA.rowStart && cellA.rowStart <= cellB.rowEnd) ||
    (cellB.rowStart <= cellA.rowEnd && cellA.rowEnd <= cellB.rowEnd)
}

type politician = {
  amt: string,
  name: string,
  imageUrl: string,
  party: string,
}

let createPolitician = (
  amt: tableCell,
  politicianName: tableCell,
  party: tableCell,
  imageUrl: tableCell,
) => {
  let message = `Cannot create politician object for name ${JSON.stringifyAny(
      politicianName,
    )->Option.getExn}`

  {
    amt: Array.join(amt.linesOfText, ", "),
    name: politicianName.linesOfText[Array.length(politicianName.linesOfText) - 1]->Option.getExn(
      ~message,
    ),
    imageUrl: imageUrl.imageUrl->Option.getExn(~message),
    party: party.linesOfText[0]->Option.getExn(~message),
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
