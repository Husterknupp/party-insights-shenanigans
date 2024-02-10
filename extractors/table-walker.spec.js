const { load } = require("cheerio");
const kabinettDreyer = require("../test-data/Kabinett_Dreyer_III.js");

// todo
// * Same Amt by more than one person: One visual row (framed by border) can have multiple virtual rows (<tr> w/o border)
// * let extractors use table-walker
// * rename extractors -> src

function parseIntOr(maybeString, fallback) {
  const parsed = Number.parseInt(maybeString);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/* Assumptions:
 * Height of a row: First regular cell (td, not th) of first column defines the height
 *  (if first data cell has rowspan=3, that means that for all later columns 2,3,4,... for this row they are expected to have also 3 cells)
 * Multiple headline rows: Only 1 row of `th`s gets considered
 */

function tableWalker(html) {
  const $ = load(html);
  const ths = $(`th`);

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
  ths.each((headerCount, header) => {
    const colStart = headers[headerCount - 1]?.colEnd + 1 || 0;
    const colEnd = colStart + parseIntOr($(header).attr("colspan"), 1) - 1;
    const text = $(header).text();
    headers.push({ colStart, colEnd, text });
  });

  const allCells = [];
  rows.each((rowIndex, row) => {
    // columnIdx basically imitates the browser behavior which moves a cell to the right when there are cells from other rows blocking.
    // So even the first `<td>` of a `<tr>` can be in some random column, based on a previous row.
    // See test "Staatssekretaer has correct colStart and doesnt mess up Partei column"
    let columnIdx = 0;
    $(row)
      .find("td")
      .each((cellNumber, cell) => {
        const text = $(cell).text().trim();
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
            columnIdx = maybeShiftCellRight.colEnd + 1;
          }
        } while (maybeShiftCellRight !== undefined);

        const header = headers.find(
          (header) =>
            header.colStart <= columnIdx && columnIdx <= header.colEnd,
        ).text;

        let imageUrl = $(cell).find("img").attr("src");
        if (imageUrl !== undefined) {
          // Resize image to non-thumb size
          // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
          let parts = imageUrl.split("/");
          parts = parts.filter((_, index) => index !== parts.length - 1);
          parts.push("400px-" + parts[parts.length - 1]);
          imageUrl = "https:" + parts.join("/");
        }

        allCells.push({
          text,
          imageUrl,
          header,
          colStart: columnIdx,
          colEnd: columnIdx + colSpan - 1,
          rowStart: rowIndex,
          rowEnd: rowIndex + rowSpan - 1,
        });
        columnIdx += colSpan;
      });
  });

  return allCells;
}

function isColumnHeaderLike(headerText, searchStrings) {
  for (const searchString of searchStrings) {
    if (headerText.toLocaleLowerCase().includes(searchString)) {
      return true;
    }
  }
  return false;
}

