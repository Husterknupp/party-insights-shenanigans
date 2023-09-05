import extractMinisterpraesidenten from './extractors/ministerpraesidenten.js'
import extractBundesregierung from './extractors/bundesregierung.js'
import extractLandesregierungen from './extractors/landesregierungen.js'

async function run () {
  console.log('Start')

  await extractMinisterpraesidenten()
  console.log('Done with ministerpräsidenten.')

  await extractBundesregierung()
  console.log('Done with bundesregierung.')

  await extractLandesregierungen()
  console.log('Done with landesregierungen.')
}

run()
  .then(() => console.log('All done. Ite domum!'))
  .catch(console.error)
