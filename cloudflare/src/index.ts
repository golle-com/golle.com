const REAL_DEBRID_API = 'https://api.real-debrid.com'

type Env = {
  ALLOWED_ORIGINS?: string
}

function parseAllowedOrigins(value?: string): string[] {
  if (!value) {
    return ['*']
  }

  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

function pickAllowOrigin(requestOrigin: string | null, allowedOrigins: string[]): string {
  if (allowedOrigins.includes('*')) {
    return '*'
  }

  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin
  }

  return allowedOrigins[0] ?? 'null'
}

function corsHeaders(allowOrigin: string): Headers {
  const headers = new Headers()
  headers.set('Access-Control-Allow-Origin', allowOrigin)
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, Accept')
  headers.set('Access-Control-Max-Age', '86400')
  headers.set('Vary', 'Origin')
  return headers
}

function badRequest(message: string, allowOrigin: string): Response {
  const headers = corsHeaders(allowOrigin)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers,
  })
}

function blockedOrigin(allowOrigin: string): Response {
  const headers = corsHeaders(allowOrigin)
  headers.set('Content-Type', 'application/json')
  return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
    status: 403,
    headers,
  })
}

function shouldForwardPath(pathname: string): boolean {
  return pathname.startsWith('/rest/') || pathname.startsWith('/oauth/')
}

function appendForwardedFor(existing: string | null, clientIp: string): string {
  if (!existing || !existing.trim()) {
    return clientIp
  }

  return `${existing}, ${clientIp}`
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const allowedOrigins = parseAllowedOrigins(env.ALLOWED_ORIGINS)
    const requestOrigin = request.headers.get('Origin')
    const allowOrigin = pickAllowOrigin(requestOrigin, allowedOrigins)

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(allowOrigin),
      })
    }

    if (allowedOrigins[0] !== '*' && requestOrigin && !allowedOrigins.includes(requestOrigin)) {
      return blockedOrigin(allowOrigin)
    }

    const requestUrl = new URL(request.url)

    if (requestUrl.pathname === '/time') {
      const headers = corsHeaders(allowOrigin)
      headers.set('Content-Type', 'application/json')
      return new Response(
        JSON.stringify({
          now: new Date().toISOString(),
          ok: true,
        }),
        {
          status: 200,
          headers,
        },
      )
    }

    if (!shouldForwardPath(requestUrl.pathname)) {
      return badRequest('Only /rest/* and /oauth/* paths are supported', allowOrigin)
    }

    const upstreamUrl = `${REAL_DEBRID_API}${requestUrl.pathname}${requestUrl.search}`
    const upstreamHeaders = new Headers(request.headers)
    const clientIp = request.headers.get('CF-Connecting-IP')
    upstreamHeaders.set('Host', new URL(REAL_DEBRID_API).host)
    upstreamHeaders.delete('Origin')

    if (clientIp) {
      const existingForwardedFor = upstreamHeaders.get('X-Forwarded-For')
      upstreamHeaders.set('X-Forwarded-For', appendForwardedFor(existingForwardedFor, clientIp))
      upstreamHeaders.set('X-Real-IP', clientIp)
    }

    const upstreamResponse = await fetch(upstreamUrl, {
      method: request.method,
      headers: upstreamHeaders,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'follow',
    })

    const responseHeaders = new Headers(upstreamResponse.headers)
    const cors = corsHeaders(allowOrigin)
    cors.forEach((value, key) => {
      responseHeaders.set(key, value)
    })

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: responseHeaders,
    })
  },
}
