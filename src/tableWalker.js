// Cheerio function calls have problems with the element's (2nd argument) type signature
// when used in the `each` Cheerio callback.
// noinspection JSCheckFunctionSignatures

import {
  _loadCheerio,
  _getHeaderCells,
  _getDataCells,
  _extractTextFromCell,
} from "./tableWalker_ReScript.res.mjs";

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
  // Cells with no useful value - seem only confusing for user -- we filter them out.
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

  let $ = _loadCheerio(html);

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
