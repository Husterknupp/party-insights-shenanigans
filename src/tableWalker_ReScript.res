module CheerioFacade = {
  //    field "name" not available for type "text"
  //    e.g., <div>, <span>
  //  type tagNode = {...node, "name": string}
  //  type dataNode = {...node, "data": string}
  //  type cheerioElement = TagNode(tagNode) | DataNode(dataNode)

  // see node_modules/domhandler/lib/node.d.ts -> class "Node"
  type rec cheerioElement = {
    //    only type="text"
    "data": string,
    //    only type="tag"
    "name": string,
    //    e.g., "tag" (<div>, <span>), "text" (has 'data' attribute)
    "type": string,
    //    special type: "ParentNode"
    "parent": option<cheerioElement>,
    //    special type: "ChildNode"
    "prev": option<cheerioElement>,
    //    special type: "ChildNode"
    "next": option<cheerioElement>,
    //    children can only be type type: "ChildNode"
    "children": array<cheerioElement>,
  }
  type queriedCheerio = {"toArray": unit => array<cheerioElement>}
  type initializedCheerio = string => queriedCheerio

  @module
  external cheerio: {"load": (string, Nullable.t<'CheerioOptions>, bool) => initializedCheerio} =
    "cheerio"

  let load = (html, maybeOptions, isDocument) => {
    cheerio["load"](html, maybeOptions, isDocument)
  }

  let cheerioToElementArray = cheerio => {
    cheerio["toArray"]()
  }

  let getParent = element => element["parent"]
  let getChildren = element => element["children"]
  let getType = element => element["type"]
  let getData = element => {
    if getType(element) !== "text" {
      Exn.raiseError("Trying to get 'data' from non-text element")
    }
    element["data"]
  }
  let getName = element => element["name"]
}

let _initializeCheerio = html =>
  if Js_string2.indexOf(html, "<html>") !== -1 {
    CheerioFacade.load(html, null, true)
  } else {
    CheerioFacade.load(html, null, false)
  }

let _sanityCheckHeaders: CheerioFacade.queriedCheerio => unit = cheerioWithHeaders => {
  let headerElements = CheerioFacade.cheerioToElementArray(cheerioWithHeaders)
  let parent = Belt_Array.getExn(headerElements, 0)->CheerioFacade.getParent->Belt_Option.getExn

  let maybeInvalidHeader = Belt_Array.getBy(headerElements, header => {
    CheerioFacade.getParent(header)->Belt_Option.getExn !== parent
  })

  switch maybeInvalidHeader {
  | Some(invalidHeader) => {
      let thText =
        CheerioFacade.getChildren(invalidHeader)
        ->Belt_Array.map(CheerioFacade.getData)
        ->Array.toString
      let expected = parent->CheerioFacade.getName
      let actual =
        invalidHeader
        ->CheerioFacade.getParent
        ->Belt_Option.getExn
        ->CheerioFacade.getName

      Error.raise(
        Error.make(
          `Multiple headline rows--that's bad. <th>${thText}</th>. Expected parent element ${expected}, but was ${actual}`,
        ),
      )
    }
  | None => ()
  }
}
