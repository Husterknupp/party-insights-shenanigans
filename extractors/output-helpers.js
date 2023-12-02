import { writeFileSync } from "fs";

export function writeAsJson(fileName, output) {
  writeFileSync(fileName, JSON.stringify(output, null, 2), {
    encoding: "utf-8",
  });
}

export function writeAsMarkdown(fileName, title, headingField, data) {
  let formatted = `# ${title}\n`;
  formatted += data
    .map((minister) => {
      return (
        `\n${minister[headingField]}:` +
        Object.keys(minister)
          // Have the image as last because it looks shitty between two text items
          .sort((keyA, keyB) =>
            keyA === "imageUrl" ? 1 : keyB === "imageUrl" ? -1 : 0,
          )
          .map((key) => {
            switch (key) {
              case headingField: {
                // No duplicates!
                return "";
              }
              case "name": {
                return `* Name: ${minister.name}`;
              }
              case "party": {
                return `* Partei: ${minister.party}`;
              }
              case "imageUrl": {
                const usefulImage =
                  !minister.imageUrl.includes("replace_this_image");
                if (usefulImage) {
                  return `* Profilbild: ![${minister.name}](${minister.imageUrl})`;
                } else {
                  return "* Profilbild: *No image available*";
                }
              }
              case "urlCabinet": {
                return `* Kabinett: ${minister.urlCabinet}`;
              }
              default: {
                console.warn(`Markdown: Field ${key} not mapped.`);
                return `* ${key}: ${minister[key]}`;
              }
            }
          })
          .join("\n")
      );
    })
    .join("\n");
  formatted += "\n";

  writeFileSync(fileName, formatted, {
    encoding: "utf-8",
  });
}
