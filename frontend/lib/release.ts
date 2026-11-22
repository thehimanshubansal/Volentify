/** Latest Volentify Mesh Android build, published by the GitHub "Volentify Mesh APK" workflow. */

export const MESH_REPO = process.env.MESH_RELEASE_REPO || 'Gyanvir/Volentify';
export const MESH_DOWNLOAD_PATH = '/download/android';

export interface MeshRelease {
  version: string;
  publishedAt: string;
  size: number;
  assetUrl: string;
  notesUrl: string;
}

export async function latestMeshRelease(): Promise<MeshRelease | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${MESH_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'volentify-web' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const rel = (await res.json()) as {
      tag_name: string; published_at: string; html_url: string;
      assets: { name: string; size: number; browser_download_url: string }[];
    };
    const apk = rel.assets.find((a) => a.name.endsWith('.apk'));
    if (!apk) return null;
    return {
      version: rel.tag_name.replace(/^mesh-v/, ''), publishedAt: rel.published_at, size: apk.size,
      assetUrl: apk.browser_download_url, notesUrl: rel.html_url,
    };
  } catch {
    return null;
  }
}
