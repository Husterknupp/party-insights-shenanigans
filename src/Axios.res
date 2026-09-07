type request

type axiosHeaders = {@as("User-Agent") userAgent: string}

type axiosRequestConfig = {
  headers: axiosHeaders,
  responseType?: string,
}

type response<'dataType> = {
  data: 'dataType,
  status: int,
  statusText: string,
  headers: Dict.t<string>,
  config: axiosRequestConfig /* AxiosRequestConfig */,
  request: request /* request: any // (can be an XMLHttpRequest, http.ClientRequest, etc.) */,
}

type axios<'a> = {get: (string, option<axiosRequestConfig>) => Promise.t<response<'a>>}

@module("axios") external defaultExport: axios<'a> = "default"

let get = defaultExport.get

// ON THE TOPIC OF ERRORS

/*
"message": "Error",
"name": "AggregateError",
"code": "ETIMEDOUT"
*/

/*
"message": "Request failed with status code 429",
"name": "AxiosError",
"code": "ERR_BAD_REQUEST",
"status": 429
*/

type error = {message: string, name: string, code: string}
type axiosError = {response: response<string>, status: int}
type aggregateError

external asJsError: unknown => error = "%identity"
external asAxiosError: unknown => axiosError = "%identity"

let _serverAllowsRequestsAgain = (axiosError, retryCount) => {
  let retryAfter =
    axiosError.response.headers
    ->Dict.get("retry-after")
    ->Option.map(retryAfter => {
      Int.fromString(retryAfter)->Option.getUnsafe
    })
    ->Option.getUnsafe

  Console.log(
    `Caught 429. Will try again in ${retryAfter->Int.toString}s. That will be try no. ${Int.toString(
        retryCount + 1,
      )} for that URL`,
  )
  Js_promise.make((~resolve, ~reject) => {
    ignore(setTimeout(resolve, retryAfter * 1000))
  })
}

let rec getWithRetry = async (url, maybeConfig, ~retryCount=1): response<'a> => {
  switch retryCount {
  | 1
  | 2
  | 3 =>
    try {
      await defaultExport.get(url, maybeConfig)
    } catch {
    | JsError(e) =>
      switch asJsError(e).name {
      | "AxiosError" => {
          await _serverAllowsRequestsAgain(asAxiosError(e), retryCount)
          await getWithRetry(url, maybeConfig, ~retryCount=retryCount + 1)
        }
      | _ => Exn.raiseError("aggregateError")
      }
    }
  | _ => Exn.raiseError("Tried 3 times but failed constantly")
  }
}

let defaultConfig: axiosRequestConfig = {
  headers: {
    userAgent: "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
  },
}
