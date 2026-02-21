import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Inject a WebSocket bridge shim into canvas HTML.
 *  The shim intercepts all WebSocket() calls and redirects them to our
 *  pairing server's /canvas-ws tunnel, which pipes to the gateway at
 *  ws://localhost:18789 inside the container.
 */
function injectBridgeShim(html: string, accessUrl: string): string {
  const base = accessUrl.replace(/^https?:\/\//, 'wss://')
  // Try canvasHost (18793, simpler browser auth) first, fall back to gateway (18789, node auth)
  const wsHost = base + '/canvas-ws-host'
  const wsGateway = base + '/canvas-ws'
  const shim = `<script>
(function(){
  var PROXY='${wsGateway}';
  var _WS=window.WebSocket;
  function ProxiedWS(url,proto){
    console.log('[canvas-bridge] WS intercepted url='+url+' proto='+proto);
    var ws=proto?new _WS(PROXY,proto):new _WS(PROXY);
    var origSend=ws.send.bind(ws);
    ws.send=function(data){
      console.log('[canvas-bridge] SEND type='+(typeof data)+' data='+
        (data instanceof ArrayBuffer?'ArrayBuffer('+data.byteLength+')'
        :data instanceof Blob?'Blob('+data.size+')'
        :String(data)));
      return origSend(data);
    };
    ws.addEventListener('message',function(e){
      console.log('[canvas-bridge] RECV type='+(typeof e.data)+' data='+
        (e.data instanceof ArrayBuffer?'ArrayBuffer('+e.data.byteLength+')'
        :e.data instanceof Blob?'Blob('+e.data.size+')'
        :String(e.data)));
    });
    ws.addEventListener('open',function(){console.log('[canvas-bridge] OPEN');});
    ws.addEventListener('close',function(e){console.log('[canvas-bridge] CLOSE code='+e.code+' reason='+e.reason);});
    ws.addEventListener('error',function(e){console.log('[canvas-bridge] ERROR',e);});
    return ws;
  }
  ProxiedWS.CONNECTING=0;ProxiedWS.OPEN=1;ProxiedWS.CLOSING=2;ProxiedWS.CLOSED=3;
  ProxiedWS.prototype=_WS.prototype;
  window.WebSocket=ProxiedWS;
})();
</script>`
  // Inject before </head> if present, otherwise before </body>, otherwise prepend
  if (html.includes('</head>')) return html.replace('</head>', shim + '</head>')
  if (html.includes('</body>')) return html.replace('</body>', shim + '</body>')
  return shim + html
}

export async function GET(
  req: Request,
  { params }: { params: { path: string[] } }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { instance: true },
  })

  if (!user?.instance) {
    return NextResponse.json({ error: 'No instance found' }, { status: 404 })
  }

  const accessUrl = user.instance.accessUrl?.replace(/\/$/, '')
  if (!accessUrl) {
    return NextResponse.json({ error: 'No public URL for instance' }, { status: 503 })
  }

  const pathStr = (params.path ?? []).join('/')
  const upstreamUrl = `${accessUrl}/canvas/${pathStr}`

  try {
    const upstreamRes = await fetch(upstreamUrl, {
      signal: AbortSignal.timeout(10000),
    })

    const contentType = upstreamRes.headers.get('Content-Type') ?? 'text/html'

    // For HTML responses, inject the WebSocket bridge shim so button actions work
    if (contentType.includes('text/html')) {
      const html = await upstreamRes.text()
      const patched = injectBridgeShim(html, accessUrl)
      return new Response(patched, {
        status: upstreamRes.status,
        headers: { 'Content-Type': contentType },
      })
    }

    // For all other assets (CSS, JS, images) stream through verbatim
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: { 'Content-Type': contentType },
    })
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Canvas server unreachable', detail: err.message },
      { status: 503 }
    )
  }
}
