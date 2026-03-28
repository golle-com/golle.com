const PROXY_BASE_URL = 'https://rd-proxy.golle.workers.dev'
const API_BASE_URL = `${PROXY_BASE_URL}/rest/1.0`
const OAUTH_BASE_URL = `${PROXY_BASE_URL}/oauth/v2`

export type RdError = {
  error: string
  error_code?: number
  status?: number
}

type RdRequestError = Error & RdError

type RdRequestConfig = {
  method: NonNullable<RequestInit['method']>
  accessToken?: string
  formBody?: URLSearchParams
}

export type DeviceCodeResponse = {
  device_code: string
  user_code: string
  interval: number
  expires_in: number
  verification_url: string
}

export type CredentialsResponse = {
  client_id: string
  client_secret: string
}

export type TokenResponse = {
  access_token: string
  expires_in: number
  token_type: 'Bearer'
  refresh_token: string
}

export type DownloadItem = {
  id: string
  filename: string
  filesize: number
  host: string
  status?: string
  download?: string
  generated?: string
}

export type TorrentItem = {
  id: string
  filename: string
  status?: string
  progress?: number
  bytes?: number
  original_bytes?: number
  added?: string
}

export type TorrentInfoFile = {
  id: number
  path?: string
  name?: string
  bytes?: number
  selected: 0 | 1
}

export type TorrentInfo = {
  id: string
  filename?: string
  status?: string
  progress?: number
  bytes?: number
  original_bytes?: number
  files: TorrentInfoFile[]
}

export type AddMagnetResponse = {
  id: string
}

export type UserInfo = {
  id: number
  username: string
  email?: string
  points?: number
  locale?: string
  avatar?: string
  type?: string
  premium?: number
  expiration?: string
}

export type UnrestrictCheckResponse = {
  host?: string
  link?: string
  filename?: string
  filesize?: number
  supported?: number
  streamable?: number
  [key: string]: unknown
}

export type UnrestrictLinkResponse = {
  id?: string
  filename?: string
  filesize?: number
  host?: string
  link?: string
  download?: string
  chunks?: number
  crc?: number
  streamable?: number
  [key: string]: unknown
}

export type UnrestrictFolderResponse = {
  links?: string[]
  [key: string]: unknown
}

export type HostItem = {
  id?: string
  name?: string
  image?: string
  [key: string]: unknown
}

export type HostStatusItem = {
  [key: string]: unknown
}

export type HostRegexItem = {
  [key: string]: unknown
}

function createRdError(message: string, status?: number, errorCode?: number): RdRequestError {
  const error = new Error(message) as RdRequestError
  error.error = message
  if (typeof status === 'number') {
    error.status = status
  }
  if (typeof errorCode === 'number') {
    error.error_code = errorCode
  }
  return error
}

function parseRdErrorPayload(payload: unknown): Pick<RdError, 'error' | 'error_code'> {
  if (!payload || typeof payload !== 'object') {
    return { error: 'Request failed.' }
  }

  const candidate = payload as { error?: unknown; error_code?: unknown }
  const message = typeof candidate.error === 'string' && candidate.error.length > 0 ? candidate.error : 'Request failed.'
  const errorCode = typeof candidate.error_code === 'number' ? candidate.error_code : undefined

  return {
    error: message,
    error_code: errorCode,
  }
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text()
  const json: unknown = text ? JSON.parse(text) : null

  if (!response.ok) {
    const errorPayload = parseRdErrorPayload(json)
    throw createRdError(errorPayload.error, response.status, errorPayload.error_code)
  }

  return json as T
}

function createRequestInit(config: RdRequestConfig): RequestInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }

  if (config.accessToken) {
    headers.Authorization = `Bearer ${config.accessToken}`
  }

  if (config.formBody) {
    headers['Content-Type'] = 'application/x-www-form-urlencoded'
  }

  return {
    method: config.method,
    headers,
    body: config.formBody?.toString(),
  }
}

async function fetchRdJson<T>(url: string, config: RdRequestConfig): Promise<T> {
  const response = await fetch(url, createRequestInit(config))
  return parseJsonResponse<T>(response)
}

async function fetchRdOk(url: string, config: RdRequestConfig): Promise<void> {
  const response = await fetch(url, createRequestInit(config))

  if (!response.ok) {
    const payload: unknown = await response.json()
    const parsed = parseRdErrorPayload(payload)
    throw createRdError(parsed.error, response.status, parsed.error_code)
  }
}

export async function getDeviceCode(clientId: string, newCredentials: boolean) {
  const url = new URL(`${OAUTH_BASE_URL}/device/code`)
  url.searchParams.set('client_id', clientId)
  if (newCredentials) {
    url.searchParams.set('new_credentials', 'yes')
  }

  return fetchRdJson<DeviceCodeResponse>(url.toString(), {
    method: 'GET',
  })
}

