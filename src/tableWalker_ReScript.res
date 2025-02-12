module CheerioFacade = {
  //    field "name" not available for type "text"
  //    e.g., <div>, <span>
  //  type tagNode = {...node, "name": string}
  //  type dataNode = {...node, "data": string}
  //  type cheerioElement = TagNode(tagNode) | DataNode(dataNode)

  // see node_modules/domhandler/lib/node.d.ts -> class "Node"
  type rec cheerioElement = {
    // class Node
    //    special type: "ParentNode"
    "parent": option<cheerioElement>,
    //    special type: "ChildNode"
    "prev": option<cheerioElement>,
    //    special type: "ChildNode"
    "next": option<cheerioElement>,
    //    e.g., "tag" (<div>, <span>), "text" (has 'data' attribute)
    "type": [#root | #text | #directive | #comment | #script | #style | #tag | #cdata | #doctype],
    // END class Node

    // class DataNode (`DataNode extends Node`)
    //    only type="text" (`Text extends DataNode`)
    "data": string,
    // END class DataNode

    // class Element (`Element extends NodeWithChildren extends Node`)
    //    only type="tag"
    "name": string,
    "attribs": Nullable.t<{
      "colspan": Nullable.t<string>,
    }>,
    //    children can only be type: "ChildNode"
    "children": array<cheerioElement>,
    // END class Element

    // type ParentNode = Document | Element | CDATA;
    // type ChildNode = Text | Comment | ProcessingInstruction | Element | CDATA | Document;
  }

  type queriedCheerio = {"toArray": unit => array<cheerioElement>, "text": unit => string}
  // type basicAcceptedElems = String(string) | Element(cheerioElement)
  // type basicAcceptedElems = [#String(string) | #Element(cheerioElement)]
  // type initializedCheerio = basicAcceptedElems => queriedCheerio

  // @module
  // external cheerio: {
  //   "load": (string, Nullable.t<'CheerioOptions>, bool) => string => queriedCheerio,
  // } = "cheerio"

  // @module
  // external cheerio: {
  //   "load": (string, Nullable.t<'CheerioOptions>, bool) => cheerioElement => queriedCheerio,
  // } = "cheerio"

  // type basicAcceptedElems = [#String(string) | #Element(cheerioElement)]
  // type basicAcceptedElems = @unwrap [#String(string) | #Element(cheerioElement)]

  // @module("cheerio")
  // external load: (
  //   string,
  //   Nullable.t<'CheerioOptions>,
  //   bool,
  // ) => @unwrap [#String(string) | #Element(cheerioElement)] => queriedCheerio = "load"

  // type basicAcceptedElems = [#String(string) | #Element(cheerioElement)]
  // type basicAcceptedElems = CheerioElement | String
  // type initializedCheerio = [#String(string) | #Element(cheerioElement)] => queriedCheerio
  // import Cheerio from "cheerio"
  // Cheerio.load: (string, options, bool) => CheerioElement | String => queriedCheerio
  //                                          ^^^ This is the hard part

  // @module("cheerio") @module("cheerio")
  // external selectorFunction: @unwrap
  // [#String(string) | #Element(cheerioElement)] => queriedCheerio = "selectorFunction"

  // @scope("cheerio") @module("cheerio")
  // external load: (string, Nullable.t<'CheerioOptions>, bool) => initializedCheerio = "load"

  // let unwrapTest = selectorFunction

  // type document // abstract type for a document object
  // @send external getElementById: (document, string) => Dom.element = ""
  // let sendTest = getElementById

  // @unboxed
  // type listItemValue = String(string) | Boolean(bool) | Number(float)
  // let myArray = [String("Hello"), Boolean(true), Boolean(false), Number(13.37)]

  // @unboxed
  // type listItemValue = String(string) | Element(cheerioElement)
  // @unboxed
  // type listItemValue = [#String(string) | #Element(cheerioElement)]
  // @unwrap
  // type listItemValue = [#String(string) | #Element(cheerioElement)]
  // @module("path") external dirname: listItemValue => string = "dirname"
  // let myArray = [String("Hello"), Boolean(true), Boolean(false), Number(13.37)]

  // todo fix the load type:
  //  * https://rescript-lang.org/docs/manual/v12.0.0/variant#interop-with-javascript
  //  * https://rescript-lang.org/docs/manual/v11.0.0/bind-to-js-function#modeling-polymorphic-function
  //  * https://rescript-lang.org/docs/manual/v12.0.0/scoped-polymorphic-types

  // type basicAcceptedElems = CheerioElement(cheerioElement) | String(string)
  // type initializedCheerio = basicAcceptedElems => queriedCheerio
  // type initializedCheerio<'a> = 'a => queriedCheerio

  // @module
  // external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => initializedCheerio} =
  // "cheerio"

  // @module
  // external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'a => queriedCheerio} =
  //   "cheerio"

  // let load = (html, maybeOptions, isDocument) => {
  //   let selectorFunction = cheerio["load"](html, maybeOptions, isDocument)
  //   let betterSelectorFunction = basicAcceptedElems =>
  //     switch basicAcceptedElems {
  //     | String(str) => selectorFunction(str)
  //     | CheerioElement(el) => selectorFunction(el)
  //     }

  //   betterSelectorFunction
  // }

  // NEW TRY

  // type basicAcceptedElems = 'a. 'a => queriedCheerio
  // // type basicAcceptedElems = CheerioElement(cheerioElement) | String(string)

  // // type logger = 'a. 'a => unit
  // type logger = {log: 'a. 'a => unit}

  // let fun = logger => {
  //   logger.log("a")
  //   logger.log(1)
  // }

  // type loadType = {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'a. 'a => queriedCheerio}

  // @module
  // external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'a => queriedCheerio} =
  //   "cheerio"

  // let load = (html, maybeOptions, isDocument) => {
  //   let selectorFunction = cheerio["load"](html, maybeOptions, isDocument)
  //   let betterSelectorFunction = basicAcceptedElems =>
  //     switch basicAcceptedElems {
  //     | String(str) => selectorFunction(str)
  //     | CheerioElement(el) => selectorFunction(el)
  //     }

  //   betterSelectorFunction
  // }

  // NEW TRY

  // type element // Assuming you have a binding for Dom.element

  // @module("cheerio")
  // external load: (
  //   string,
  //   Nullable.t<'CheerioOptions>,
  //   bool,
  // ) => @this (Js.t<'a>, [@unwrap] [| '#string(string) | '#element(element)]) => Js.t<'b> = "load"

  // // @module
  // // external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'a => queriedCheerio} =
  // //   "cheerio"

  // let load = (html, maybeOptions, isDocument) => {
  //   let selectorFunction = load(html, maybeOptions, isDocument)
  //   // let selectorFunction = cheerio["load"](html, maybeOptions, isDocument)
  //   let betterSelectorFunction = basicAcceptedElems =>
  //     switch basicAcceptedElems {
  //     | String(str) => selectorFunction(str)
  //     | CheerioElement(el) => selectorFunction(el)
  //     }

  //   betterSelectorFunction
  // }

  // NEW TRY
  @module
  external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'a => queriedCheerio} =
    "cheerio"

  type basicAcceptedElems = CheerioElement(cheerioElement) | String(string)
  type loadedCheerio<'a> = (option<'a>, basicAcceptedElems) => queriedCheerio

  // %raw because I couldn't make the type of basicAcceptedElems work
  let applyElementToCheerioUnsafe = %raw(`
      function(element, selectorFunction) {
        return selectorFunction(element)
      }
    `)

  let load = (html, maybeOptions, isDocument) => {
    let loadedCheerio = cheerio["load"](html, maybeOptions, isDocument)

    let betterSelectorFunction: loadedCheerio<'a> = (unsafeFromJsLand, basicAcceptedElems) => {
      let result = switch (unsafeFromJsLand, basicAcceptedElems) {
      | (Some(stringOrElement), _) => applyElementToCheerioUnsafe(stringOrElement, loadedCheerio)
      | (None, String(str)) => applyElementToCheerioUnsafe(str, loadedCheerio)
      | (None, CheerioElement(el)) => applyElementToCheerioUnsafe(el, loadedCheerio)
      }
      result
    }

    betterSelectorFunction
  }

  let cheerioToElementArray: queriedCheerio => array<cheerioElement> = queriedCheerio => {
    queriedCheerio["toArray"]()
  }

  let getParent = element => element["parent"]
  let getParentExn = element => Belt_Option.getExn(element["parent"])
  let getChildren = element => element["children"]
  let getType = element => element["type"]
  let getData: cheerioElement => string = element => {
    if (
      getType(element) !== #text || getType(element) !== #comment || getType(element) !== #directive
    ) {
      Exn.raiseError("Trying to get 'data' from non-text element")
    }
    element["data"]
  }
  let getName = element => element["name"]
  let getColspan = element => {
    switch getType(element) {
    | #tag | #script | #style =>
      switch Nullable.toOption(Nullable.getExn(element["attribs"])["colspan"]) {
      | Some(colspan) => colspan
      | None => "1"
      }
    | _ => Exn.raiseError("Trying to get 'colspan' from non-element node")
    }
  }
  let getColspanInt = element =>
    switch Int.fromString(getColspan(element)) {
    | Some(parsed) => parsed
    | None => 1
    }

  let getText = (element, loadedCheerio) => {
    loadedCheerio(None, CheerioElement(element))["text"]()
  }
}

