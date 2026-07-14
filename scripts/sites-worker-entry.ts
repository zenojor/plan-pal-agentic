import indexHtml from '../public/index.html'
import app from '../apps/api/src/index'

type SitesEnvironment = {
  ASSETS?: {
    fetch(request: Request): Promise<Response>
  }
}

export default {
  async fetch(request: Request, environment: SitesEnvironment, executionContext: unknown) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      const assetResponse = await environment.ASSETS?.fetch(request)
      if (assetResponse && assetResponse.status !== 404) {
        return assetResponse
      }

      if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
        return new Response(indexHtml, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        })
      }
    }

    return app.fetch(request, environment, executionContext)
  },
}
