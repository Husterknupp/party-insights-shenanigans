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

let _serverAllowsRequestsAgain = (axiosError, retryCount, url) => {
  let retryAfter =
    axiosError.response.headers
    ->Dict.get("retry-after")
    ->Option.map(retryAfter => {
      let res = Int.fromString(retryAfter)
      res->Option.getExn(~message="Could not parse 'retry-after' Header. Failing request retry")
    })
    ->Option.getExn(
      ~message=`Trying to retry request. Failed to read 'retry-after' header: ${axiosError.response.headers
        ->Dict.get("retry-after")
        ->Option.getOr("")}`,
    )

  Console.log(
    `${Int.toString(
        retryCount,
      )}. try. Caught 429. Will try again in ${retryAfter->Int.toString}s. URL: ..${url->String.substringToEnd(
        ~start=url->String.length - 10,
      )}`,
  )
  Js_promise.make((~resolve, ~reject) => {
    ignore(setTimeout(resolve, retryAfter * 1000))
  })
}

let rec getWithRetry = async (url, maybeConfig, ~retryCount=1): response<'a> => {
  let maxRetries = 3
  switch retryCount {
  | retryCount if retryCount <= maxRetries =>
    try {
      await defaultExport.get(url, maybeConfig)
    } catch {
    | JsError(e) =>
      switch asJsError(e).name {
      | "AxiosError" => {
          await _serverAllowsRequestsAgain(asAxiosError(e), retryCount, url)
          await getWithRetry(url, maybeConfig, ~retryCount=retryCount + 1)
        }
      | "AggregateError" => await getWithRetry(url, maybeConfig, ~retryCount=retryCount + 1)
      | _ => Exn.raiseError(`GET request failed unexpectedly. URL: ${url}`)
      }
    }
  | _ => Exn.raiseError(`Tried ${maxRetries->Int.toString} times. Giving up. URL ${url}`)
  }
}

let defaultConfig: axiosRequestConfig = {
  headers: {
    userAgent: "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
  },
}
