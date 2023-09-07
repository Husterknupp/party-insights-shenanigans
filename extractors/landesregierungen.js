import { readFileSync } from 'fs'
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
        console.warn(`colspan ${found.attr('colspan')} for party column`)
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
  const options = ['Amtsinhaber/in', 'Name']

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
  const options = ['Kabinett', 'Mitglieder der Landesregierung', 'Mitglieder der Staatsregierung', 'Amtierende Regierungschefs', 'Zusammensetzung']
  for (const o of options) {
    // language=JQuery-CSS
    const found = $cheerio(`h2:contains("${o}")`)
    if (found.length !== 0) {
      console.log(`found table '${o}'`)
      return found.next('table').find('tr')
    }
  }
  throw Error("Couldn't find relevant table with any of the names " + options.toString())
}

async function extractSingle (bundesland) {
  console.log('\nextracting ' + bundesland.urlCabinet + ` (${bundesland.state})`)

  const response = await axios.get(bundesland.urlCabinet)
  const $ = load(response.data)

  const result = []
  const rows = findRelevantTable($)

  // Column indices
  const amtIdx = indexAmt(rows)
  const nameIdx = indexName(rows)
  const imageIdx = nameIdx - 1
  console.log(`assuming image column at index ${imageIdx}`)
  const partyIdx = indexParty(rows)

  console.log('found all indexes\n')

  rows.each((i, row) => {
    const cells = $(row).find('td')
    if (cells.length === 0) return // for table header

    const amt = $(cells[amtIdx]).find('br').replaceWith(' • ').end().text().trim()

    const name = $(cells[nameIdx]).find('a:first').text().trim()
    if (!name) {
      console.info(`I have no name. Column ${nameIdx}. Maybe it's some sort of 'amt'?`)

      if (amt.toLocaleLowerCase().indexOf('inneres') !== -1 || amt.toLocaleLowerCase().indexOf('minister') !== -1) {
        console.info(`'amt'='${amt}' looks useful. Will add it to predecessor's amt`)
        const predecessor = result[result.length - 1]
        predecessor.amt = amt + ` (${predecessor.amt})`
      } else {
        console.info(`Skipping. 'amt'=${amt}`)
      }
      return
    }

    const imageSmall = $(cells[imageIdx]).find('img').attr('src')
    if (!imageSmall) { throw new Error(`Missing img URL. Column ${imageIdx}`) }

    const imageUrl = urlForResizedImage(imageSmall)

    let party = $(cells[partyIdx]).text().trim()
    if (!party) {
      party = $(cells[partyIdx + 1]).text().trim()
      console.log(`${name}: What about a paartey? Column ${partyIdx} has no text. Reading column right of it ... '${party}'`)
    }

    result.push({
      amt,
      name,
      imageUrl,
      party
    })
  })

  // todo delete sorting once we can scrape bundeslaender - it's easier when using Wikipedia's sorting
  result.sort(({ amt: a }, { amt: b }) => a.localeCompare(b))

  console.log(`found ${result.length} minister\n`)
  console.log(result)

  writeAsJson(`output/landesregierungen/${bundesland.state.toLocaleLowerCase()}.json`, result)
  writeAsMarkdown(`output/landesregierungen/${bundesland.state.toLocaleLowerCase()}.md`, bundesland.state, 'amt', result)
}

export default async function extract () {
  const bundeslaender = JSON.parse(readFileSync('./output/ministerpraesidenten/ministerpraesidenten.json', { encoding: 'UTF-8' }))
  const notMapped = []

  for (const bundesland of bundeslaender) {
    switch (bundesland.state.toLocaleLowerCase()) {
      case 'sachsen':
      case 'baden-württemberg':
      {
        await extractSingle(bundesland)
        break
      }
      default: {
        notMapped.push(bundesland.state)
      }
    }
  }

  console.log(`Bundeslaender ${notMapped.join(', ')} not mapped yet.`)
}
