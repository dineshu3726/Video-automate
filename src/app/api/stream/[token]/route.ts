import { NextResponse } from 'next/server'
import { decodeVideoToken } from '@/lib/videoToken'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const videoId = decodeVideoToken(token)
  if (!videoId) {
    return new NextResponse('Not found', { status: 404 })
  }

  // Serve a self-contained HTML page that embeds the YouTube player.
  // Overlay divs cover the YouTube logo areas so platform origin is hidden.
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:100%;height:100%;background:#000;overflow:hidden}
  .wrap{position:relative;width:100%;height:100%}
  iframe{position:absolute;inset:0;width:100%;height:100%;border:none}

  /* ── Logo mask overlays ───────────────────────────────────────────────
     YouTube branding appears in two places:
       1. Top-right watermark (appears ~8s after play starts)
       2. Bottom-right "Watch on YouTube" button inside controls bar
     pointer-events:none so seek / fullscreen controls still work.
  ──────────────────────────────────────────────────────────────────── */
  .mask{
    position:absolute;
    background:#000;
    z-index:10;
    pointer-events:none;
  }
  /* Top-right YouTube watermark */
  .mask-tr{top:8px;right:8px;width:90px;height:28px;border-radius:4px}
  /* Bottom-right "Watch on YouTube" button in control bar */
  .mask-br{bottom:0;right:0;width:200px;height:46px}
  /* Top-left channel name that may appear briefly */
  .mask-tl{top:8px;left:8px;width:220px;height:28px;border-radius:4px}
</style>
</head>
<body>
<div class="wrap">
  <iframe
    src="https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&cc_load_policy=0&disablekb=0&fs=1&color=white"
    allow="autoplay; encrypted-media; fullscreen; picture-in-picture; clipboard-write"
    allowfullscreen
    referrerpolicy="no-referrer"
  ></iframe>
  <div class="mask mask-tr"></div>
  <div class="mask mask-br"></div>
  <div class="mask mask-tl"></div>
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // Prevent the proxy page itself from being indexed or cached externally
      'X-Robots-Tag': 'noindex',
      'Cache-Control': 'private, no-store',
    },
  })
}
