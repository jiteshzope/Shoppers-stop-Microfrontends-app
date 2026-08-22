import { join } from 'node:path';
import { config } from '../../config/environment';

/** Route the product photos are served from, and the prefix stored in `products.image_url`. */
export const PRODUCT_IMAGES_ROUTE = '/images/products';

/**
 * The build copies `api/src/assets` to the matching path inside `dist`, so this
 * one relative walk resolves the same way from the sources and from the
 * compiled output.
 */
export const PRODUCT_IMAGES_DIR = join(__dirname, '..', '..', 'assets', 'products');

/**
 * Product rows hold a path (`/images/products/...`) so the catalogue is not
 * pinned to whichever host seeded it. The API is the only part that knows where
 * it is actually reachable, so it expands the path on the way out.
 *
 * Absolute URLs are passed through untouched, which leaves room for rows that
 * point at an external CDN.
 */
export function toProductImageUrl(imagePath: string): string {
  if (/^https?:\/\//i.test(imagePath)) {
    return imagePath;
  }

  return `${config.publicBaseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
}