let _initializeCheerio = html =>
  if Js_string2.indexOf(html, "<html>") !== -1 {
    CheerioFacade.load(html, null, true)
  } else {
    CheerioFacade.load(html, null, false)
  }

let _sanityCheckHeaders: CheerioFacade.queriedCheerio => unit = cheerioWithHeaders => {
  // todo precondition: check that cheerio really has headers
  let headerElements = CheerioFacade.cheerioToElementArray(cheerioWithHeaders)
  let parent = headerElements[0]->Option.getExn->CheerioFacade.getParentExn

  let maybeInvalidHeader = Array.find(headerElements, header => {
    CheerioFacade.getParentExn(header) !== parent
  })

  switch maybeInvalidHeader {
  | Some(invalidHeader) => {
      let thText =
        CheerioFacade.getChildren(invalidHeader)
        ->Array.map(CheerioFacade.getData)
        ->Array.toString
      let expected = parent->CheerioFacade.getName
      let actual =
        invalidHeader
        ->CheerioFacade.getParent
        ->Option.getExn
        ->CheerioFacade.getName

      Error.panic(
        `Multiple headline rows--that's bad. <th>${thText}</th>. Expected parent element ${expected}, but was ${actual}`,
      )
    }
  | None => ()
  }
}

let parseIntOr = (maybeString, fallback) =>
  switch Int.fromString(maybeString) {
  | Some(n) => n
  | None => fallback
  }

