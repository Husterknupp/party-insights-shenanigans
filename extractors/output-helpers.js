import { writeFileSync } from 'fs'

export function writeAsJson (fileName, output) {
  writeFileSync(fileName, JSON.stringify(output, null, 2), {
    encoding: 'utf-8'
  })
}

export function writeAsMarkdown (fileName, title, headingField, data) {
  let formatted = `# ${title}\n`
  formatted += data
    .map((minister) => {
      return `\n${minister[headingField]}:` + Object.keys(minister)
        .sort((keyA, keyB) => {
          // Have the image as last because it looks shitty between two text items
          if (keyA === 'imageUrl') {
            return 1
          } else if (keyB === 'imageUrl') {
            return -1
          } else {
            return 0
          }
        })
        .map(key => {
          switch (key) {
            case headingField: {
              // No duplicates!
              return ''
            }
            case 'name':{
              return `* Name: ${minister.name}`
            }
            case 'party':{
              return `* Partei: ${minister.party}`
            }
            case 'imageUrl':{
              return `* Profilbild: ![${minister.name}](${minister.imageUrl})`
            }
            case 'urlCabinet':{
              return `* Kabinett: ${minister.urlCabinet}`
            }
            default: {
              console.warn(`Markdown field ${key} not mapped. Object: ${JSON.stringify(minister)}`)
              return ''
            }
          }
        }).join('\n')
    })
    .join('\n')
  formatted += '\n'

  writeFileSync(fileName, formatted, {
    encoding: 'utf-8'
  })
}
