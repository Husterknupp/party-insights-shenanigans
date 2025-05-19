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