let removeInnerWhiteSpace = text => {
  // Line breaks in HTML can cause weird amount of whitespace.
  // Removes also inner linebreaks.
  text->String.replaceRegExp(/\s+/g, " ")->String.trim
}

type cell = {
  colStart: int,
  colEnd: int,
  linesOfText: array<string>,
}

let _getHeaderCells: CheerioFacade.loadedCheerio<'a> => array<cell> = loadedCheerio => {
  let ths = loadedCheerio(None, CheerioFacade.String("th"))
  _sanityCheckHeaders(ths)

  let thElements = CheerioFacade.cheerioToElementArray(ths)
  let columnCount =
    thElements
    ->Array.map(th => CheerioFacade.getColspanInt(th))
    ->Array.reduce(0, (prev, curr) => prev + curr)

  Console.log(
    `Found ${Array.length(
        thElements,
      )->Int.toString} table headers (spanning ${columnCount->Int.toString} columns).`,
  )

  thElements->Array.reduceWithIndex([], (headers, header, headerIdx) => {
    let maybePreviousCol = headers->Array.get(headerIdx - 1)->Option.map(h => h.colEnd)
    let colStart = switch maybePreviousCol {
    | Some(colEnd) => colEnd + 1
    | None => 0
    }
    let colEnd = colStart + CheerioFacade.getColspanInt(header) - 1
    let linesOfText = [removeInnerWhiteSpace(CheerioFacade.getText(header, loadedCheerio))]
    headers->Array.concat([{colStart, colEnd, linesOfText}])
  })
}
