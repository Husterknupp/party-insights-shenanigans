import { writeFileSync } from 'fs'

export function writeAsJson (fileName, output) {
  writeFileSync(fileName, JSON.stringify(output, null, 2), {
    encoding: 'utf-8'
  })
}

export function writeMinisterAsMarkdown (fileName, title, data) {
  let formatted = `# ${title}\n`
  formatted += data
    .map((minister) => {
      return `
${minister.amt}:
* Name: ${minister.name}
* Partei: ${minister.party}
* Profilbild: ![${minister.name}](${minister.imageUrl})
`
    })
    .join('')

  writeFileSync(fileName, formatted, {
    encoding: 'utf-8'
  })
}
