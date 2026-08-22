import { join } from 'node:path';

/** Route the product photos are served from, and the prefix stored in `image_path`. */
export const PRODUCT_IMAGES_ROUTE = '/images/products';

/**
 * The Nest CLI copies `src/assets` to `dist/assets`, so this one relative walk
 * resolves the same way from the sources and from the compiled output.
 */
export const PRODUCT_IMAGES_DIR = join(__dirname, '..', '..', 'assets', 'products');

/**
 * Product rows hold a path so the catalogue is not pinned to whichever host
 * seeded it. The API is the only part that knows where it is actually
 * reachable, so it expands the path on the way out.
 *
 * Absolute URLs pass through untouched, which leaves room for rows that point
 * at an external CDN.
 */
export function toProductImageUrl(baseUrl: string, imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}
