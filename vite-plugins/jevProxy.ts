import type { Connect, Plugin, ViteDevServer } from 'vite'
import { loadEnv } from 'vite'
import type { PreviewServer } from 'vite'
import type { IncomingMessage } from 'node:http'

const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone'

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function createJevMiddleware(apiKey: string | undefined): Connect.NextHandleFunction {
  return async (req, res, next) => {
    if (req.method !== 'POST' || !req.url?.startsWith('/api/jev-move')) {
      next()
      return
    }

    if (!apiKey) {
      res.statusCode = 500
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: 'JEV_API_KEY is not set on the server' }))
      return
    }

    try {
      const rawBody = await readBody(req)
      const upstream = await fetch(TYPESAFE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: rawBody,
      })

      const text = await upstream.text()
      res.statusCode = upstream.status
      res.setHeader('Content-Type', 'application/json')
      res.end(text)
    } catch (error) {
      res.statusCode = 502
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }))
    }
  }
}

export function jevProxyPlugin(): Plugin {
  let apiKey: string | undefined

  return {
    name: 'jev-proxy',
    configResolved(config) {
      const env = loadEnv(config.mode, process.cwd(), '')
      apiKey = env.JEV_API_KEY
    },
    configureServer(server: ViteDevServer) {
      server.middlewares.use(createJevMiddleware(apiKey))
    },
    configurePreviewServer(server: PreviewServer) {
      server.middlewares.use(createJevMiddleware(apiKey))
    },
  }
}
