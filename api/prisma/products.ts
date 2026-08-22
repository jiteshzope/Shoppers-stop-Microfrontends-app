/**
 * Reference catalogue.
 *
 * `slug` doubles as the upsert key and as the basename of the bundled photo in
 * `src/assets/products`, which keeps the rows and the image files from drifting
 * apart. Paths rather than absolute URLs are stored so the same catalogue works
 * behind localhost, a container or a real domain.
 */
export interface SeedProduct {
  slug: string;
  title: string;
  description: string;
  price: number;
}

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    slug: 'classic-leather-backpack',
    title: 'Classic Leather Backpack',
    description:
      'Water-resistant commuter backpack with a padded laptop sleeve and front organizer pocket.',
    price: 79.0,
  },
  {
    slug: 'nordic-ceramic-mug',
    title: 'Nordic Ceramic Mug',
    description: 'Stoneware mug with a matte glaze finish sized for coffee, tea, or cocoa.',
    price: 18.5,
  },
  {
    slug: 'wireless-desk-lamp',
    title: 'Wireless Desk Lamp',
    description:
      'Rechargeable desk lamp with three color temperatures and touch brightness control.',
    price: 42.0,
  },
  {
    slug: 'minimal-running-shoes',
    title: 'Minimal Running Shoes',
    description: 'Lightweight trainers built with a breathable knit upper and cushioned sole.',
    price: 98.99,
  },
  {
    slug: 'canvas-tote-bag',
    title: 'Canvas Tote Bag',
    description: 'Heavyweight carryall with reinforced handles and an inner essentials pocket.',
    price: 24.0,
  },
  {
    slug: 'noise-cancel-earbuds',
    title: 'Noise-Cancel Earbuds',
    description:
      'Compact true wireless earbuds with active noise canceling and a charging case.',
    price: 129.0,
  },
  {
    slug: 'linen-desk-organizer',
    title: 'Linen Desk Organizer',
    description:
      'Desktop organizer with divided compartments for notes, pens, and charging cables.',
    price: 31.0,
  },
  {
    slug: 'stainless-water-bottle',
    title: 'Stainless Water Bottle',
    description: 'Double-wall insulated bottle that keeps drinks cold for hours.',
    price: 27.5,
  },
  {
    slug: 'wool-throw-blanket',
    title: 'Wool Throw Blanket',
    description: 'Soft woven blanket made for couches, reading chairs, and cool evenings.',
    price: 64.0,
  },
  {
    slug: 'travel-duffel-bag',
    title: 'Travel Duffel Bag',
    description: 'Weekend duffel with shoe compartment, shoulder strap, and easy-access pockets.',
    price: 86.0,
  },
  {
    slug: 'espresso-bean-grinder',
    title: 'Espresso Bean Grinder',
    description: 'Burr grinder with precise settings for espresso, drip, and French press.',
    price: 112.0,
  },
  {
    slug: 'smart-fitness-watch',
    title: 'Smart Fitness Watch',
    description:
      'Everyday smartwatch with workout tracking, sleep insights, and message alerts.',
    price: 149.0,
  },
  {
    slug: 'bamboo-cutting-board',
    title: 'Bamboo Cutting Board',
    description: 'Durable prep board with juice groove and a reversible chopping surface.',
    price: 29.0,
  },
  {
    slug: 'portable-bluetooth-speaker',
    title: 'Portable Bluetooth Speaker',
    description:
      'Small-room speaker with balanced sound, long battery life, and USB-C charging.',
    price: 74.0,
  },
  {
    slug: 'everyday-denim-jacket',
    title: 'Everyday Denim Jacket',
    description: 'Classic fit jacket with soft-wash denim and layered-season versatility.',
    price: 89.0,
  },
  {
    slug: 'adjustable-office-chair',
    title: 'Adjustable Office Chair',
    description: 'Supportive desk chair with breathable mesh back and adjustable armrests.',
    price: 189.0,
  },
  {
    slug: 'glass-meal-prep-set',
    title: 'Glass Meal Prep Set',
    description: 'Stackable food containers with snap lids for weekly prep and storage.',
    price: 36.0,
  },
  {
    slug: 'trail-hiking-boots',
    title: 'Trail Hiking Boots',
    description: 'Rugged mid-height boots with grippy outsoles for uneven terrain.',
    price: 138.0,
  },
  {
    slug: 'cotton-bath-towel-set',
    title: 'Cotton Bath Towel Set',
    description: 'Absorbent towel set woven from plush cotton for everyday bathroom use.',
    price: 48.0,
  },
  {
    slug: 'compact-air-purifier',
    title: 'Compact Air Purifier',
    description: 'Small-space purifier with replaceable filters and quiet night mode.',
    price: 119.0,
  },
  {
    slug: 'mechanical-keyboard',
    title: 'Mechanical Keyboard',
    description: 'Tactile keyboard with hot-swappable switches and a compact layout.',
    price: 104.0,
  },
  {
    slug: 'ceramic-plant-pot',
    title: 'Ceramic Plant Pot',
    description: 'Indoor planter with matching tray sized for herbs and tabletop greenery.',
    price: 22.0,
  },
  {
    slug: 'rechargeable-hand-mixer',
    title: 'Rechargeable Hand Mixer',
    description: 'Cordless kitchen mixer with multiple speeds and easy-clean beaters.',
    price: 58.0,
  },
  {
    slug: 'minimal-floor-lamp',
    title: 'Minimal Floor Lamp',
    description: 'Slim standing lamp that adds warm light to reading corners and living rooms.',
    price: 96.0,
  },
  {
    slug: 'leather-card-holder',
    title: 'Leather Card Holder',
    description: 'Compact card wallet with stitched slots for daily essentials.',
    price: 34.0,
  },
  {
    slug: 'insulated-lunch-box',
    title: 'Insulated Lunch Box',
    description: 'Leak-resistant lunch carrier with modular compartments for work or school.',
    price: 33.0,
  },
];
