// anki-apkg-export is CommonJS and assigns its factory function to `exports.default`.
// Under Node's ESM/CJS interop that pattern makes a plain `import AnkiExport from "anki-apkg-export"`
// resolve to the whole module.exports object instead of the function (a known double-default quirk).
// Requiring it via createRequire sidesteps that and gives the real factory function.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);

export default require("anki-apkg-export").default;
