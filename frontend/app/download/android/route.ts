import { latestMeshRelease, MESH_REPO } from '@/lib/release';

/**
 * Serves the latest APK from this site's own domain with the Android package MIME type, so phones
 * recognise it as an installable app instead of a generic binary download.
 */
export async function GET() {
  const release = await latestMeshRelease();
  if (!release) {
    return Response.redirect(`https://github.com/${MESH_REPO}/releases/latest`, 302);
  }
  const upstream = await fetch(release.assetUrl, { redirect: 'follow', cache: 'no-store' });
  if (!upstream.ok || !upstream.body) {
    return Response.redirect(release.assetUrl, 302);
  }
  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': `attachment; filename="volentify-mesh-${release.version}.apk"`,
      'Content-Length': String(release.size),
      'Cache-Control': 'public, max-age=300',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
