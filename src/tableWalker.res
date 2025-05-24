let loadCheerio = html =>
  if String.indexOf(html, "<html>") !== -1 {
    CheerioFacade.load(html, null, true)
  } else {
    CheerioFacade.load(html, null, false)
  }

let _sanityCheckHeaders: CheerioFacade.queriedCheerio => unit = cheerioWithHeaders => {
  let headerElements = CheerioFacade.cheerioToElementArray(cheerioWithHeaders)
  let firstHeader = headerElements[0]->Option.getExn
  if firstHeader->CheerioFacade.getName != "th" {
    Console.log(firstHeader)
    Error.panic("Queried cheerio was expected to contain any headers. But it doesn't")
  }
  let parent = firstHeader->CheerioFacade.getParentExn

  let maybeInvalidHeader = Array.find(headerElements, header => {
    CheerioFacade.getParentExn(header) !== parent
  })

  switch maybeInvalidHeader {
  | Some(invalidHeader) => {
      let thText =
        CheerioFacade.getChildren(invalidHeader)
        ->Array.map(CheerioFacade.getData)
        ->Array.toString
      let expected = parent->CheerioFacade.getName
      let actual =
        invalidHeader
        ->CheerioFacade.getParent
        ->Option.getExn
        ->CheerioFacade.getName

      Error.panic(
        `Multiple headline rows--that's bad. <th>${thText}</th>. Expected parent element ${expected}, but was ${actual}`,
      )
    }
  | None => ()
  }
}

let _removeInnerWhiteSpace = text => {
  // Line breaks in HTML can cause weird amount of whitespace.
  // Removes also inner linebreaks.
  text->String.replaceRegExp(/\s+/g, " ")->String.trim
}

type headerCell = {
  colStart: int,
  colEnd: int,
  linesOfText: array<string>,
}

let _getHeaderCells: CheerioFacade.loadedCheerio => array<headerCell> = loadedCheerio => {
  let ths = loadedCheerio(None, CheerioFacade.StringSelector("th"))
  _sanityCheckHeaders(ths)

  let thElements = CheerioFacade.cheerioToElementArray(ths)
  let columnCount =
    thElements
    ->Array.map(th => CheerioFacade.getColspanInt(th))
    ->Array.reduce(0, (prev, curr) => prev + curr)

  Console.log(
    `Found ${Array.length(
        thElements,
      )->Int.toString} table headers (spanning ${columnCount->Int.toString} columns).`,
  )

  thElements->Array.reduceWithIndex([], (headers, header, headerIdx) => {
    let maybePreviousCol = headers->Array.get(headerIdx - 1)->Option.map(h => h.colEnd)
    let colStart = switch maybePreviousCol {
    | Some(colEnd) => colEnd + 1
    | None => 0
    }
    let colEnd = colStart + CheerioFacade.getColspanInt(header) - 1
    let linesOfText = [_removeInnerWhiteSpace(CheerioFacade.getText(header, loadedCheerio))]
    headers->Array.concat([{colStart, colEnd, linesOfText}])
  })
}

type dataCell = {
  colStart: int,
  colEnd: int,
  rowStart: int,
  rowEnd: int,
  _cheerioEl: option<CheerioFacade.cheerioElement>,
}

let _getStartIndexForCell = (allCells, ~initialColumnIdx, ~rowIndex) => {
  let rec shiftRight = columnIdx => {
    let maybeShiftCellRight = allCells->Array.find(cell => {
      cell.colStart <= columnIdx && columnIdx <= cell.colEnd && cell.rowEnd >= rowIndex
    })

    switch maybeShiftCellRight {
    | Some(shiftCell) => {
        Console.log(
          `Row no. ${rowIndex->Int.toString}: At column ${columnIdx->Int.toString} I found a cell of an earlier row... one to the right`,
        )
        shiftRight(shiftCell.colEnd + 1)
      }
    | None => columnIdx
    }
  }

  shiftRight(initialColumnIdx)
}

let _getDataCells: CheerioFacade.loadedCheerio => array<dataCell> = cheerio => {
  let rows = cheerio(None, CheerioFacade.StringSelector("tr:has(td)"))
  Console.log(`Found ${CheerioFacade.getLengthString(rows)} rows (not including rowspans).`)

  let allCells = []
  CheerioFacade.each(rows, (rowIndex, row) => {
    let dataCells = cheerio(None, CheerioFacade.AnyNode(row))->CheerioFacade.find("td")

    // `columnIdx` basically imitates the browser behavior which moves a cell to the right when cells from other rows are blocking.
    // So even the first `<td>` of a `<tr>` can be in some column that is not index 0, because another row's cells have rowspan >1.
    // See test "Staatssekretaer has correct colStart and doesnt mess up Partei column"
    let columnIdx = ref(0)

    CheerioFacade.each(dataCells, (_, cell) => {
      let colStart = _getStartIndexForCell(
        allCells,
        ~initialColumnIdx=columnIdx.contents,
        ~rowIndex,
      )
      let colEnd = colStart + CheerioFacade.getColspanInt(cell) - 1
      let rowEnd = rowIndex + CheerioFacade.getRowspanInt(cell) - 1

      // We need all cells regardless of their content because later
      // column/row index calculation is based on also the empty cells.
      allCells
      ->Array.push({colStart, colEnd, rowStart: rowIndex, rowEnd, _cheerioEl: Some(cell)})
      ->ignore

      columnIdx := colEnd + 1
    })
  })

  allCells
}

