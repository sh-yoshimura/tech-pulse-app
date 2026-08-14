import dns from 'node:dns/promises';
import { AppError } from '@/lib/errors';

// Blocks SSRF: without this, addArticleByUrl would fetch *any* URL a
// caller supplies (there's no auth in front of it) and hand the response
// body to the LLM, whose summary is then stored and shown back — including
// internal admin pages, localhost services, or cloud metadata endpoints
// (169.254.169.254) reachable from the server's network.
const PRIVATE_IPV4_RANGES: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10], // carrier-grade NAT; also used by some cloud metadata services
  ['127.0.0.0', 8],
  ['169.254.0.0', 16], // link-local; includes the AWS/GCP/Azure metadata IP
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
];

function ipv4ToInt(ip: string): number {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateIPv4(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  return PRIVATE_IPV4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (ipv4ToInt(base) & mask);
  });
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // unique local fc00::/7
  if (/^fe[89ab]/.test(lower)) return true; // link-local fe80::/10
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length);
    if (mapped.includes('.')) return isPrivateIPv4(mapped);
  }
  return false;
}

/**
 * Validates that a URL is http(s) and resolves to a public IP address,
 * then returns the parsed URL. Throws AppError with a user-safe message
 * otherwise.
 *
 * Known limitation: this resolves DNS once, up front. A malicious DNS
 * server could return a public IP here and a private one when `fetch()`
 * resolves again moments later (DNS rebinding). Closing that fully would
 * require pinning the resolved IP for the actual request, which isn't a
 * simple option on Node's fetch — acceptable trade-off for a
 * single-owner tool; revisit if this app ever gets multi-tenant auth.
 */
export async function assertPublicHttpUrl(rawUrl: string): Promise<URL> {
  if (!rawUrl || rawUrl.length > 2000) {
    throw new AppError('有効なURLを入力してください');
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new AppError('有効なURLを入力してください');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new AppError('http または https のURLのみ指定できます');
  }

  if (url.hostname === 'localhost' || url.hostname === '0') {
    throw new AppError('このURLは指定できません');
  }

  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(url.hostname, { all: true });
  } catch {
    throw new AppError('URLのホスト名を解決できませんでした');
  }

  const hasPrivateAddress = addresses.some(({ address, family }) =>
    family === 4 ? isPrivateIPv4(address) : isPrivateIPv6(address)
  );

  if (hasPrivateAddress) {
    throw new AppError('このURLは指定できません');
  }

  return url;
}
