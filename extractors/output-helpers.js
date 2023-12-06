import { writeFileSync } from "fs";

export function writeAsJson(fileName, output) {
  writeFileSync(fileName, JSON.stringify(output, null, 2), {
    encoding: "utf-8",
  });
}

function formatImageUrl(minister) {
  const usefulImage =
    minister.imageUrl !== null &&
    !minister.imageUrl.includes("replace_this_image");

  if (usefulImage) {
    return `* Profilbild: ![${minister.name}](${minister.imageUrl})`;
  } else {
    return "* Profilbild: *No image available*";
  }
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
            const formatActions = {
              [headingField]: "" /* No duplicates! */,
              name: `* Name: ${minister.name}`,
              party: `* Partei: ${minister.party}`,
              imageUrl: formatImageUrl(minister),
              urlCabinet: `* Kabinett: ${minister.urlCabinet}`,
            };
            if (key in formatActions) {
              return formatActions[key];
            } else {
              console.warn(`Markdown: Field ${key} not mapped.`);
              return `* ${key}: ${minister[key]}`;
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
