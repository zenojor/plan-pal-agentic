import app from '../apps/api/src/index'
import staticAssets from 'sites:static-assets'

type StaticAsset = {
  body: string
  contentType: string
}

export default {
  async fetch(request: Request, environment: unknown, executionContext: unknown) {
    const url = new URL(request.url)

    if (!url.pathname.startsWith('/api/')) {
      const assetPath = url.pathname === '/' ? '/index.html' : url.pathname
      const asset = (staticAssets as Record<string, StaticAsset>)[assetPath]
      if (asset && (request.method === 'GET' || request.method === 'HEAD')) {
        return staticAssetResponse(asset, request.method === 'HEAD')
      }

      if (request.method === 'GET' && request.headers.get('accept')?.includes('text/html')) {
        return staticAssetResponse((staticAssets as Record<string, StaticAsset>)['/index.html'])
      }
    }

    return app.fetch(request, environment, executionContext)
  },
}

function staticAssetResponse(asset: StaticAsset, head = false) {
  return new Response(head ? null : decodeBase64(asset.body), {
    headers: {
      'Cache-Control': asset.contentType.startsWith('text/html')
        ? 'no-cache'
        : 'public, max-age=31536000, immutable',
      'Content-Type': asset.contentType,
    },
  })
}

function decodeBase64(value: string) {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}
