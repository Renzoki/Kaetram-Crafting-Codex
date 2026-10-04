export default async function handler(req, res) {
  const path = [].concat(req.query.path || []).join('/')

  if (!path.startsWith('v1/')) {
    res.status(404).json({ error: 'Not found' })
    return
  }

  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : ''

  try {
    const upstream = await fetch(`https://api.kaetram.com/api/${path}${qs}`)
    res.status(upstream.status)

    const type = upstream.headers.get('content-type')
    if (type) res.setHeader('Content-Type', type)
    if (upstream.ok) {
      res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
    }

    res.send(Buffer.from(await upstream.arrayBuffer()))
  } catch (e) {
    res.status(502).json({ error: 'Could not reach the Kaetram API' })
  }
}
