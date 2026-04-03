type request

type axiosHeaders = {
  @as("User-Agent") userAgent: string,
}

type axiosRequestConfig = {
  headers: axiosHeaders,
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

let defaultConfig: axiosRequestConfig = {
  headers: {
    userAgent: "party-insights-shenanigans/1.0.0 (https://github.com/Husterknupp/party-insights-shenanigans)",
  },
}
