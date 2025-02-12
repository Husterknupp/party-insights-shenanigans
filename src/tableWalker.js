// Cheerio function calls have problems with the element's (2nd argument) type signature
// when used in the `each` Cheerio callback.
// noinspection JSCheckFunctionSignatures

import {
  _initializeCheerio,
  _sanityCheckHeaders,
  _getHeaderCells,
} from "./tableWalker_ReScript.res.mjs";

function removeInnerWhiteSpace(text) {
  // Line breaks in HTML can cause weird amount of whitespace.
  // Removes also inner linebreaks.
  return text.replace(/\s+/g, " ").trim();
}

function parseIntOr(maybeString, fallback) {
  const parsed = Number.parseInt(maybeString);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function _getDataCells(cheerio) {
  const rows = cheerio(`tr:has(td)`);
  console.log(`Found ${rows.length} rows (not including rowspans).`);

  const allCells = [];
  rows.each((rowIndex, row) => {
    // `columnIdx` basically imitates the browser behavior which moves a cell to the right when cells from other rows are blocking.
    // So even the first `<td>` of a `<tr>` can be in some column that is not index 0, because another row's cells have rowspan >1.
    // See test "Staatssekretaer has correct colStart and doesnt mess up Partei column"
    let columnIdx = 0;
    cheerio(row)
      .find("td")
      .each((_, cell) => {
        const colSpan = parseIntOr(cheerio(cell).attr("colspan"), 1);
        const rowSpan = parseIntOr(cheerio(cell).attr("rowspan"), 1);

        let maybeShiftCellRight = undefined;
        do {
          maybeShiftCellRight = allCells.find(
            (cell) =>
              cell.colStart <= columnIdx &&
              columnIdx <= cell.colEnd &&
              cell.rowEnd >= rowIndex
          );
          if (maybeShiftCellRight) {
            console.log(
              `Row no. ${rowIndex}: At column ${columnIdx} I found a cell of an earlier row... one to the right`
            );
            columnIdx = maybeShiftCellRight.colEnd + 1;
          }
        } while (maybeShiftCellRight !== undefined);

        // We need all cells regardless of their content because later
        // column/row index calculation is based on also the empty cells.
        allCells.push({
          colStart: columnIdx,
          colEnd: columnIdx + colSpan - 1,
          rowStart: rowIndex,
          rowEnd: rowIndex + rowSpan - 1,
          _cheerioEl: cell,
        });
        columnIdx += colSpan;
      });
  });

  return allCells;
}

function _extractTextFromCell(cheerio, cell) {
  cheerio(cell._cheerioEl).find("small").remove();
  cheerio(cell._cheerioEl).find("sup").remove();

  const linesOfText = [];
  let combinedText = "";
  const nodes = cheerio(cell._cheerioEl).contents().toArray();

  for (const node of nodes) {
    const text = cheerio(node).text();
    switch (node.name) {
      case "p":
        if (combinedText !== "") {
          linesOfText.push(removeInnerWhiteSpace(combinedText));
          combinedText = "";
        }
        if (text.trim() !== "") {
          linesOfText.push(removeInnerWhiteSpace(text));
        }
        break;
      case "br":
        if (combinedText !== "") {
          linesOfText.push(removeInnerWhiteSpace(combinedText));
          combinedText = "";
        }
        break;
      default:
        if (text.trim() !== "") {
          combinedText = combinedText + text;
        }
    }
  }

  if (combinedText !== "") {
    linesOfText.push(removeInnerWhiteSpace(combinedText));
  }

  return linesOfText;
}

function _extractAndResizeImageUrl(cheerio, cell) {
  let imageUrl = cheerio(cell._cheerioEl).find("img").last().attr("src");
  if (imageUrl !== undefined) {
    // Resize image to non-thumb size
    // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
    let parts = imageUrl.split("/");
    parts = parts.filter((_, index) => index !== parts.length - 1);
    parts.push("400px-" + parts[parts.length - 1].replace(".tif", ".png"));
    imageUrl = "https:" + parts.join("/");
  }
  return imageUrl;
}

function _findHeaderTextForCell(headerCells, cell) {
  return headerCells.find(
    (header) =>
      header.colStart <= cell.colStart && cell.colStart <= header.colEnd
  ).linesOfText[0]; // Hopefully (🤞) header cells have not more than one line of text
}

function _cellHasContent(cell) {
  // Cells with no useful value - seem only confusing for user
  return cell.linesOfText.length !== 0 || cell.imageUrl !== undefined;
}

/**
 * tableWalker aims to be a more intuitive approach on how to assign cells to columns.
 */
export default function tableWalker(html) {
  /* MAKE THE tableWalker API MORE CONCISE - SOME IDEAS

  VARIANT A
  const wot = tableWalker(
    html,
    relevantTable=[
      "Kabinett",
      "Landesregierung",
      "Mitglieder der Staatsregierung",
      "Amtierende Regierungschefs",
      "Zusammensetzung",
      "Senat",
    ],
    amtColumn=["amt", ressort"],
    ministerNameColumn=["amtsinhaber", "name"],
    ...
  )

  VARIANT B
  const wot = tableWalker(
    html,
    {mainColumn: ["amt", ressort"], mainColumnAlias: 'amt'},
    {columns: [headerText: ["amtsinhaber", "name",], alias: ]}
  )

  */

  let $ = _initializeCheerio(html);

  const headerCells = _getHeaderCells($);
  const dataCells = _getDataCells($);

  return dataCells
    .map((cell) => {
      const linesOfText = _extractTextFromCell($, cell);
      const imageUrl = _extractAndResizeImageUrl($, cell);
      const headerText = _findHeaderTextForCell(headerCells, cell);

      // It somehow feels weird to expose Cheerio
      delete cell._cheerioEl;

      // `linesOfText` instead of a single text field because for some columns, we can ignore parts of
      // a cell's text---while in other columns all text is relevant. With this list, the caller can decide.
      return { ...cell, imageUrl, header: headerText, linesOfText };
    })
    .filter(_cellHasContent);
}