export async function getDeviceCredentials(clientId: string, deviceCode: string) {
  const url = new URL(`${OAUTH_BASE_URL}/device/credentials`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('code', deviceCode)

  return fetchRdJson<CredentialsResponse>(url.toString(), {
    method: 'GET',
  })
}

export async function getTokenWithDeviceCode(
  clientId: string,
  clientSecret: string,
  deviceCode: string,
) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: deviceCode,
    grant_type: 'http://oauth.net/grant_type/device/1.0',
  })

  return fetchRdJson<TokenResponse>(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    formBody: body,
  })
}

export async function getTokenWithRefreshToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
) {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code: refreshToken,
    grant_type: 'http://oauth.net/grant_type/device/1.0',
  })

  return fetchRdJson<TokenResponse>(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    formBody: body,
  })
}

export async function getDownloads(accessToken: string) {
  return fetchRdJson<DownloadItem[]>(`${API_BASE_URL}/downloads`, {
    method: 'GET',
    accessToken,
  })
}

export async function getTorrents(accessToken: string) {
  return fetchRdJson<TorrentItem[]>(`${API_BASE_URL}/torrents`, {
    method: 'GET',
    accessToken,
  })
}

export async function getTorrentInfo(accessToken: string, id: string) {
  return fetchRdJson<TorrentInfo>(`${API_BASE_URL}/torrents/info/${id}`, {
    method: 'GET',
    accessToken,
  })
}

export async function addMagnet(accessToken: string, magnet: string) {
  const body = new URLSearchParams({
    magnet,
  })

  return fetchRdJson<AddMagnetResponse>(`${API_BASE_URL}/torrents/addMagnet`, {
    method: 'POST',
    accessToken,
    formBody: body,
  })
}

export async function selectTorrentFiles(accessToken: string, id: string, files: string) {
  const body = new URLSearchParams({
    files,
  })

  return fetchRdOk(`${API_BASE_URL}/torrents/selectFiles/${id}`, {
    method: 'POST',
    accessToken,
    formBody: body,
  })
}

export async function getUserInfo(accessToken: string) {
  return fetchRdJson<UserInfo>(`${API_BASE_URL}/user`, {
    method: 'GET',
    accessToken,
  })
}

export async function getUnrestrictCheck(accessToken: string, link: string, password?: string) {
  const url = new URL(`${API_BASE_URL}/unrestrict/check`)
  url.searchParams.set('link', link)
  if (password?.trim()) {
    url.searchParams.set('password', password)
  }

  return fetchRdJson<UnrestrictCheckResponse>(url.toString(), {
    method: 'GET',
    accessToken,
  })
}

export async function getHosts(accessToken: string) {
  return fetchRdJson<HostItem[] | Record<string, HostItem | string>>(`${API_BASE_URL}/hosts`, {
    method: 'GET',
    accessToken,
  })
}

export async function getHostsStatus(accessToken: string) {
  return fetchRdJson<Record<string, HostStatusItem | string | number>>(`${API_BASE_URL}/hosts/status`, {
    method: 'GET',
    accessToken,
  })
}

export async function getHostsDomains(accessToken: string) {
  return fetchRdJson<Record<string, string[] | string> | string[]>(`${API_BASE_URL}/hosts/domains`, {
    method: 'GET',
    accessToken,
  })
}

export async function getHostsRegex(accessToken: string) {
  return fetchRdJson<Record<string, HostRegexItem | string | string[]> | HostRegexItem[] | string[]>(`${API_BASE_URL}/hosts/regex`, {
    method: 'GET',
    accessToken,
  })
}

export async function unrestrictLink(accessToken: string, link: string, password?: string, remote?: boolean) {
  const body = new URLSearchParams({
    link,
  })

  if (password?.trim()) {
    body.set('password', password)
  }

  if (typeof remote === 'boolean') {
    body.set('remote', remote ? '1' : '0')
  }

  return fetchRdJson<UnrestrictLinkResponse>(`${API_BASE_URL}/unrestrict/link`, {
    method: 'POST',
    accessToken,
    formBody: body,
  })
}

export async function unrestrictFolder(accessToken: string, link: string) {
  const body = new URLSearchParams({
    link,
  })

  return fetchRdJson<UnrestrictFolderResponse | string[]>(`${API_BASE_URL}/unrestrict/folder`, {
    method: 'POST',
    accessToken,
    formBody: body,
  })
}

export async function deleteDownload(accessToken: string, id: string) {
  return fetchRdOk(`${API_BASE_URL}/downloads/delete/${id}`, {
    method: 'DELETE',
    accessToken,
  })
}

export async function deleteTorrent(accessToken: string, id: string) {
  return fetchRdOk(`${API_BASE_URL}/torrents/delete/${id}`, {
    method: 'DELETE',
    accessToken,
  })
}
