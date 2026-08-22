/**
 * Reference catalogue. Upserted by id so the demo data stays consistent across
 * restarts without ever duplicating rows.
 *
 * `image_url` holds the path the API serves the bundled photo from rather than
 * an absolute URL, so the same rows work behind localhost, a container or a
 * real domain. `toProductImageUrl` expands it per request. The files themselves
 * live in `api/src/assets/products` and are refreshed by
 * `api/tools/fetch-product-images.mjs`.
 */
export const SEED_PRODUCTS_SQL = `
INSERT INTO products (id, title, description, price, image_url)
VALUES
  (1, 'Classic Leather Backpack', 'Water-resistant commuter backpack with a padded laptop sleeve and front organizer pocket.', 79.00, '/images/products/classic-leather-backpack.jpg'),
  (2, 'Nordic Ceramic Mug', 'Stoneware mug with a matte glaze finish sized for coffee, tea, or cocoa.', 18.50, '/images/products/nordic-ceramic-mug.jpg'),
  (3, 'Wireless Desk Lamp', 'Rechargeable desk lamp with three color temperatures and touch brightness control.', 42.00, '/images/products/wireless-desk-lamp.jpg'),
  (4, 'Minimal Running Shoes', 'Lightweight trainers built with a breathable knit upper and cushioned sole.', 98.99, '/images/products/minimal-running-shoes.jpg'),
  (5, 'Canvas Tote Bag', 'Heavyweight carryall with reinforced handles and an inner essentials pocket.', 24.00, '/images/products/canvas-tote-bag.jpg'),
  (6, 'Noise-Cancel Earbuds', 'Compact true wireless earbuds with active noise canceling and a charging case.', 129.00, '/images/products/noise-cancel-earbuds.jpg'),
  (7, 'Linen Desk Organizer', 'Desktop organizer with divided compartments for notes, pens, and charging cables.', 31.00, '/images/products/linen-desk-organizer.jpg'),
  (8, 'Stainless Water Bottle', 'Double-wall insulated bottle that keeps drinks cold for hours.', 27.50, '/images/products/stainless-water-bottle.jpg'),
  (9, 'Wool Throw Blanket', 'Soft woven blanket made for couches, reading chairs, and cool evenings.', 64.00, '/images/products/wool-throw-blanket.jpg'),
  (10, 'Travel Duffel Bag', 'Weekend duffel with shoe compartment, shoulder strap, and easy-access pockets.', 86.00, '/images/products/travel-duffel-bag.jpg'),
  (11, 'Espresso Bean Grinder', 'Burr grinder with precise settings for espresso, drip, and French press.', 112.00, '/images/products/espresso-bean-grinder.jpg'),
  (12, 'Smart Fitness Watch', 'Everyday smartwatch with workout tracking, sleep insights, and message alerts.', 149.00, '/images/products/smart-fitness-watch.jpg'),
  (13, 'Bamboo Cutting Board', 'Durable prep board with juice groove and a reversible chopping surface.', 29.00, '/images/products/bamboo-cutting-board.jpg'),
  (14, 'Portable Bluetooth Speaker', 'Small-room speaker with balanced sound, long battery life, and USB-C charging.', 74.00, '/images/products/portable-bluetooth-speaker.jpg'),
  (15, 'Everyday Denim Jacket', 'Classic fit jacket with soft-wash denim and layered-season versatility.', 89.00, '/images/products/everyday-denim-jacket.jpg'),
  (16, 'Adjustable Office Chair', 'Supportive desk chair with breathable mesh back and adjustable armrests.', 189.00, '/images/products/adjustable-office-chair.jpg'),
  (17, 'Glass Meal Prep Set', 'Stackable food containers with snap lids for weekly prep and storage.', 36.00, '/images/products/glass-meal-prep-set.jpg'),
  (18, 'Trail Hiking Boots', 'Rugged mid-height boots with grippy outsoles for uneven terrain.', 138.00, '/images/products/trail-hiking-boots.jpg'),
  (19, 'Cotton Bath Towel Set', 'Absorbent towel set woven from plush cotton for everyday bathroom use.', 48.00, '/images/products/cotton-bath-towel-set.jpg'),
  (20, 'Compact Air Purifier', 'Small-space purifier with replaceable filters and quiet night mode.', 119.00, '/images/products/compact-air-purifier.jpg'),
  (21, 'Mechanical Keyboard', 'Tactile keyboard with hot-swappable switches and a compact layout.', 104.00, '/images/products/mechanical-keyboard.jpg'),
  (22, 'Ceramic Plant Pot', 'Indoor planter with matching tray sized for herbs and tabletop greenery.', 22.00, '/images/products/ceramic-plant-pot.jpg'),
  (23, 'Rechargeable Hand Mixer', 'Cordless kitchen mixer with multiple speeds and easy-clean beaters.', 58.00, '/images/products/rechargeable-hand-mixer.jpg'),
  (24, 'Minimal Floor Lamp', 'Slim standing lamp that adds warm light to reading corners and living rooms.', 96.00, '/images/products/minimal-floor-lamp.jpg'),
  (25, 'Leather Card Holder', 'Compact card wallet with stitched slots for daily essentials.', 34.00, '/images/products/leather-card-holder.jpg'),
  (26, 'Insulated Lunch Box', 'Leak-resistant lunch carrier with modular compartments for work or school.', 33.00, '/images/products/insulated-lunch-box.jpg')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url;

SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));
`;
