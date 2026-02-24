const PROXY_BASE_URL = 'https://rd-proxy.golle.workers.dev'
const API_BASE_URL = `${PROXY_BASE_URL}/rest/1.0`
const OAUTH_BASE_URL = `${PROXY_BASE_URL}/oauth/v2`

export type RdError = {
  error: string
  error_code?: number
  status?: number
}

type RdRequestError = Error & RdError

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
  id?: number
  path?: string
  name?: string
  bytes?: number
  selected?: 0 | 1
}

export type TorrentInfo = {
  id: string
  filename?: string
  status?: string
  progress?: number
  bytes?: number
  original_bytes?: number
  files?: TorrentInfoFile[]
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

export type Settings = {
  avatar?: string
  points?: number
  // Add other settings fields as needed
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

export async function getDeviceCode(clientId: string, newCredentials: boolean) {
  const url = new URL(`${OAUTH_BASE_URL}/device/code`)
  url.searchParams.set('client_id', clientId)
  if (newCredentials) {
    url.searchParams.set('new_credentials', 'yes')
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return parseJsonResponse<DeviceCodeResponse>(response)
}

export async function getDeviceCredentials(clientId: string, deviceCode: string) {
  const url = new URL(`${OAUTH_BASE_URL}/device/credentials`)
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('code', deviceCode)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
  })

  return parseJsonResponse<CredentialsResponse>(response)
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

  const response = await fetch(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  return parseJsonResponse<TokenResponse>(response)
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

  const response = await fetch(`${OAUTH_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  return parseJsonResponse<TokenResponse>(response)
}

export async function getDownloads(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/downloads`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<DownloadItem[]>(response)
}

export async function getTorrents(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/torrents`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<TorrentItem[]>(response)
}

export async function getTorrentInfo(accessToken: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/torrents/info/${id}`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<TorrentInfo>(response)
}

export async function addMagnet(accessToken: string, magnet: string) {
  const body = new URLSearchParams({
    magnet,
  })

  const response = await fetch(`${API_BASE_URL}/torrents/addMagnet`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  return parseJsonResponse<AddMagnetResponse>(response)
}

export async function getUserInfo(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/user`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<UserInfo>(response)
}

export async function getSettings(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/settings`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<Settings>(response)
}

export async function getUnrestrictCheck(accessToken: string, link: string, password?: string) {
  const url = new URL(`${API_BASE_URL}/unrestrict/check`)
  url.searchParams.set('link', link)
  if (password?.trim()) {
    url.searchParams.set('password', password)
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<UnrestrictCheckResponse>(response)
}

export async function getHosts(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/hosts`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<HostItem[] | Record<string, HostItem | string>>(response)
}

export async function getHostsStatus(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/hosts/status`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<Record<string, HostStatusItem | string | number>>(response)
}

export async function getHostsDomains(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/hosts/domains`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<Record<string, string[] | string> | string[]>(response)
}

export async function getHostsRegex(accessToken: string) {
  const response = await fetch(`${API_BASE_URL}/hosts/regex`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  return parseJsonResponse<Record<string, HostRegexItem | string | string[]> | HostRegexItem[] | string[]>(response)
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

  const response = await fetch(`${API_BASE_URL}/unrestrict/link`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  return parseJsonResponse<UnrestrictLinkResponse>(response)
}

export async function unrestrictFolder(accessToken: string, link: string) {
  const body = new URLSearchParams({
    link,
  })

  const response = await fetch(`${API_BASE_URL}/unrestrict/folder`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  })

  return parseJsonResponse<UnrestrictFolderResponse | string[]>(response)
}

export async function deleteDownload(accessToken: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/downloads/delete/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const payload: unknown = await response.json()
    const parsed = parseRdErrorPayload(payload)
    throw createRdError(parsed.error, response.status, parsed.error_code)
  }
}

export async function deleteTorrent(accessToken: string, id: string) {
  const response = await fetch(`${API_BASE_URL}/torrents/delete/${id}`, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const payload: unknown = await response.json()
    const parsed = parseRdErrorPayload(payload)
    throw createRdError(parsed.error, response.status, parsed.error_code)
  }
}
