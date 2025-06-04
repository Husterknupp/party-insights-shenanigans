type axiosRequestConfig
type request

type response<'dataType> = {
  data: 'dataType,
  status: int,
  statusText: string,
  headers: Js.Dict.t<string>,
  config: axiosRequestConfig /* AxiosRequestConfig */,
  request: request /* request: any // (can be an XMLHttpRequest, http.ClientRequest, etc.) */,
}

type getRequest<'a> = (string, option<axiosRequestConfig>) => Js.Promise.t<response<'a>>

type axios<'a> = {get: getRequest<'a>}

@module("axios") external defaultExport: axios<'a> = "default"

let get = defaultExport.get
