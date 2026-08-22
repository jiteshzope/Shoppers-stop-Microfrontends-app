/**
 * Downloads one freely-licensed catalog photo per product from Wikimedia
 * Commons into `api/src/assets/products`, and records the source page and
 * licence of each file in `credits.json`.
 *
 * The search terms live in `image-queries.json` next to this script so the
 * pick for a product can be re-tuned and re-run without touching the seed:
 *
 *   node api/tools/fetch-product-images.mjs             # only missing files
 *   node api/tools/fetch-product-images.mjs --force     # re-download all
 *   node api/tools/fetch-product-images.mjs backpack    # slugs matching "backpack"
 *   node api/tools/fetch-product-images.mjs --list mug  # candidates, without downloading
 *
 * Search relevance on its own picks plenty of technically-matching but
 * unsellable photos — a lamp in pieces, the inside of a grinder — so `--list`
 * exists to choose a file by hand and pin it as `file` on the query entry.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(HERE, '..', 'src', 'assets', 'products');
const CREDITS_FILE = join(OUTPUT_DIR, 'credits.json');
const QUERIES_FILE = join(HERE, 'image-queries.json');

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
// Wikimedia asks automated clients to identify themselves and a contact.
const USER_AGENT =
  'ecommerce-mf-catalog-seeder/1.0 (https://github.com/; product catalog demo fixture)';
// Wide enough for the 2x catalog card without bloating the repository.
const THUMB_WIDTH = 800;
const CANDIDATES_PER_QUERY = 12;
// The card is a 4:3 frame filled with `object-fit: cover`, so a mildly tall
// photo still centre-crops well — tall things (lamps, chairs) are mostly shot
// that way. Only steep portraits, which lose the product to the crop, are cut.
const MIN_ASPECT_RATIO = 0.7;

async function commonsSearch(query) {
  const url = new URL(COMMONS_API);
  url.search = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `filetype:bitmap ${query}`,
    gsrnamespace: '6',
    gsrlimit: String(CANDIDATES_PER_QUERY),
    prop: 'imageinfo',
    iiprop: 'url|mime|size|extmetadata',
    iiurlwidth: String(THUMB_WIDTH),
  }).toString();

  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Commons search failed for "${query}": HTTP ${response.status}`);
  }

  const pages = (await response.json()).query?.pages ?? {};
  // `generator=search` returns pages keyed by id; `index` restores relevance order.
  return Object.values(pages).sort((a, b) => a.index - b.index);
}

/** Keeps landscape JPEGs, which are the only shape the catalog card renders well. */
function pickCandidate(pages, preferredTitle) {
  const usable = pages.filter((page) => {
    const info = page.imageinfo?.[0];
    return info?.mime === 'image/jpeg' && info.thumburl && info.width / info.height >= MIN_ASPECT_RATIO;
  });

  if (preferredTitle) {
    const exact = usable.find((page) => page.title === preferredTitle);
    if (!exact) {
      throw new Error(`Pinned file "${preferredTitle}" is not a usable landscape JPEG result.`);
    }
    return exact;
  }

  return usable[0];
}

async function download(url, destination) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  if (!response.ok) {
    throw new Error(`Download failed: HTTP ${response.status} for ${url}`);
  }

  await writeFile(destination, Buffer.from(await response.arrayBuffer()));
}

function creditOf(page) {
  const metadata = page.imageinfo[0].extmetadata ?? {};
  const plain = (value) => value?.value?.replace(/<[^>]*>/g, '').trim() || 'Unknown';

  return {
    file: page.title,
    source: page.imageinfo[0].descriptionurl,
    artist: plain(metadata.Artist),
    license: plain(metadata.LicenseShortName),
  };
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const listOnly = args.includes('--list');
  const filters = args.filter((arg) => !arg.startsWith('--'));

  const queries = JSON.parse(await readFile(QUERIES_FILE, 'utf8'));
  const selected = filters.length
    ? queries.filter((entry) => filters.some((filter) => entry.slug.includes(filter)))
    : queries;

  if (!selected.length) {
    throw new Error(`No products matched ${filters.join(', ')}.`);
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const credits = existsSync(CREDITS_FILE) ? JSON.parse(await readFile(CREDITS_FILE, 'utf8')) : {};

  if (listOnly) {
    for (const entry of selected) {
      console.log(`\n${entry.slug}  ("${entry.query}")`);
      for (const page of await commonsSearch(entry.query)) {
        const info = page.imageinfo?.[0];
        const usable = info?.mime === 'image/jpeg' && info.width / info.height >= MIN_ASPECT_RATIO;
        console.log(`  ${usable ? '*' : ' '} ${page.title}`);
      }
    }
    return;
  }

  for (const entry of selected) {
    const destination = join(OUTPUT_DIR, `${entry.slug}.jpg`);
    if (!force && existsSync(destination) && credits[entry.slug]) {
      console.log(`skip  ${entry.slug} (already downloaded)`);
      continue;
    }

    const candidate = pickCandidate(await commonsSearch(entry.query), entry.file);
    if (!candidate) {
      console.warn(`MISS  ${entry.slug} — no landscape JPEG for "${entry.query}"`);
      continue;
    }

    await download(candidate.imageinfo[0].thumburl, destination);
    credits[entry.slug] = creditOf(candidate);
    console.log(`saved ${entry.slug} <- ${candidate.title}`);
  }

  const ordered = Object.fromEntries(Object.keys(credits).sort().map((key) => [key, credits[key]]));
  await writeFile(CREDITS_FILE, `${JSON.stringify(ordered, null, 2)}\n`);
}

await main();
