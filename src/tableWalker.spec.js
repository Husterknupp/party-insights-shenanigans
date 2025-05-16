import { tableWalker } from "./tableWalker_ReScript.res.mjs";

import {
  createMinister,
  getAllCellsOfFirstColumnWithHeaderLike,
  getLastCellOfFirstColumnWithHeaderLike,
  isColumnHeaderLike,
} from "./landesregierungen.js";

import kabinettDreyer from "../test-data/Kabinett_Dreyer_III.js";
import kabinettKretschmer from "../test-data/Kabinett_Kretschmer_II_parts.js";

// todo
//  * consider moving helper functions together into one file
//  * make `bundesregierung`, `ministerpraesidenten` also use the new API

/* Assumptions:
 * Height of a row: First regular cell (td, not th) of first column defines the height
 *  (if first data cell has rowspan=3, that means that for all later columns 2,3,4,... for this row they are expected to have also 3 cells)
 * Multiple headline rows: Only 1 row of `th`s gets considered
 */

describe("integration tests", () => {
  test("handles special cell with two rows of Ämter in the same cell well", () => {
    // https://de.wikipedia.org/wiki/Senat_Tschentscher_II
    const table = `
<table>
    <thead>
    <tr>
        <th> Amt </th>
        <th>Bild </th>
        <th> Name </th>
        <th colspan="2">Partei </th>
    </tr>
    </thead>
    <tbody>
    <tr>
        <td rowspan="2">Präsident des Senats und <a href="/wiki/Erster_B%C3%BCrgermeister" title="Erster Bürgermeister">Erster
            Bürgermeister</a><br><a href="/wiki/Senatskanzlei_(Hamburg)"
                                    title="Senatskanzlei (Hamburg)">Senatskanzlei</a>
        </td>
        <td rowspan="2">
            <figure typeof="mw:File/Frameless">
                <figcaption></figcaption>
            </figure>
        </td>
        <td rowspan="2"><a href="/wiki/Peter_Tschentscher" title="Peter Tschentscher">Peter Tschentscher</a>
        </td>
        <td rowspan="2">
        </td>
        <td rowspan="2"><a href="/wiki/Sozialdemokratische_Partei_Deutschlands"
                           title="Sozialdemokratische Partei Deutschlands">SPD</a>
        </td>
    </tr>
    <tr> </tr>
    </tbody>
</table>  
  `;

    const cells = tableWalker(table);
    const aemter = getAllCellsOfFirstColumnWithHeaderLike(cells, ["amt"]);

    expect(aemter).toHaveLength(1);
    expect(aemter[0].linesOfText).toEqual([
      "Präsident des Senats und Erster Bürgermeister",
      "Senatskanzlei",
    ]);
  });

  function sameRow(cell, ministerpraesident) {
    return (
      ministerpraesident.rowStart <= cell.rowStart &&
      cell.rowStart <= ministerpraesident.rowEnd
    );
  }

  test("Staatssekretär has correct colStart and doesnt mess up Partei column", () => {
    const cells = tableWalker(kabinettDreyer);
    const ministerpraesident = getLastCellOfFirstColumnWithHeaderLike(cells, [
      "amt",
      "ressort",
    ]);
    const partyCells = cells.filter(
      (cell) =>
        isColumnHeaderLike(cell, ["partei", "parteien"]) &&
        sameRow(cell, ministerpraesident)
    );

    for (const cell of partyCells) {
      expect(cell.linesOfText[0]).not.toContain("Heike Raab");
    }
  });

  test("row with two Partei columns selects Minister's party (not party of Staatssekretär)", () => {
    // https://de.wikipedia.org/wiki/Kabinett_Kretschmer_II
    const table = `
<table>
    <tbody>
    <tr>
        <th>Amt
        </th>
        <th>Bild
        </th>
        <th>Name
        </th>
        <th colspan="2">Partei
        </th>
        <th>Staatssekretär <!-- column #5 -->
        </th>
        <th colspan="2">Partei
        </th>
    </tr>
    <tr>
        <td><a href="/wiki/S%C3%A4chsisches_Staatsministerium_der_Finanzen"
               title="Sächsisches Staatsministerium der Finanzen">Staatsminister der Finanzen</a>
        </td>
        <td style="padding:0;background-color:#777;text-align:center;vertical-align:middle;">
        </td>
        <td><a href="/wiki/Hartmut_Vorjohann" title="Hartmut Vorjohann">Hartmut Vorjohann</a>
        </td>
        <td>CDU
        </td>
        <td>
            <a href="/wiki/Dirk_Diedrichs" title="Dirk Diedrichs">Dirk Diedrichs</a> 
            <small>(bis 25. April 2023)</small>
            <br>
            <a href="/wiki/Sebastian_Hecht" title="Sebastian Hecht">Sebastian Hecht</a> 
            <small>(ab 26. April 2023)</small>
            <br> 
            <small>(Amtschef)</small>
        </td>
        <td style="padding:0;background-color:#777;text-align:center;vertical-align:middle;">
        </td>
        <td>parteilos
        </td>
    </tr>
    </tbody>
</table>
    `;

    const row = tableWalker(table);

    const partyCell = getLastCellOfFirstColumnWithHeaderLike(row, ["Partei"]);
    expect(partyCell.linesOfText[0]).toEqual("CDU");
    expect(
      (() => {
        const staatssekretaer = row.find((cell) =>
          cell.linesOfText.includes("Sebastian Hecht")
        );
        return staatssekretaer.colStart;
      })()
    ).toEqual(4);
  });

  test("finding cells works (specific columns of a row)", () => {
    const cells = tableWalker(kabinettDreyer);

    // Assumption is that the "Amt" column defines the rows.
    // Ie, all cells between rowStart and rowEnd correspond to one Amt-row.
    const aemter = getAllCellsOfFirstColumnWithHeaderLike(cells, [
      "amt",
      "ressort",
    ]);

    const ministerRows = [];
    for (const amt of aemter) {
      const row = cells.filter(
        (cell) =>
          (amt.rowStart <= cell.rowStart && cell.rowStart <= amt.rowEnd) ||
          (amt.rowStart <= cell.rowEnd && cell.rowEnd <= amt.rowEnd)
      );

      // Using findLast here because during one term of office more than one person can have the Ministerial position.
      // Wikipedia puts the latest person at the bottom of a row.
      const ministerName = getLastCellOfFirstColumnWithHeaderLike(row, [
        "amtsinhaber",
        "name",
      ]);
      const party = getLastCellOfFirstColumnWithHeaderLike(row, [
        "partei",
        "parteien",
      ]);
      const imageUrl = getLastCellOfFirstColumnWithHeaderLike(row, ["foto"]);

      ministerRows.push(createMinister(amt, ministerName, party, imageUrl));
    }

    expect(ministerRows.length).toBe(10);
    expect(ministerRows[0].amt).toEqual("Ministerpräsidentin, Staatskanzlei");
    expect(ministerRows[0].name).toContain("Malu Dreyer");
    expect(ministerRows[0].party).toContain("SPD");
    expect(ministerRows[0].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4145_Malu_Dreyer_%28cropped%29.jpg/400px-Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4145_Malu_Dreyer_%28cropped%29.jpg"
    );

    // One minister row but two people had the amt one after the other
    expect(ministerRows[5].amt).toContain("Minister des Innern und für Sport");
    expect(ministerRows[5].name).toContain("Michael Ebling");
    expect(ministerRows[5].party).toContain("SPD");
    expect(ministerRows[5].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/2015-12_Michael_Ebling_SPD_Bundesparteitag_by_Olaf_Kosinsky-6.jpg/400px-2015-12_Michael_Ebling_SPD_Bundesparteitag_by_Olaf_Kosinsky-6.jpg"
    );

    // One minister row but three people had the amt one after the other
    const klimaschutz = ministerRows[ministerRows.length - 1];
    expect(klimaschutz.amt).toContain(
      "Ministerin für Klimaschutz, Umwelt, Energie und Mobilität"
    );
    expect(klimaschutz.name).toContain("Katrin Eder");
    expect(klimaschutz.party).toContain("B’90/Die Grünen");
    expect(klimaschutz.imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Katrin_Eder_Ministerin_f%C3%BCr_Klimaschutz_Umwelt_Energie_und_Mobilit%C3%A4t.jpg/400px-Katrin_Eder_Ministerin_f%C3%BCr_Klimaschutz_Umwelt_Energie_und_Mobilit%C3%A4t.jpg"
    );
  });
});

