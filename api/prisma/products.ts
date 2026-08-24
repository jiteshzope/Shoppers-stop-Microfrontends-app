/**
 * Reference catalogue.
 *
 * `slug` is the upsert key, so re-seeding matches rows by handle rather than by
 * id. `imageUrl` is the photo's absolute address on the image host: the API
 * stores and serves it verbatim, which keeps the catalogue working the same way
 * from localhost, a container or a real domain without the API having to host
 * any binaries of its own.
 */
export interface SeedProduct {
  slug: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
}

export const SEED_PRODUCTS: readonly SeedProduct[] = [
  {
    slug: 'classic-leather-backpack',
    title: 'Classic Leather Backpack',
    description:
      'Water-resistant commuter backpack with a padded laptop sleeve and front organizer pocket.',
    price: 79.0,
    imageUrl: 'https://i.postimg.cc/wv93JDM1/classic-leather-backpack.jpg',
  },
  {
    slug: 'nordic-ceramic-mug',
    title: 'Nordic Ceramic Mug',
    description: 'Stoneware mug with a matte glaze finish sized for coffee, tea, or cocoa.',
    price: 18.5,
    imageUrl: 'https://i.postimg.cc/vBXTvDx7/nordic-ceramic-mug.jpg',
  },
  {
    slug: 'wireless-desk-lamp',
    title: 'Wireless Desk Lamp',
    description:
      'Rechargeable desk lamp with three color temperatures and touch brightness control.',
    price: 42.0,
    imageUrl: 'https://i.postimg.cc/1tMXK4Vv/wireless-desk-lamp.jpg',
  },
  {
    slug: 'minimal-running-shoes',
    title: 'Minimal Running Shoes',
    description: 'Lightweight trainers built with a breathable knit upper and cushioned sole.',
    price: 98.99,
    imageUrl: 'https://i.postimg.cc/bJLrRdSQ/minimal-running-shoes.jpg',
  },
  {
    slug: 'canvas-tote-bag',
    title: 'Canvas Tote Bag',
    description: 'Heavyweight carryall with reinforced handles and an inner essentials pocket.',
    price: 24.0,
    imageUrl: 'https://i.postimg.cc/nznM7qrL/canvas-tote-bag.jpg',
  },
  {
    slug: 'noise-cancel-earbuds',
    title: 'Noise-Cancel Earbuds',
    description: 'Compact true wireless earbuds with active noise canceling and a charging case.',
    price: 129.0,
    imageUrl: 'https://i.postimg.cc/MTtHYXf7/noise-cancel-earbuds.jpg',
  },
  {
    slug: 'linen-desk-organizer',
    title: 'Linen Desk Organizer',
    description:
      'Desktop organizer with divided compartments for notes, pens, and charging cables.',
    price: 31.0,
    imageUrl: 'https://i.postimg.cc/wvFMk3RN/linen-desk-organizer.jpg',
  },
  {
    slug: 'stainless-water-bottle',
    title: 'Stainless Water Bottle',
    description: 'Double-wall insulated bottle that keeps drinks cold for hours.',
    price: 27.5,
    imageUrl: 'https://i.postimg.cc/yxddpB0F/stainless-water-bottle.jpg',
  },
  {
    slug: 'wool-throw-blanket',
    title: 'Wool Throw Blanket',
    description: 'Soft woven blanket made for couches, reading chairs, and cool evenings.',
    price: 64.0,
    imageUrl: 'https://i.postimg.cc/qqRRD02s/wool-throw-blanket.jpg',
  },
  {
    slug: 'travel-duffel-bag',
    title: 'Travel Duffel Bag',
    description: 'Weekend duffel with shoe compartment, shoulder strap, and easy-access pockets.',
    price: 86.0,
    imageUrl: 'https://i.postimg.cc/ydnxTW3p/travel-duffel-bag.jpg',
  },
  {
    slug: 'espresso-bean-grinder',
    title: 'Espresso Bean Grinder',
    description: 'Burr grinder with precise settings for espresso, drip, and French press.',
    price: 112.0,
    imageUrl: 'https://i.postimg.cc/85wcbsf5/espresso-bean-grinder.jpg',
  },
  {
    slug: 'smart-fitness-watch',
    title: 'Smart Fitness Watch',
    description: 'Everyday smartwatch with workout tracking, sleep insights, and message alerts.',
    price: 149.0,
    imageUrl: 'https://i.postimg.cc/ydnxTW3j/smart-fitness-watch.jpg',
  },
  {
    slug: 'bamboo-cutting-board',
    title: 'Bamboo Cutting Board',
    description: 'Durable prep board with juice groove and a reversible chopping surface.',
    price: 29.0,
    imageUrl: 'https://i.postimg.cc/3R3Wp2Nd/bamboo-cutting-board.jpg',
  },
  {
    slug: 'portable-bluetooth-speaker',
    title: 'Portable Bluetooth Speaker',
    description: 'Small-room speaker with balanced sound, long battery life, and USB-C charging.',
    price: 74.0,
    imageUrl: 'https://i.postimg.cc/B6NbCtPc/portable-bluetooth-speaker.jpg',
  },
  {
    slug: 'everyday-denim-jacket',
    title: 'Everyday Denim Jacket',
    description: 'Classic fit jacket with soft-wash denim and layered-season versatility.',
    price: 89.0,
    imageUrl: 'https://i.postimg.cc/RFGhTqJq/everyday-denim-jacket.jpg',
  },
  {
    slug: 'adjustable-office-chair',
    title: 'Adjustable Office Chair',
    description: 'Supportive desk chair with breathable mesh back and adjustable armrests.',
    price: 189.0,
    imageUrl: 'https://i.postimg.cc/tT97PFJ1/adjustable-office-chair.jpg',
  },
  {
    slug: 'glass-meal-prep-set',
    title: 'Glass Meal Prep Set',
    description: 'Stackable food containers with snap lids for weekly prep and storage.',
    price: 36.0,
    imageUrl: 'https://i.postimg.cc/4dwy1nHK/glass-meal-prep-set.jpg',
  },
  {
    slug: 'trail-hiking-boots',
    title: 'Trail Hiking Boots',
    description: 'Rugged mid-height boots with grippy outsoles for uneven terrain.',
    price: 138.0,
    imageUrl: 'https://i.postimg.cc/xCg8PqNx/trail-hiking-boots.jpg',
  },
  {
    slug: 'cotton-bath-towel-set',
    title: 'Cotton Bath Towel Set',
    description: 'Absorbent towel set woven from plush cotton for everyday bathroom use.',
    price: 48.0,
    imageUrl: 'https://i.postimg.cc/0QZjCrKN/cotton-bath-towel-set.jpg',
  },
  {
    slug: 'compact-air-purifier',
    title: 'Compact Air Purifier',
    description: 'Small-space purifier with replaceable filters and quiet night mode.',
    price: 119.0,
    imageUrl: 'https://i.postimg.cc/DZ50cm4f/compact-air-purifier.jpg',
  },
  {
    slug: 'mechanical-keyboard',
    title: 'Mechanical Keyboard',
    description: 'Tactile keyboard with hot-swappable switches and a compact layout.',
    price: 104.0,
    imageUrl: 'https://i.postimg.cc/MTtHYXff/mechanical-keyboard.jpg',
  },
  {
    slug: 'ceramic-plant-pot',
    title: 'Ceramic Plant Pot',
    description: 'Indoor planter with matching tray sized for herbs and tabletop greenery.',
    price: 22.0,
    imageUrl: 'https://i.postimg.cc/hjKhxVvj/ceramic-plant-pot.jpg',
  },
  {
    slug: 'rechargeable-hand-mixer',
    title: 'Rechargeable Hand Mixer',
    description: 'Cordless kitchen mixer with multiple speeds and easy-clean beaters.',
    price: 58.0,
    imageUrl: 'https://i.postimg.cc/FRGzx1kZ/rechargeable-hand-mixer.jpg',
  },
  {
    slug: 'minimal-floor-lamp',
    title: 'Minimal Floor Lamp',
    description: 'Slim standing lamp that adds warm light to reading corners and living rooms.',
    price: 96.0,
    imageUrl: 'https://i.postimg.cc/mDVkSh1M/minimal-floor-lamp.jpg',
  },
  {
    slug: 'leather-card-holder',
    title: 'Leather Card Holder',
    description: 'Compact card wallet with stitched slots for daily essentials.',
    price: 34.0,
    imageUrl: 'https://i.postimg.cc/fL5yvkS9/leather-card-holder.jpg',
  },
  {
    slug: 'insulated-lunch-box',
    title: 'Insulated Lunch Box',
    description: 'Leak-resistant lunch carrier with modular compartments for work or school.',
    price: 33.0,
    imageUrl: 'https://i.postimg.cc/d1n39DZT/insulated-lunch-box.jpg',
  },
];
