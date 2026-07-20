// Wikimedia thumbnail URLs look like:
//   //upload.wikimedia.org/wikipedia/commons/thumb/f/fe/FILENAME.jpg/NNNpx-FILENAME.jpg
// Wikimedia only serves a defined set of thumbnail widths (see
// https://www.mediawiki.org/wiki/Common_thumbnail_sizes) and rejects other widths
// (e.g. 400px) with "400 Bad Request", so this always rewrites the size segment to
// the defined 500px size, regardless of what width the source page originally linked.
//
// `.tif` source files (rare, but present on Wikipedia) get rendered as `.png` thumbnails
// by Wikimedia, so that extension is swapped too.
//
// `.svg` source files are rendered as a rasterized thumbnail too, but unlike `.tif`,
// Wikimedia keeps the original `.svg` extension in the thumbnail filename and appends
// `.png` after it (e.g. `500px-Flag_of_Germany.svg.png`, not `500px-Flag_of_Germany.png`) —
// confirmed via the MediaWiki imageinfo API. Requesting the un-rasterized name returns
// "400 Bad Request".
let normalizeWikiImageUrl = (url: string): string => {
  let withScheme = url->String.startsWith("//") ? "https:" ++ url : url

  let parts = String.split(withScheme, "/")
  let withoutSizeSegment = Array.filterWithIndex(parts, (_, index) =>
    index !== Array.length(parts) - 1
  )
  let filename = withoutSizeSegment->Array.get(Array.length(withoutSizeSegment) - 1)->Option.getExn
  let tifNormalized = String.replaceRegExp(filename, %re("/\.tif$/"), ".png")
  let normalizedFilename = tifNormalized->String.endsWith(".svg")
    ? tifNormalized ++ ".png"
    : tifNormalized
  withoutSizeSegment->Array.push("500px-" ++ normalizedFilename)->ignore
  Array.join(withoutSizeSegment, "/")
}