let _concatenate = (a, b) => {
  let isPunctuation = c => {
    c == "." || c == "," || c == "?" || c == "!" || c == ":" || c == ";"
  }

  switch String.charAt(b, 0) {
  | "" => a
  | firstChar if isPunctuation(firstChar) => a ++ b
  | _ => a ++ " " ++ b
  }
}

/**
 * Removes all line breaks that are not between <p> or <br> tags.
 * This is necessary because the HTML source code of the page contains
 * a lot of line breaks that are not visible in the browser.
 * This function removes those line breaks to make the text more readable.
 */
let removeInvisibleSourceLineBreaks = (
  cheerio: CheerioFacade.loadedCheerio,
  node: CheerioFacade.cheerioElement,
) => {
  let lines = []
  let nodes =
    cheerio(None, AnyNode(node))
    ->CheerioFacade.contents
    ->CheerioFacade.cheerioToElementArray

  let currentInlineText = ref("")
  let flushInlineText = () => {
    if currentInlineText.contents !== "" {
      lines->Array.push(_removeInnerWhiteSpace(currentInlineText.contents))
      currentInlineText := ""
    }
  }

  nodes->Array.forEach(node => {
    let text = CheerioFacade.getText(node, cheerio)->String.trim
    let nodeName = CheerioFacade.getName(node)

    if nodeName === "p" || nodeName === "br" {
      // Block elements - flush any inline text and add paragraph content
      flushInlineText()
      if nodeName === "p" && text !== "" {
        lines->Array.push(_removeInnerWhiteSpace(text))
      }
    } else if text !== "" {
      // Inline elements - accumulate text and flush in the end
      currentInlineText := _concatenate(currentInlineText.contents, text)
      // currentInlineText := currentInlineText.contents ++ " " ++ text
    }
  })

  // Flush any remaining inline text
  flushInlineText()

  lines
}

let _extractTextFromCell = (cheerio: CheerioFacade.loadedCheerio, cell: dataCell) => {
  cheerio(None, AnyNode(cell._cheerioEl->Option.getExn))
  ->CheerioFacade.find("small")
  ->CheerioFacade.remove
  ->ignore

  cheerio(None, AnyNode(cell._cheerioEl->Option.getExn))
  ->CheerioFacade.find("sup")
  ->CheerioFacade.remove
  ->ignore

  removeInvisibleSourceLineBreaks(cheerio, cell._cheerioEl->Option.getExn)
}

let _extractAndResizeImageUrl = (cheerio: CheerioFacade.loadedCheerio, cell: dataCell) => {
  let imageElement =
    cheerio(None, AnyNode(cell._cheerioEl->Option.getExn))
    ->CheerioFacade.find("img")
    ->CheerioFacade.getLast

  CheerioFacade.getSrc(imageElement)->Option.map(src => {
    let parts = String.split(src, "/")
    let filtered = Array.filterWithIndex(parts, (_, index) => index !== Array.length(parts) - 1)
    let lastPart = filtered->Array.get(Array.length(filtered) - 1)->Option.getExn
    let newLastPart = "400px-" ++ String.replaceRegExp(lastPart, /\.tif$/, ".png")
    filtered->Array.push(newLastPart)->ignore
    "https:" ++ Array.join(filtered, "/")
  })
}

let _findHeaderTextForCell = (
  headerCells: array<headerCell>,
  cell: dataCell,
  content: array<string>,
) => {
  let header =
    headerCells->Array.find(header =>
      header.colStart <= cell.colStart && cell.colStart <= header.colEnd
    )
  switch header {
  | Some(header) => header.linesOfText->Array.get(0)->Option.getExn // Hopefully (🤞) header cells have not more than one line of text
  | None =>
    Error.panic(
      `Could not find matching header. Cell's content is "${content->Array.join(
          "",
        )}". Cell is located at col ${cell.colStart->Int.toString} (colEnd: ${cell.colEnd->Int.toString}), row ${cell.rowStart->Int.toString} (rowEnd: ${cell.rowEnd->Int.toString})`,
    )
  }
}

// For simplicity and I'm not sure if and how things will be merged
// later. There exists a copy of this type in landesregierungen.res
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

let _cellHasContent = (cell: tableCell) => {
  // Cells may have no content (e.g. empty cells)
  // or they may have an imageUrl but no text, or vice versa (option<imageUrl>).
  // We filter out those cells that have no content at all because they are not useful.
  cell.linesOfText->Array.length !== 0 || cell.imageUrl->Option.isSome
}

/**
 * tableWalker aims to be a more intuitive approach on how to assign cells to columns.
 * 
 * Find more ideas on API change in the todo markdown file.
 */
let tableWalker: string => array<tableCell> = (html: string) => {
  let cheerio = loadCheerio(html)
  let headerCells = _getHeaderCells(cheerio)
  let dataCells = _getDataCells(cheerio)

  let tableCells =
    dataCells
    ->Array.map(cell => {
      let linesOfText = _extractTextFromCell(cheerio, cell)
      let imageUrl = _extractAndResizeImageUrl(cheerio, cell)
      let header = _findHeaderTextForCell(headerCells, cell, linesOfText)

      {
        colStart: cell.colStart,
        colEnd: cell.colEnd,
        rowStart: cell.rowStart,
        rowEnd: cell.rowEnd,
        imageUrl,
        header,
        linesOfText,
      }
    })
    ->Array.filter(_cellHasContent)

  tableCells
}