// https://de.wikipedia.org/wiki/Kabinett_Dreyer_III
describe("tableWalker", () => {
  test("Staatssekretaer has correct colStart and doesnt mess up Partei column", () => {
    const cells = tableWalker(kabinettDreyer);
    const ministerpraesident = cells.filter((cell) =>
      isColumnHeaderLike(cell.header, ["amt", "ressort"]),
    )[0];
    const partyCells = cells.filter(
      (cell) =>
        isColumnHeaderLike(cell.header, ["partei", "parteien"]) &&
        ministerpraesident.rowStart <= cell.rowStart &&
        cell.rowStart <= ministerpraesident.rowEnd,
    );

    for (const cell of partyCells) {
      expect(cell.text).not.toContain("Heike Raab");
    }
  });

  test("finding cells works (specific columns of a row)", () => {
    const cells = tableWalker(kabinettDreyer);
    const aemter = cells.filter((cell) =>
      isColumnHeaderLike(cell.header, ["amt", "ressort"]),
    );

    const result = [];
    for (const amt of aemter) {
      const row = cells.filter(
        (cell) => amt.rowStart <= cell.rowStart && cell.rowStart <= amt.rowEnd,
      );
      const ministerName = row.find((cell) =>
        isColumnHeaderLike(cell.header, ["amtsinhaber", "name"]),
      );

      const party = row.find(
        (cell) =>
          isColumnHeaderLike(cell.header, ["partei", "parteien"]) &&
          cell.text !== "",
      );

      const imageUrl = row.find(
        (cell) =>
          isColumnHeaderLike(cell.header, ["foto"]) &&
          cell.imageUrl !== undefined &&
          cell.imageUrl !== "",
      );

      result.push({
        amt: amt.text,
        name: ministerName.text,
        party: party.text,
        imageUrl: imageUrl.imageUrl,
      });
    }

    expect(result.length).toBe(10);
    expect(result[0].amt).toContain("Ministerpräsidentin");
    expect(result[0].name).toContain("Malu Dreyer");
    expect(result[0].party).toContain("SPD");
    expect(result[0].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4145_Malu_Dreyer_%28cropped%29.jpg/400px-Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4145_Malu_Dreyer_%28cropped%29.jpg",
    );

    // One minister row but two people had the amt one after the other
    expect(result[5].amt).toContain("Minister des Innern und für Sport");
    expect(result[5].name).toContain("Michael Ebling");
    expect(result[5].party).toContain("SPD");
    expect(result[5].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/2015-12_Michael_Ebling_SPD_Bundesparteitag_by_Olaf_Kosinsky-6.jpg/400px-2015-12_Michael_Ebling_SPD_Bundesparteitag_by_Olaf_Kosinsky-6.jpg",
    );
  });

  test("should find 3 columns and two rows, make columns accessible via header text using cheerio", () => {
    const table01 = `
<table>
    <tbody>
    <tr>
        <th>Spalte 1</th>
        <th>Spalte 2</th>
        <th>Spalte 3</th>
    </tr>
    <tr>
        <td>bla</td>
        <td>img</td>
        <td>bloing</td>
    </tr>
    <tr>
        <td>cook</td>
        <td>check</td>
        <td>ccc</td>
    </tr>
    </tbody>
</table>
`;

    expect(tableWalker(table01)).toEqual([
      {
        text: "bla",
        colStart: 0,
        colEnd: 0,
        rowStart: 0,
        rowEnd: 0,
        header: "Spalte 1",
      },
      {
        header: "Spalte 2",
        text: "img",
        colStart: 1,
        colEnd: 1,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 3",
        text: "bloing",
        colStart: 2,
        colEnd: 2,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 1",
        text: "cook",
        colStart: 0,
        colEnd: 0,
        rowStart: 1,
        rowEnd: 1,
      },
      {
        header: "Spalte 2",
        text: "check",
        colStart: 1,
        colEnd: 1,
        rowStart: 1,
        rowEnd: 1,
      },
      {
        header: "Spalte 3",
        text: "ccc",
        colStart: 2,
        colEnd: 2,
        rowStart: 1,
        rowEnd: 1,
      },
    ]);
  });

  test("rowspan=2 shifts cells of next row to the right", () => {
    const table = `
    <table>
      <tbody>
      <tr>
        <th>Spalte 1</th>
        <th>Spalte 2</th>
        <th>Spalte 3</th>            
      </tr>
      <tr>
        <td rowspan="2">1A</td>
        <td>2A</td>
        <td>3A</td>
      </tr>
      <tr>
        <td>2B</td>
        <td rowspan="2">3B</td>
      </tr>
      <tr>
        <td>1C</td>
        <td>2C</td>
      </tr>
      </tbody>
    </table>
    `;

    expect(tableWalker(table)).toEqual([
      {
        header: "Spalte 1",
        text: "1A",
        colStart: 0,
        colEnd: 0,
        rowStart: 0,
        rowEnd: 1,
      },
      {
        header: "Spalte 2",
        text: "2A",
        colStart: 1,
        colEnd: 1,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 3",
        text: "3A",
        colStart: 2,
        colEnd: 2,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 2",
        text: "2B",
        colStart: 1,
        colEnd: 1,
        rowStart: 1,
        rowEnd: 1,
      },
      {
        header: "Spalte 3",
        text: "3B",
        colStart: 2,
        colEnd: 2,
        rowStart: 1,
        rowEnd: 2,
      },
      {
        header: "Spalte 1",
        text: "1C",
        colStart: 0,
        colEnd: 0,
        rowStart: 2,
        rowEnd: 2,
      },
      {
        header: "Spalte 2",
        text: "2C",
        colStart: 1,
        colEnd: 1,
        rowStart: 2,
        rowEnd: 2,
      },
    ]);
  });

  test("two different cells reference the same header with colspan=2", () => {
    {
      const table = `
    <table>
      <tbody>
      <tr>
        <th colspan="2">Spalte 1</th>
        <th>Spalte 2</th>
        <th colspan="3">Spalte 3</th>            
      </tr>
      <tr>
        <td>1A</td>
        <td>1A</td>
        <td>2A</td>
        <td>3A</td>
        <td>3A</td>
        <td>3A</td>
      </tr>
      <tr>
        <td>1B</td>
        <td>1B</td>
        <td>2B</td>
        <td>3B</td>
        <td>3B</td>
        <td>3B</td>
      </tr>
      </tbody>
    </table>
    `;

      expect(tableWalker(table)).toEqual([
        {
          header: "Spalte 1",
          text: "1A",
          colStart: 0,
          colEnd: 0,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 1",
          text: "1A",
          colStart: 1,
          colEnd: 1,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 2",
          text: "2A",
          colStart: 2,
          colEnd: 2,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 3",
          text: "3A",
          colStart: 3,
          colEnd: 3,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 3",
          text: "3A",
          colStart: 4,
          colEnd: 4,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 3",
          text: "3A",
          colStart: 5,
          colEnd: 5,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 1",
          text: "1B",
          colStart: 0,
          colEnd: 0,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 1",
          text: "1B",
          colStart: 1,
          colEnd: 1,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 2",
          text: "2B",
          colStart: 2,
          colEnd: 2,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 3",
          text: "3B",
          colStart: 3,
          colEnd: 3,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 3",
          text: "3B",
          colStart: 4,
          colEnd: 4,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 3",
          text: "3B",
          colStart: 5,
          colEnd: 5,
          rowStart: 1,
          rowEnd: 1,
        },
      ]);
    }
  });

  test("checks for column mismatch of rows width vs headers width", () => {
    const table02 = `
<table>
    <tbody>
    <tr>
        <th>Spalte 1</th>
        <th>Spalte 2</th>
    </tr>
    <tr>
        <td>bla</td>
        <td rowspan="2">img</td>
    </tr>
    <tr>
        <td>bla</td>
        <td>img</td>
    </tr>
    </tbody>
</table>
`;

    expect(() => tableWalker(table02)).toThrow(
      "Cannot read properties of undefined (reading 'text')",
    );
  });

  test("checks for unexpected second headings row", () => {
    const table03 = `
<table>
    <tbody>
    <tr>
        <th>Spalte 1</th>
    </tr>
    <tr>
        <td>bla</td>
    </tr>
    <tr>
        <th>ganz was anderes...</th>
    </tr>
    </tbody>
</table>
`;

    expect(() => tableWalker(table03)).toThrow();
  });
});
