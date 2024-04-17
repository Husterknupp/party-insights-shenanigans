// Cheerio function calls have problems with the element's (2nd argument) type signature
// when used in the `each` Cheerio callback.
// noinspection JSCheckFunctionSignatures

import { load } from "cheerio";

function removeWhiteSpace(text) {
  // Line breaks in HTML can cause weird amount of whitespace.
  // Removes also inner linebreaks.
  return text.replace(/\s+/g, " ").trim();
}

function parseIntOr(maybeString, fallback) {
  const parsed = Number.parseInt(maybeString);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * tableWalker aims to be a more intuitive approach on how to assign cells to columns.
 */
export default function tableWalker(html) {
  /* todo separate somehow location logic ("cell in row X-Y")
      from extraction/parsing of cell content---or does that make no sense after all?

  MAKE THE tableWalker API MORE CONCISE - SOME IDEAS

  VARIANT A
  const wot = tableWalker(
    html,
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

  let $;
  // noinspection HtmlRequiredLangAttribute
  if (html.indexOf("<html>") !== -1) {
    $ = load(html);
  } else {
    $ = load(html, null, false);
  }

  const ths = $("th");

  let parent = null;
  for (const el of ths.toArray()) {
    if (parent === null) {
      parent = el.parent;
    } else if (el.parent === parent) {
      // Deliberately left blank - this is good, we have no problem
    } else {
      const text = el.children.map((el) => el.data);
      throw new Error(`Multiple headline rows - that's bad. <th>${text}</th>`);
    }
  }

  const columnCount = ths
    .toArray()
    .map((th) => parseIntOr(th.attribs.colspan, 1))
    .reduce((previousValue, currentValue) => previousValue + currentValue, 0);
  const rows = $(`tr:has(td)`);
  console.log(
    `Found ${ths.length} table headers (spanning ${columnCount} columns). ${rows.length} rows (not including rowspans).`,
  );

  const headers = [];
  ths.each((headerIdx, header) => {
    const maybePreviousCol = headers[headerIdx - 1]?.colEnd;
    const colStart = maybePreviousCol + 1 || 0;
    const colEnd = colStart + parseIntOr($(header).attr("colspan"), 1) - 1;
    const linesOfText = [removeWhiteSpace($(header).text())];
    headers.push({ colStart, colEnd, linesOfText });
  });

  const allCells = [];
  rows.each((rowIndex, row) => {
    // columnIdx basically imitates the browser behavior which moves a cell to the right when cells from other rows are blocking.
    // So even the first `<td>` of a `<tr>` can be in some column that is not index 0, because another row's cells have rowspan >1.
    // See test "Staatssekretaer has correct colStart and doesnt mess up Partei column"
    let columnIdx = 0;
    $(row)
      .find("td")
      .each((_, cell) => {
        const colSpan = parseIntOr($(cell).attr("colspan"), 1);
        const rowSpan = parseIntOr($(cell).attr("rowspan"), 1);

        let maybeShiftCellRight = undefined;
        do {
          maybeShiftCellRight = allCells.find(
            (cell) =>
              cell.colStart <= columnIdx &&
              columnIdx <= cell.colEnd &&
              cell.rowEnd >= rowIndex,
          );
          if (maybeShiftCellRight) {
            console.log(
              `Row no. ${rowIndex}: At column ${columnIdx} I found a cell of an earlier row... one to the right`,
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

  return allCells
    .map((cell) => {
      $(cell._cheerioEl).find("small").remove();
      $(cell._cheerioEl).find("sup").remove();

      const linesOfText = [];
      let text = "";
      const nodes = $(cell._cheerioEl).contents().toArray();
      for (let i = 0; i < nodes.length; i++) {
        const part = $(nodes[i]).text();
        if (part.trim().length !== 0) {
          text = text + part;
        }

        if (text !== "" && (nodes[i].name === "br" || i === nodes.length - 1)) {
          linesOfText.push(removeWhiteSpace(text));
          text = "";
        }
      }

      let imageUrl = $(cell._cheerioEl).find("img").last().attr("src");
      if (imageUrl !== undefined) {
        // Resize image to non-thumb size
        // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
        let parts = imageUrl.split("/");
        parts = parts.filter((_, index) => index !== parts.length - 1);
        parts.push("400px-" + parts[parts.length - 1].replace(".tif", ".png"));
        imageUrl = "https:" + parts.join("/");
      }

      const header = headers.find(
        (header) =>
          header.colStart <= cell.colStart && cell.colStart <= header.colEnd,
      ).linesOfText[0]; // Hopefully (🤞) header cells have not more than one line of text

      // somehow feels weird to expose Cheerio
      delete cell._cheerioEl;

      // `linesOfText` instead of a single text field because for some columns, we can ignore parts of
      // a cell's text---while in other columns all text is relevant. With this list, the caller can decide.
      return { ...cell, imageUrl, header, linesOfText };
    })
    .filter((cell) => {
      // Cells with no useful value - seem only confusing for user
      return cell.linesOfText.length !== 0 || cell.imageUrl !== undefined;
    });
}
