open Axios
open CheerioFacade
open OutputHelpers

type politician = {
  mutable amt: string,
  name: string,
  imageUrl: string,
  party: string,
}

type ministerpraesident = {
  state: string,
  name: string,
  party: string,
  imageUrl: string,
  urlCabinet: string,
}

let createImageFiles = (ministerpraesidenten) => {
  let promises =
    ministerpraesidenten
    ->Array.map(ministerpraesident => {
      let headers = {User-Agent: "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)"}
      let config = Some({headers: headers})
      Axios
        .get(ministerpraesident.imageUrl, config)
        ->Js.Promise.then_(image => {
          let filename =
            "output-images/ministerpraesidenten/" ++
            ministerpraesident.name ++
            ".jpg"
          Js.Promise.resolve(
            writeFileSync(
              filename,
              image->response##data,
              {encoding: "base64"},
            )
          )
        })
    })
  )
  Js.Promise.all(promises)
  |> Js.Promise.then_(_ => Js.Promise.resolve(()))
}

let findPoliticians = (html) => {
  let cheerioInstance = CheerioFacade.loadCheerio(html)
  let wikiHeadline = "Amtierende Regierungschefs"
  
  let headlineElement =
    CheerioFacade.find(cheerioInstance, None, CheerioFacade.StringSelector(`h2:contains(${wikiHeadline})`))
    ->Option.getExn(~message="Could not find headline: " ++ wikiHeadline)
  
  let tableElement =
    headlineElement
    ->parent()
    ->siblings()
    ->next("table:first")
    ->Option.getExn(~message="Could not find table after headline")
  
  let rows =
    tableElement
    ->find("tr:has(td)")
  
  switch CheerioFacade.getLength(rows) {
  | 0 => Js.Promise.reject(Error.panic("Could not find any rows with data in the table"))
  | n =>
    let resultRows =
      rows
      ->Array.filter(row => {
        let cells =
          CheerioFacade.find(row, None, CheerioFacade.StringSelector("td"))
          ->Array.toJsArray(0)
        
        CheerioFacade.getLength(cells) > 0
      })
      ->Array.map(row => {
        let cells =
          CheerioFacade.find(row, None, CheerioFacade.StringSelector("td"))
          ->Array.toJsArray(0)
        
        let stateElement =
          cells
          ->Array.get(0)
          ->Option.getExn(~message="Missing state cell")
          ->find("[style=\"display:none;\"]")
          ->Option.getExn(~message="Missing state element")
        
        let stateText =
          stateElement
          ->text()
          ->Option.getExn(~message="Could not get state text")
        
        let nameElement =
          cells
          ->Array.get(1)
          ->Option.getExn(~message="Missing name cell")
          ->find("a")
          ->Option.getExn(~message="Missing name link")
        
        let nameHref =
          nameElement
          ->attr("href")
          ->Option.getExn(~message="Missing name href")
        
        let imageElement =
          cells
          ->Array.get(2)
          ->Option.getExn(~message="Missing image cell")
          ->find("img")
          ->Option.getExn(~message="Missing image element")
        
        let imageSrc =
          imageElement
          ->attr("src")
          ->Option.getExn(~message="Missing image src")
        
        let partyElement =
          cells
          ->Array.get(4)
          ->Option.getExn(~message="Missing party cell")
          ->text()
          ->Option.getExn(~message="Could not get party text")
        
        let cabinetElement =
          cells
          ->Array.get(9)
          ->Option.getExn(~message="Missing cabinet cell")
          ->find("a")
          ->Option.getExn(~message="Missing cabinet link")
        
        let cabinetHref =
          cabinetElement
          ->attr("href")
          ->Option.getExn(~message="Missing cabinet href")
        
        switch (stateText, nameHref, imageSrc, partyElement, cabinetHref) {
        | (Some(stateTxt), Some(nameHrefVal), Some(imageSrcVal), Some(partyTxt), Some(cabinetHrefVal)) => {
            let imageUrlProcessed =
              imageSrcVal
              ->Js.String.split("/")
              ->Array.slice(0, -1)
              ->Array.join("/")
              ->++("/400px-")
              ->++(imageSrcVal
                    ->Js.String.split("/")
                    ->Array.getExn(->Array.length - 1))
            
            let urlCabinetProcessed = "https://de.wikipedia.org" ++ cabinetHrefVal
            
            {
              state: stateTxt,
              name: nameHrefVal,
              party: partyTxt,
              imageUrl: imageUrlProcessed,
              urlCabinet: urlCabinetProcessed
            }
          }
        | _ => Js.Promise.reject(Error.panic("Missing required data in row"))
        }
      })
    )
  
  switch Js.Array.length(resultRows) {
  | 0 => Js.Promise.reject(Error.panic("Could not extract any Ministerpräsidenten"))
  | n => Js.Promise.resolve(resultRows)
  }
}

let saveToOutputfiles = (ministerpraesidenten) => {
  let sorted = ministerpraesidenten->Array.sort((pA, pB) => pA.state->String.localeCompare(pB.state))
  Js.Promise.all([
    writeAsJson("output/ministerpraesidenten.json", sorted),
    writeAsMarkdown(
      "output/ministerpraesidenten.md",
      "Ministerpräsidenten",
      sorted,
    ),
    createImageFiles(sorted),
  ])
  |> Js.Promise.then_(_ => Js.Promise.resolve(()))
}

let extract = () => {
  let headers = {User-Agent: "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)"}
  let config = Some({headers: headers})
  Axios
    .get("https://de.wikipedia.org/wiki/Liste_der_deutschen_Ministerpr%C3%A4sidenten", config)
    ->Js.Promise.then_(response => {
      let html = response->response##data
      findPoliticians(html)
      ->Js.Promise.then_(ministerpraesidenten => saveToOutputfiles(ministerpraesidenten))
    })
}