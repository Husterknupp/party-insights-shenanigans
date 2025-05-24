// todo
// findCabinetName
// findRelevantTable
// tableWalker
// README: Add note about ReScript and VS Code Plugin

// %%raw(`
// import { load } from "cheerio";
// `)

@module external cheerio: 'whatever = "cheerio"

// todo rename? - getFirstH1()
let findCabinetName = html => {
  let _cheerio = cheerio["load"](html)
  _cheerio("h1")["text"]()
}

let findRelevantTable = (html, nameOptions) => {
  let _cheerio = cheerio["load"](html)

  let maybeResult = Belt_Array.map(nameOptions, option => {
    let table = _cheerio(`h2:contains("${option}")`)
    if table["length"] > 0 {
      Js_console.log(`found table '${option}'`)
    }
    table
  })->Belt_Array.getBy(table => {
    table["length"] > 0
  })

  switch maybeResult {
  | Some(table) => table["nextAll"]("table")["first"]()["html"]()
  | None =>
    Error.raise(
      Error.make(
        "Couldn't find relevant table with any of the names " ++ Js_array2.toString(nameOptions),
      ),
    )
  }
}

// todo rename - maybe parseTable/getCells
/**
 * tableWalker aims to be a more intuitive approach on how to assign cells to columns.
 */
let tableWalker = html => {
  let _cheerio = _initializeCheerio(html)

  let ths = _cheerio("th")
  _checkHeadersAreValid(ths)

  let columnCount =
    ths["toArray"]()
    ->Belt_Array.map(th => _parseIntOr(th.attribs.colspan, 1))
    ->Belt_Array.reduce((previousValue, currentValue) => previousValue + currentValue, 0)
  let rows = _cheerio(`tr:has(td)`)
  Js_console.log(
    `Found ${ths->Belt_Array.length} table headers (spanning ${columnCount} columns). ${rows->Belt_Array.length} rows (not including rowspans).`,
  )

  let headers = _parseHeaders(ths)

  // todo hier weiter - 3.6.24
  let allCells = _locateCells(rows)

  allCells.map(cell => {
    let linesOfText = _getLinesOfText(cell)

    let imageUrl =
      _cheerio(cell._cheerioEl)["find"]("img")["last"]()["attr"]("src")
      ->Nullable.toOption
      ->Option.map(imagePath => {
        // Resize image to non-thumb size
        // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
        open Belt_Array
        let parts = imagePath->Js_string2.split("/")
        let ending = "400px-" ++ parts[length(parts) - 1]->Js_string2.replace(".tif", ".png")
        parts->set(length(parts), ending)
        "https:" + parts->joinWith("/", x => x)
      })

    let headerText =
      headers
      ->Belt_Array.getBy(header =>
        header.colStart <= cell.colStart && cell.colStart <= header.colEnd
      )
      ->Option.getExn(~message=`No header found for colStart(${cell.colStart})`).linesOfText[0] // Hopefully (🤞) header cells have not more than one line of text
      ->Option.getExn(~message=`header at colStart(${cell.colStart}) is missing some text`)

    // somehow feels weird to expose Cheerio
    cell->Dict.delete("_cheerioEl")

    // `linesOfText` instead of a single text field because for some columns, we can ignore parts of
    // a cell's text---while in other columns all text is relevant. With this list, the caller can decide.
    {...cell, imageUrl, header: headerText, linesOfText}
  })
  Belt_Array.keep(cell => {
    // Cells with no useful value - seem only confusing for user
    Belt_Array.length(cell.linesOfText) > 0 || Option.isSome(cell.imageUrl)
  })
}

let _initializeCheerio = html => {
  if html.indexOf("<html>") !== -1 {
    cheerio["load"](html)
  } else {
    cheerio["load"](html, null, false)
  }
}

let _checkHeadersAreValid = ths => {
  let asArray = ths["toArray"]()
  let parent = asArray[0]
  let invalidTableHeaders = asArray->Belt_Array.getBy(el => el["parent"] !== parent)

  if invalidTableHeaders->Option.isSome {
    let text = el["children"]->Belt_Array.map(el => el["data"])
    Error.raise(Error.make(`Multiple headline rows - that's bad. <th>${text}</th>`))
  }
}

