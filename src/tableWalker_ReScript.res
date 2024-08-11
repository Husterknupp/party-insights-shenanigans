@module
external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'CheerioAPI} = "cheerio"
// @module external cheerio: 'whatever = "cheerio"

type a = string => int

@genType
let _initializeCheerio = html =>
  if Js_string2.indexOf(html, "<html>") !== -1 {
    cheerio["load"](html, null, true)
    // cheerio["load"](html)
  } else {
    cheerio["load"](html, null, false)
  }
