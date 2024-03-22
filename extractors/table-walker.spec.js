import kabinettDreyer from "../test-data/Kabinett_Dreyer_III.js";
import kabinettKretschmer from "../test-data/Kabinett_Kretschmer_II_parts.js";
import tableWalker from "./tableWalker.js";
import { getCellOfColumn } from "./landesregierungen.js";

// todo
// * rename extractors -> src
// * consider moving helper functions together into one file

/* Assumptions:
 * Height of a row: First regular cell (td, not th) of first column defines the height
 *  (if first data cell has rowspan=3, that means that for all later columns 2,3,4,... for this row they are expected to have also 3 cells)
 * Multiple headline rows: Only 1 row of `th`s gets considered
 */

function isColumnHeaderLike(headerText, searchStrings) {
  for (const searchString of searchStrings) {
    if (headerText.toLocaleLowerCase().includes(searchString)) {
      return true;
    }
  }
  return false;
}

describe("tableWalker", () => {
  test("Handles two image nodes in one cell", () => {
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
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/PetravonOlschowski_Web.jpg/400px-PetravonOlschowski_Web.jpg",
    );
  });

  test("Understands different text formattings in a cell: Finds last person in cell that contains two names and combines different nodes into one name", () => {
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
    </tbody>
</table>
`;

    const cells = tableWalker(table);

    expect(cells[0].text).toEqual("Petra Olschowski");
    expect(cells[1].text).toEqual(
      "Staatsrätin für Zivilgesellschaft und Bürgerbeteiligung",
    );
    expect(cells[2].text).toEqual("Random teapot");
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

    expect(cells[0].text).toEqual("Armin Schuster");
  });

  test("Person with two Ämter is handled properly", () => {
    const cells = tableWalker(kabinettKretschmer);

    console.log(`cells: `, cells);

    const giesela = cells.find((cell) => cell.text === "Gisela Reetz");
    expect(giesela.header).toEqual("Staatssekretär");
    expect(giesela.colStart).toEqual(5);
    const gerd = cells.find((cell) => cell.text === "Gerd Lippold");
    expect(gerd.header).toEqual("Staatssekretär");
    expect(gerd.colStart).toEqual(5);
  });

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

    const partyCell = getCellOfColumn(row, ["Partei"]);
    expect(partyCell.text).toEqual("CDU");
    const staatssekretaer = row.find(
      (cell) => cell.text.indexOf("Sebastian Hecht") !== -1,
    );
    expect(staatssekretaer.colStart).toEqual(4);
  });

  test("finding cells works (specific columns of a row)", () => {
    const cells = tableWalker(kabinettDreyer);

    // Assumption is that the "Amt" column defines the rows.
    // Ie, all cells between rowStart and rowEnd correspond to one Amt-row.
    const aemter = cells.filter((cell) =>
      isColumnHeaderLike(cell.header, ["amt", "ressort"]),
    );

    const ministerRows = [];
    for (const amt of aemter) {
      const row = cells.filter(
        (cell) =>
          (amt.rowStart <= cell.rowStart && cell.rowStart <= amt.rowEnd) ||
          (amt.rowStart <= cell.rowEnd && cell.rowEnd <= amt.rowEnd),
      );

      // Using findLast here because during one term of office more than one person can have the Ministerial position.
      // Wikipedia puts the latest person at the bottom of a row.
      const ministerName = getCellOfColumn(row, ["amtsinhaber", "name"]);
      const party = getCellOfColumn(row, ["partei", "parteien"]);
      const imageUrl = getCellOfColumn(row, ["foto"]);

      ministerRows.push({
        amt: amt.text,
        name: ministerName.text,
        party: party.text,
        imageUrl: imageUrl.imageUrl,
      });
    }

    expect(ministerRows.length).toBe(10);
    expect(ministerRows[0].amt).toContain("Ministerpräsidentin");
    expect(ministerRows[0].name).toContain("Malu Dreyer");
    expect(ministerRows[0].party).toContain("SPD");
    expect(ministerRows[0].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4145_Malu_Dreyer_%28cropped%29.jpg/400px-Wahlkampf_Landtagswahl_NRW_2022_-_SPD_-_Roncalliplatz_K%C3%B6ln_2022-05-13-4145_Malu_Dreyer_%28cropped%29.jpg",
    );

    // One minister row but two people had the amt one after the other
    expect(ministerRows[5].amt).toContain("Minister des Innern und für Sport");
    expect(ministerRows[5].name).toContain("Michael Ebling");
    expect(ministerRows[5].party).toContain("SPD");
    expect(ministerRows[5].imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9b/2015-12_Michael_Ebling_SPD_Bundesparteitag_by_Olaf_Kosinsky-6.jpg/400px-2015-12_Michael_Ebling_SPD_Bundesparteitag_by_Olaf_Kosinsky-6.jpg",
    );

    // One minister row but three people had the amt one after the other
    const klimaschutz = ministerRows[ministerRows.length - 1];
    expect(klimaschutz.amt).toContain(
      "Ministerin für Klimaschutz, Umwelt, Energie und Mobilität",
    );
    expect(klimaschutz.name).toContain("Katrin Eder");
    expect(klimaschutz.party).toContain("B’90/Die Grünen");
    expect(klimaschutz.imageUrl).toEqual(
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Katrin_Eder_Ministerin_f%C3%BCr_Klimaschutz_Umwelt_Energie_und_Mobilit%C3%A4t.jpg/400px-Katrin_Eder_Ministerin_f%C3%BCr_Klimaschutz_Umwelt_Energie_und_Mobilit%C3%A4t.jpg",
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