let _parseIntOr = (maybeString, fallback) => {
  let parsed = Js_float.fromString(maybeString)
  if Js_float.isNaN(parsed) {
    fallback
  } else {
    Js_math.ceil_int(parsed)
  }
}

let _parseHeaders = ths => {
  let headers = []
  ths["each"]((headerIdx, header) => {
    let colStart = switch headers[headerIdx - 1] {
    | Some(previousCol) => previousCol + 1
    | None => 0
    }
    let colEnd = colStart + _parseIntOr(_cheerio(header)["attr"]("colspan"), 1) - 1
    let linesOfText = [_removeInnerWhiteSpace(_cheerio(header)["text"]())]
    headers.push({colStart, colEnd, linesOfText})
  })
  headers
}

let _removeInnerWhiteSpace = text => {
  // Line breaks in HTML can cause weird amount of whitespace.
  // Removes also inner linebreaks.
  open Js_string2
  text->replaceByRe(%re("/\s+/g"), " ")->trim()
}

let _locateCells = rows => {
  let allCells = []
  rows["each"]((rowIndex, row) => {
    // columnIdx basically imitates the browser behavior which moves a cell to the right when cells from other rows are blocking.
    // So even the first `<td>` of a `<tr>` can be in some column that is not index 0. Because another row's cell has rowspan > 1.
    // See unit test "Staatssekretaer has correct colStart and doesnt mess up Partei column"
    let columnIdx = 0
    let locatedRow = []
    _cheerio(row)["find"]("td")["each"]((_, cell) => {
      let colSpan = _parseIntOr(_cheerio(cell)["attr"]("colspan"), 1)
      let rowSpan = _parseIntOr(_cheerio(cell)["attr"]("rowspan"), 1)

      /* PSEUDO CODE
        for current cell
        * check earlier cells of current row - lowest possible colStart
        * init colStart with: this.colStart = that.colEnd + 1
        * check cells of previous rows if they overlap
        * first find largest colEnd of overlapping earlier rows (upperBound)
        * then for (0 to upperBound)
        * next cell
       */

// VERSION 2
      let colStartCurrentRow = locatedRow->Belt_Array.reverse->Belt_Array.get(0)->Option.mapOr(-1, earlierCell => earlierCell.colEnd) + 1
      // At this point, `allCells` contains not every cell of the table.
      // Cells are added from top to bottom, so `earlierCell.rowEnd` yields an earlier row's cell which spans more than one row.
      let colEndPreviousRows = allCells
        ->Belt_Array.keep(earlierCell => {
          earlierCell.rowEnd >= rowIndex &&
          earlierCell.colEnd >= colStartCurrentRow
        })
        ->Belt_Array.reduce(colStartCurrentRow, (colEnd, earlierCell) => {
          if earlierCell.colEnd > colEnd {
            earlierCell.colEnd
          } else {
            colEnd
          }
        }) + 1
      for i in colStartCurrentRow to colEndPreviousRows {
        // todo hier weiter - 3.6.24
        // for loop doesn't work because we cannot return early once we found the first free cell
        //  - I want to iterate index by index until I find the first free cell index
      }
// VERSION 2 end


// OLDER VERSION 1
      // let colStart = allCells
      // ->Belt_Array.keep(earlierCell => {
      //   // At this point, `allCells` contains not every cell of the table.
      //   // Cells are added from top to bottom, so `earlierCell.rowEnd` yields an earlier row's cell which spans more than one row.
      //   earlierCell.rowEnd >= rowIndex
      // })
      // ->Belt_Array.reduce(0, (colStart, earlierCell) => {
      //   if (earlierCell.colStart <= colStart && colStart <= earlierCell.colEnd) {
      //     console.log(
      //       `Row no. ${rowIndex}: At column ${colStart} I found a cell of an earlier row... Shifting one to the right`,
      //     );
      //     earlierCell.colEnd + 1;
      //   } else {
      //     colStart
      //   }
      // })
// OLDER VERSION 1 end

      let maybeShiftCellRight = undefined
      // do {
      //   maybeShiftCellRight = allCells.find(
      //     (cell) =>
      //       cell.colStart <= columnIdx &&
      //       columnIdx <= cell.colEnd &&
      //       cell.rowEnd >= rowIndex,
      //   );
      //   if (maybeShiftCellRight) {
      //     console.log(
      //       `Row no. ${rowIndex}: At column ${columnIdx} I found a cell of an earlier row... one to the right`,
      //     );
      //     columnIdx = maybeShiftCellRight.colEnd + 1;
      //   }
      // } while (maybeShiftCellRight !== undefined);

      // We need all cells regardless of their content because later
      // column/row index calculation is based on also the empty cells.
      locatedRow.push({
        colStart: columnIdx,
        colEnd: columnIdx + colSpan - 1,
        rowStart: rowIndex,
        rowEnd: rowIndex + rowSpan - 1,
        _cheerioEl: cell,
      })
      columnIdx += colSpan;
    })
    locatedRow->Belt_Array.forEach(cell => Belt_Array.push(allCells, cell))
  })
}

