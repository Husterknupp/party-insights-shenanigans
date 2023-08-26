import extractMinisterpraesidenten from './extractors/ministerpraesidenten.js';
import extractBundesregierung from './extractors/bundesregierung.js';

// todo
// * -> GitHub
// * GitHub CI notify on updates

// * same for Bundesländer
// Header: Kabinett/Mitglieder der Landesregierung
// Amt/Ressort | Foto/Bild | Name/Amtsinhaber | Partei/Parteien

function run() {
    console.log(`starting`);
    extractMinisterpraesidenten()
        .then(() => console.log('Done Ministerpräsidenten'))
        .catch(console.error);
    extractBundesregierung()
        .then(() => console.log('Done Bundesregierung'))
        .catch(console.error);
}

run();
