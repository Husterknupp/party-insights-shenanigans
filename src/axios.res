type axiosRequestConfig
type request

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