// let _locateCells = (rows) => {
//   let allCells = [];
//   rows["each"]((rowIndex, row) => {
//     // columnIdx basically imitates the browser behavior which moves a cell to the right when cells from other rows are blocking.
//     // So even the first `<td>` of a `<tr>` can be in some column that is not index 0, because another row's cells have rowspan >1.
//     // See test "Staatssekretaer has correct colStart and doesnt mess up Partei column"
//     let columnIdx = 0;
//     _cheerio(row)
//       ["find"]("td")
//       ["each"]((_, cell) => {
//         let colSpan = _parseIntOr(_cheerio(cell)["attr"]("colspan"), 1);
//         let rowSpan = _parseIntOr(_cheerio(cell)["attr"]("rowspan"), 1);

//         let maybeShiftCellRight = undefined;
//         do {
//           maybeShiftCellRight = allCells.find(
//             (cell) =>
//               cell.colStart <= columnIdx &&
//               columnIdx <= cell.colEnd &&
//               cell.rowEnd >= rowIndex,
//           );
//           if (maybeShiftCellRight) {
//             console.log(
//               `Row no. ${rowIndex}: At column ${columnIdx} I found a cell of an earlier row... one to the right`,
//             );
//             columnIdx = maybeShiftCellRight.colEnd + 1;
//           }
//         } while (maybeShiftCellRight !== undefined);

//         // We need all cells regardless of their content because later
//         // column/row index calculation is based on also the empty cells.
//         allCells.push({
//           colStart: columnIdx,
//           colEnd: columnIdx + colSpan - 1,
//           rowStart: rowIndex,
//           rowEnd: rowIndex + rowSpan - 1,
//           _cheerioEl: cell,
//         });
//         columnIdx += colSpan;
//       });
//   });
// }

let _getLinesOfText = cell => {
  _cheerio(cell._cheerioEl)["find"]("small")["remove"]()
  _cheerio(cell._cheerioEl)["find"]("sup")["remove"]()

  let nodes = _cheerio(cell._cheerioEl)["contents"]()["toArray"]()
  let (combinedText, linesOfText) = nodes->Belt_Array.reduce((None, []), (
    (combinedText, linesOfText),
    node,
  ) => {
    let text = _cheerio(node)["text"]()
    switch node["name"] {
    | "p" => {
        if Option.isSome(combinedText) {
          linesOfText.push(_removeInnerWhiteSpace(combinedText))
        }
        if text->Js_string2.trim() !== "" {
          linesOfText.push(_removeInnerWhiteSpace(text))
        }
        (None, linesOfText)
      }
    | "br" =>
      {
        if Option.isSome(combinedText) {
          linesOfText.push(_removeInnerWhiteSpace(combinedText))
        }
        (None, linesOfText)
      }

      _ => {
        if text->Js_string2.trim() !== "" {
          (combinedText ++ text, linesOfText)
        } else {
          (combinedText, linesOfText)
        }
      }
    }
  })

  // Because in the reduce, we don't know what's the last element
  if combinedText !== "" {
    linesOfText->Belt_Array.push(_removeInnerWhiteSpace(combinedText))
  }
}
