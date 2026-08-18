/**
 * Reference catalogue. Upserted by id so the demo data stays consistent across
 * restarts without ever duplicating rows.
 */
export const SEED_PRODUCTS_SQL = `
INSERT INTO products (id, title, description, price, image_url)
VALUES
  (1, 'Classic Leather Backpack', 'Water-resistant commuter backpack with a padded laptop sleeve and front organizer pocket.', 79.00, 'https://picsum.photos/seed/classic-leather-backpack/600/400'),
  (2, 'Nordic Ceramic Mug', 'Stoneware mug with a matte glaze finish sized for coffee, tea, or cocoa.', 18.50, 'https://picsum.photos/seed/nordic-ceramic-mug/600/400'),
  (3, 'Wireless Desk Lamp', 'Rechargeable desk lamp with three color temperatures and touch brightness control.', 42.00, 'https://picsum.photos/seed/wireless-desk-lamp/600/400'),
  (4, 'Minimal Running Shoes', 'Lightweight trainers built with a breathable knit upper and cushioned sole.', 98.99, 'https://picsum.photos/seed/minimal-running-shoes/600/400'),
  (5, 'Canvas Tote Bag', 'Heavyweight carryall with reinforced handles and an inner essentials pocket.', 24.00, 'https://picsum.photos/seed/canvas-tote-bag/600/400'),
  (6, 'Noise-Cancel Earbuds', 'Compact true wireless earbuds with active noise canceling and a charging case.', 129.00, 'https://picsum.photos/seed/noise-cancel-earbuds/600/400'),
  (7, 'Linen Desk Organizer', 'Desktop organizer with divided compartments for notes, pens, and charging cables.', 31.00, 'https://picsum.photos/seed/linen-desk-organizer/600/400'),
  (8, 'Stainless Water Bottle', 'Double-wall insulated bottle that keeps drinks cold for hours.', 27.50, 'https://picsum.photos/seed/stainless-water-bottle/600/400'),
  (9, 'Wool Throw Blanket', 'Soft woven blanket made for couches, reading chairs, and cool evenings.', 64.00, 'https://picsum.photos/seed/wool-throw-blanket/600/400'),
  (10, 'Travel Duffel Bag', 'Weekend duffel with shoe compartment, shoulder strap, and easy-access pockets.', 86.00, 'https://picsum.photos/seed/travel-duffel-bag/600/400'),
  (11, 'Espresso Bean Grinder', 'Burr grinder with precise settings for espresso, drip, and French press.', 112.00, 'https://picsum.photos/seed/espresso-bean-grinder/600/400'),
  (12, 'Smart Fitness Watch', 'Everyday smartwatch with workout tracking, sleep insights, and message alerts.', 149.00, 'https://picsum.photos/seed/smart-fitness-watch/600/400'),
  (13, 'Bamboo Cutting Board', 'Durable prep board with juice groove and a reversible chopping surface.', 29.00, 'https://picsum.photos/seed/bamboo-cutting-board/600/400'),
  (14, 'Portable Bluetooth Speaker', 'Small-room speaker with balanced sound, long battery life, and USB-C charging.', 74.00, 'https://picsum.photos/seed/portable-bluetooth-speaker/600/400'),
  (15, 'Everyday Denim Jacket', 'Classic fit jacket with soft-wash denim and layered-season versatility.', 89.00, 'https://picsum.photos/seed/everyday-denim-jacket/600/400'),
  (16, 'Adjustable Office Chair', 'Supportive desk chair with breathable mesh back and adjustable armrests.', 189.00, 'https://picsum.photos/seed/adjustable-office-chair/600/400'),
  (17, 'Glass Meal Prep Set', 'Stackable food containers with snap lids for weekly prep and storage.', 36.00, 'https://picsum.photos/seed/glass-meal-prep-set/600/400'),
  (18, 'Trail Hiking Boots', 'Rugged mid-height boots with grippy outsoles for uneven terrain.', 138.00, 'https://picsum.photos/seed/trail-hiking-boots/600/400'),
  (19, 'Cotton Bath Towel Set', 'Absorbent towel set woven from plush cotton for everyday bathroom use.', 48.00, 'https://picsum.photos/seed/cotton-bath-towel-set/600/400'),
  (20, 'Compact Air Purifier', 'Small-space purifier with replaceable filters and quiet night mode.', 119.00, 'https://picsum.photos/seed/compact-air-purifier/600/400'),
  (21, 'Mechanical Keyboard', 'Tactile keyboard with hot-swappable switches and a compact layout.', 104.00, 'https://picsum.photos/seed/mechanical-keyboard/600/400'),
  (22, 'Ceramic Plant Pot', 'Indoor planter with matching tray sized for herbs and tabletop greenery.', 22.00, 'https://picsum.photos/seed/ceramic-plant-pot/600/400'),
  (23, 'Rechargeable Hand Mixer', 'Cordless kitchen mixer with multiple speeds and easy-clean beaters.', 58.00, 'https://picsum.photos/seed/rechargeable-hand-mixer/600/400'),
  (24, 'Minimal Floor Lamp', 'Slim standing lamp that adds warm light to reading corners and living rooms.', 96.00, 'https://picsum.photos/seed/minimal-floor-lamp/600/400'),
  (25, 'Leather Card Holder', 'Compact card wallet with stitched slots for daily essentials.', 34.00, 'https://picsum.photos/seed/leather-card-holder/600/400'),
  (26, 'Insulated Lunch Box', 'Leak-resistant lunch carrier with modular compartments for work or school.', 33.00, 'https://picsum.photos/seed/insulated-lunch-box/600/400')
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  image_url = EXCLUDED.image_url;

SELECT setval(pg_get_serial_sequence('products', 'id'), COALESCE((SELECT MAX(id) FROM products), 1));
`;
