//    field "name" not available for type "text"
//    e.g., <div>, <span>
//  type tagNode = {...node, "name": string}
//  type dataNode = {...node, "data": string}
//  type cheerioElement = TagNode(tagNode) | DataNode(dataNode)

type elementType = [
  | #root
  | #text
  | #directive
  | #comment
  | #script
  | #style
  | #tag
  | #cdata
  | #doctype
]

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
  "type": elementType,
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
    "rowspan": Nullable.t<string>,
  }>,
  //    children can only be type: "ChildNode"
  "children": array<cheerioElement>,
  // END class Element

  // type ParentNode = Document | Element | CDATA;
  // type ChildNode = Text | Comment | ProcessingInstruction | Element | CDATA | Document;

  // This seems to be jquery API--not sure how this ends up in the domhandler API
  "attr": string => Nullable.t<string>,
}

// cheerio's load function return type:
//  * node_modules/cheerio/src/load.ts
//  * https://rescript-lang.org/docs/manual/v12.0.0/variant#interop-with-javascript
//  * https://rescript-lang.org/docs/manual/v11.0.0/bind-to-js-function#modeling-polymorphic-function
//  * https://rescript-lang.org/docs/manual/v12.0.0/scoped-polymorphic-types

type rec queriedCheerio = {
  "toArray": unit => array<cheerioElement>,
  "text": unit => string,
  "length": int,
  "each": ((int, cheerioElement) => unit) => unit,
  "find": string => queriedCheerio,
  "remove": unit => queriedCheerio,
  "contents": unit => queriedCheerio,
  "last": unit => cheerioElement,
}

@module
external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => 'a => queriedCheerio} =
  "cheerio"

type basicAcceptedElems = AnyNode(cheerioElement) | StringSelector(string)
type unsafeJsCheerio
type loadedCheerio = (option<unsafeJsCheerio>, basicAcceptedElems) => queriedCheerio

let load = (html, maybeOptions, isDocument) => {
  let loadedCheerio = cheerio["load"](html, maybeOptions, isDocument)

  // %raw because I couldn't make the type of basicAcceptedElems work
  let applyElementToCheerioUnsafe = %raw(`
      function(element, selectorFunction) {
        return selectorFunction(element)
      }
    `)

  let betterSelectorFunction: loadedCheerio = (unsafeFromJsLand, basicAcceptedElems) => {
    let result = switch (unsafeFromJsLand, basicAcceptedElems) {
    | (Some(stringOrElement), _) => applyElementToCheerioUnsafe(stringOrElement, loadedCheerio)
    | (None, StringSelector(str)) => applyElementToCheerioUnsafe(str, loadedCheerio)
    | (None, AnyNode(el)) => applyElementToCheerioUnsafe(el, loadedCheerio)
    }
    result
  }

  betterSelectorFunction
}
let cheerioToElementArray: queriedCheerio => array<cheerioElement> = queriedCheerio => {
  queriedCheerio["toArray"]()
}
let getParent = element => element["parent"]
let getParentExn = element => Option.getExn(element["parent"])
let getChildren = element => element["children"]
let getType: cheerioElement => elementType = element => element["type"]
let getData: cheerioElement => string = element => {
  if (
    getType(element) !== #text && getType(element) !== #comment && getType(element) !== #directive
  ) {
    Error.panic("Trying to get 'data' from non-text element")
  }
  element["data"]
}
let getName: cheerioElement => string = element => element["name"]
let getColspan = element => {
  switch getType(element) {
  | #tag | #script | #style =>
    switch Nullable.toOption(Nullable.getExn(element["attribs"])["colspan"]) {
    | Some(colspan) => colspan
    | None => "1"
    }
  | _ => Error.panic("Trying to get 'colspan' from non-element node")
  }
}
let getColspanInt = element =>
  switch Int.fromString(getColspan(element)) {
  | Some(parsed) => parsed
  | None => 1
  }
let getRowspan = element => {
  switch getType(element) {
  | #tag | #script | #style =>
    switch Nullable.toOption(Nullable.getExn(element["attribs"])["rowspan"]) {
    | Some(rowspan) => rowspan
    | None => "1"
    }
  | _ => Error.panic("Trying to get 'rowspan' from non-element node")
  }
}
let getRowspanInt = element =>
  switch Int.fromString(getRowspan(element)) {
  | Some(parsed) => parsed
  | None => 1
  }
let getText: (cheerioElement, loadedCheerio) => string = (element, loadedCheerio) => {
  loadedCheerio(None, AnyNode(element))["text"]()
}
let getLengthString: queriedCheerio => string = queriedCheerio => {
  queriedCheerio["length"]->Int.toString
}
let each: (queriedCheerio, 'a) => unit = (queriedCheerio, callback) => {
  queriedCheerio["each"](callback)
}
let find: (queriedCheerio, string) => queriedCheerio = (queriedCheerio, queryString) => {
  queriedCheerio["find"](queryString)
}
let remove: queriedCheerio => queriedCheerio = queriedCheerio => {
  queriedCheerio["remove"]()
}
let contents: queriedCheerio => queriedCheerio = queriedCheerio => queriedCheerio["contents"]()
let getLast: queriedCheerio => cheerioElement = queriedCheerio => {
  queriedCheerio["last"]()
}
let getSrc: cheerioElement => option<string> = element => {
  element["attr"]("src")->Nullable.toOption
}