describe("tableWalker", () => {
  test("handles two image nodes in one cell well", () => {
    // https://de.wikipedia.org/wiki/Kabinett_Kretschmann_III

    // Wikipedia apparently doesn't use the same linting rules like I do
    // noinspection HtmlUnknownTarget,HtmlRequiredAltAttribute
    const table = `
<table>
    <tbody>
    <tr>
        <th>Spalte 1</th>
    </tr>
    <tr>
        <td style="padding:0;background-color:#777;text-align:center;vertical-align:middle;">
            <span typeof="mw:File"><a
                    href="/wiki/Datei:Theresia_Bauer.jpg" class="mw-file-description"><img
                    src="//upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Theresia_Bauer.jpg/120px-Theresia_Bauer.jpg"
                    decoding="async" width="120" height="180" class="mw-file-element"
                    srcset="//upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Theresia_Bauer.jpg/180px-Theresia_Bauer.jpg 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/4/4f/Theresia_Bauer.jpg/240px-Theresia_Bauer.jpg 2x"
                    data-file-width="644" data-file-height="966"></a></span><br>
            <span typeof="mw:File"><a
                    href="/wiki/Datei:PetravonOlschowski_Web.jpg" class="mw-file-description"><img
                    src="//upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/120px-PetravonOlschowski_Web.jpg"
                    decoding="async" width="120" height="117" class="mw-file-element"
                    srcset="//upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/180px-PetravonOlschowski_Web.jpg 1.5x, //upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/240px-PetravonOlschowski_Web.jpg 2x"
                    data-file-width="899" data-file-height="876"></a></span>
        </td>
    </tr>
    </tbody>
</table>
`;

    const cells = tableWalker(table);

    expect(cells.length).toBe(1);
    expect(cells[0].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/400px-PetravonOlschowski_Web.jpg"
    );
  });

  test("Understands different text formatting in a cell: Line breaks, dedicated nodes, blank text and more", () => {
    // https://de.wikipedia.org/wiki/Kabinett_Kretschmann_III
    const table = `
<table>
    <tbody>
    <tr>
        <th>Spalte 1</th>
    </tr>
    <tr>
        <td>
            <a href="/wiki/Theresia_Bauer" title="Theresia Bauer">Theresia Bauer</a><br><small><i>bis 28. September 2022</i></small>
            <br><a href="/wiki/Petra_Olschowski" title="Petra Olschowski">Petra Olschowski</a><br><small><i>ab 28. September 2022</i></small>
        </td>
    </tr>
    <tr>
        <td>
            <a href="/wiki/Staatsrat_(Amt)" title="Staatsrat (Amt)">Staatsrätin</a> für Zivilgesellschaft und Bürgerbeteiligung
        </td>
    </tr>
    <tr>
        <td>Random teapot</td>
    </tr>
    <tr>
        <!-- https://de.wikipedia.org/wiki/Kabinett_Rehlinger -->
        <td rowspan="2">
            Ministerpräsidentin
            <br><br>
            <i><a href="/wiki/Saarl%C3%A4ndische_Staatskanzlei" title="Saarländische Staatskanzlei">Staatskanzlei</a></i>
        </td>
    </tr>
    </tbody>
</table>
`;

    const cells = tableWalker(table);
    let lastElement = (arr) => arr.toReversed()[0];

    expect(lastElement(cells[0].linesOfText)).toEqual("Petra Olschowski");
    expect(lastElement(cells[1].linesOfText)).toEqual(
      "Staatsrätin für Zivilgesellschaft und Bürgerbeteiligung"
    );
    expect(lastElement(cells[2].linesOfText)).toEqual("Random teapot");
    expect(cells[3].linesOfText).toEqual([
      "Ministerpräsidentin",
      "Staatskanzlei",
    ]);
  });

  test("cell text strips away footnotes", () => {
    // https://de.wikipedia.org/wiki/Kabinett_Kretschmer_II
    const table03 = `
<table>
    <tbody>
    <tr>
        <th>Spalte 1</th>
    </tr>
    <tr>
        <td>
          <a href="/wiki/Armin_Schuster" title="Armin Schuster">Armin Schuster</a>
          <br>
          <small>(ab 25. April 2022)</small>
          <sup id="cite_ref-3" class="reference"><a>[3]</a></sup>
        </td>
    </tr>
    </tbody>
</table>
`;

    const cells = tableWalker(table03);

    expect(cells[0].linesOfText[0]).toEqual("Armin Schuster");
  });

  test("Person with two Ämter is handled properly", () => {
    const cells = tableWalker(kabinettKretschmer);

    const giesela = cells.find(
      (cell) => cell.linesOfText[0] === "Gisela Reetz"
    );
    expect(giesela.header).toEqual("Staatssekretär");
    expect(giesela.colStart).toEqual(5);
    const gerd = cells.find((cell) => cell.linesOfText[0] === "Gerd Lippold");
    expect(gerd.header).toEqual("Staatssekretär");
    expect(gerd.colStart).toEqual(5);
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
        linesOfText: ["bla"],
        imageUrl: undefined,
        colStart: 0,
        colEnd: 0,
        rowStart: 0,
        rowEnd: 0,
        header: "Spalte 1",
      },
      {
        header: "Spalte 2",
        linesOfText: ["img"],
        imageUrl: undefined,
        colStart: 1,
        colEnd: 1,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 3",
        linesOfText: ["bloing"],
        imageUrl: undefined,
        colStart: 2,
        colEnd: 2,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 1",
        linesOfText: ["cook"],
        imageUrl: undefined,
        colStart: 0,
        colEnd: 0,
        rowStart: 1,
        rowEnd: 1,
      },
      {
        header: "Spalte 2",
        linesOfText: ["check"],
        imageUrl: undefined,
        colStart: 1,
        colEnd: 1,
        rowStart: 1,
        rowEnd: 1,
      },
      {
        header: "Spalte 3",
        linesOfText: ["ccc"],
        imageUrl: undefined,
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
        linesOfText: ["1A"],
        imageUrl: undefined,
        colStart: 0,
        colEnd: 0,
        rowStart: 0,
        rowEnd: 1,
      },
      {
        header: "Spalte 2",
        linesOfText: ["2A"],
        imageUrl: undefined,
        colStart: 1,
        colEnd: 1,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 3",
        linesOfText: ["3A"],
        imageUrl: undefined,
        colStart: 2,
        colEnd: 2,
        rowStart: 0,
        rowEnd: 0,
      },
      {
        header: "Spalte 2",
        linesOfText: ["2B"],
        imageUrl: undefined,
        colStart: 1,
        colEnd: 1,
        rowStart: 1,
        rowEnd: 1,
      },
      {
        header: "Spalte 3",
        linesOfText: ["3B"],
        imageUrl: undefined,
        colStart: 2,
        colEnd: 2,
        rowStart: 1,
        rowEnd: 2,
      },
      {
        header: "Spalte 1",
        linesOfText: ["1C"],
        imageUrl: undefined,
        colStart: 0,
        colEnd: 0,
        rowStart: 2,
        rowEnd: 2,
      },
      {
        header: "Spalte 2",
        linesOfText: ["2C"],
        imageUrl: undefined,
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
          linesOfText: ["1A"],
          imageUrl: undefined,
          colStart: 0,
          colEnd: 0,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 1",
          linesOfText: ["1A"],
          imageUrl: undefined,
          colStart: 1,
          colEnd: 1,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 2",
          linesOfText: ["2A"],
          imageUrl: undefined,
          colStart: 2,
          colEnd: 2,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 3",
          linesOfText: ["3A"],
          imageUrl: undefined,
          colStart: 3,
          colEnd: 3,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 3",
          linesOfText: ["3A"],
          imageUrl: undefined,
          colStart: 4,
          colEnd: 4,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 3",
          linesOfText: ["3A"],
          imageUrl: undefined,
          colStart: 5,
          colEnd: 5,
          rowStart: 0,
          rowEnd: 0,
        },
        {
          header: "Spalte 1",
          linesOfText: ["1B"],
          imageUrl: undefined,
          colStart: 0,
          colEnd: 0,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 1",
          linesOfText: ["1B"],
          imageUrl: undefined,
          colStart: 1,
          colEnd: 1,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 2",
          linesOfText: ["2B"],
          imageUrl: undefined,
          colStart: 2,
          colEnd: 2,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 3",
          linesOfText: ["3B"],
          imageUrl: undefined,
          colStart: 3,
          colEnd: 3,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 3",
          linesOfText: ["3B"],
          imageUrl: undefined,
          colStart: 4,
          colEnd: 4,
          rowStart: 1,
          rowEnd: 1,
        },
        {
          header: "Spalte 3",
          linesOfText: ["3B"],
          imageUrl: undefined,
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
      'Panic! Could not find matching header. Cell\'s content is "img". Cell is located at col 2 (colEnd: 2), row 1 (rowEnd: 1)'
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
