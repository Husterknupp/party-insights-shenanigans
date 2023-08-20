import axios from 'axios';
import { load } from 'cheerio';
import { writeFileSync } from 'fs';

function createImageFiles(ministerpraesidenten) {
    ministerpraesidenten.forEach((ministerpraesident) => {
        console.log('Download file for ' + ministerpraesident.name);
        axios.get(ministerpraesident.imageUrl, { responseType: 'arraybuffer' }).then((image) =>
            writeFileSync(
                'output/ministerpraesidenten/' + ministerpraesident.name + '.jpg',
                image.data,
                {
                    encoding: 'base64',
                }
            )
        );
    });
}

function writeAsJson(fileName, output) {
    writeFileSync(fileName, JSON.stringify(output, null, 2), {
        encoding: 'utf-8',
    });
}

function writeAsMarkdown(fileName, title, data) {
    let formatted = `# ${title}\n`;
    formatted += data
        .map((bundesland) => {
            return `
${bundesland.state}:
* Ministerpräsident/in: ${bundesland.name}
* Partei: ${bundesland.party}
* Profilbild: ![${bundesland.name}](${bundesland.imageUrl})
* Kabinett: ${bundesland.urlCabinet}
`;
        })
        .join('');

    writeFileSync(fileName, formatted, {
        encoding: 'utf-8',
    });
}

export default async function extract() {
    const response = await axios.get(
        'https://de.wikipedia.org/wiki/Liste_der_deutschen_Ministerpr%C3%A4sidenten'
    );
    const $ = load(response.data);

    const result = [];
    $('h2:contains("Amtierende Regierungschefs")')
        .siblings()
        .next('table:first')
        .find('tr')
        .each((i, row) => {
            const cells = $(row).find('td');
            if (cells.length === 0) return; // for table header

            const state = $(cells[0]).find('[style="display:none;"]').text().trim();
            const name = $(cells[1]).find('a').text();
            const image = $(cells[2]).find('img').attr('src');
            // Resize image to non-thumb size
            // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
            let parts = image.split('/');
            parts = parts.filter((_, index) => index !== parts.length - 1);
            parts.push('400px-' + parts[parts.length - 1]);
            const imageUrl = 'https:' + parts.join('/');
            const party = $(cells[4]).text().trim();
            const cabinet = $(cells[9]).find('a').attr('href');
            const urlCabinet = 'https://de.wikipedia.org' + cabinet;

            result.push({
                state,
                name,
                party,
                imageUrl,
                urlCabinet,
            });
        });

    result.sort(({ state: stateA }, { state: stateB }) => stateA.localeCompare(stateB));

    writeAsJson('output/ministerpraesidenten/ministerpraesidenten.json', result);
    writeAsMarkdown(
        'output/ministerpraesidenten/ministerpraesidenten.md',
        'Ministerpräsidenten',
        result
    );
    createImageFiles(result);
}
