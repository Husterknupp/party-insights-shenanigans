// IntelliJ has hard times, understanding cheerio's `.attr` method
// noinspection JSUnresolvedFunction

import axios from 'axios'
import { load } from 'cheerio'
import { writeAsJson, writeAsMarkdown } from './output-helpers.js'

function urlForResizedImage (image) {
  // Resize image to non-thumb size
  // thumb Format: //upload.wikimedia.org/wikipedia/commons/thumb/5/5f/2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg/74px-2022-02-21_Dr._Markus_Soeder-1926_%28cropped%29.jpg
  let parts = image.split('/')
  parts = parts.filter((_, index) => index !== parts.length - 1)
  parts.push('400px-' + parts[parts.length - 1])
  return 'https:' + parts.join('/')
}

function indexParty ($rows) {
  const options = ['Partei', 'Parteien']

  for (const o of options) {
    // language=JQuery-CSS
    const found = $rows.find(`th:contains("${o}")`)
    if (found.length !== 0) {
      if (found.attr('colspan') > 1) {
        console.warn(`[WARN] colspan ${found.attr('colspan')} for party column`)
      }

      console.log(
                `found party column with name '${found.text().trim()}' at index ${found.index()}`
      )
      return found.index()
    }
  }

  throw Error("Couldn't find party column")
}

function indexName ($rows) {
  const options = ['Amtsinhaber/in']

  for (const o of options) {
    // language=JQuery-CSS
    const found = $rows.find(`th:contains("${o}")`)
    if (found.length !== 0) {
      if (found.attr('colspan') > 1) {
        console.warn(`[WARN] colspan ${found.attr('colspan')} for name column`)
      }

      console.log(
                `found name column with name '${found.text().trim()}' at index ${found.index()}`
      )
      return found.index()
    }
  }

  throw Error("Couldn't find name column")
}

function indexAmt ($rows) {
  const options = ['Ressort', 'Amt']

  for (const o of options) {
    // language=JQuery-CSS
    const found = $rows.find(`th:contains("${o}")`)
    if (found.length !== 0) {
      console.log(
                `found amt column with name '${found.text().trim()}' at index ${found.index()}`
      )
      return found.index()
    }
  }
  throw Error("Couldn't find amt column")
}

function findRelevantTable ($cheerio) {
  const options = ['Amtierende Regierungschefs', 'Zusammensetzung']
  for (const o of options) {
    // language=JQuery-CSS
    const found = $cheerio(`h2:contains("${o}")`)
    if (found.length !== 0) {
      console.log(`found table '${o}'`)
      return found.siblings().next('table:first').find('tr')
    }
  }
  throw Error("Couldn't find relevant table with any of the names " + options.toString())
}

export default async function extract () {
  const response = await axios.get(
    'https://de.wikipedia.org/wiki/Bundesregierung_(Deutschland)#Zusammensetzung'
  )
  const $ = load(response.data)

  const result = []
  const rows = findRelevantTable($)

  // Column indices
  const amtIdx = indexAmt(rows)
  const nameIdx = indexName(rows) + 1
  const imageIdx = nameIdx - 1
  const partyIdx = indexParty(rows) + 2

  rows.each((i, row) => {
    const cells = $(row).find('td')
    if (cells.length === 0) return // for table header

    // const state = $(cells[0]).find('[style="display:none;"]').text().trim();
    const amt = $(cells[amtIdx]).find('br').replaceWith(' • ').end().text()

    // const amt = $(cells[amtIdx]).text();
    const name = $(cells[nameIdx]).find('a:nth-of-type(1)').text()

    const imageSmall = $(cells[imageIdx]).find('img').attr('src')
    const imageUrl = urlForResizedImage(imageSmall)

    // const party = $(cells[4]).text().trim();
    const party = $(cells[partyIdx]).text().trim()

    result.push({
      amt,
      name,
      imageUrl,
      party
    })
  })

  result.sort(({ amt: a }, { amt: b }) => a.localeCompare(b))

  writeAsJson('output/bundesregierung.json', result)
  writeAsMarkdown('output/bundesregierung.md', 'Bundesregierung', 'amt', result)
}
