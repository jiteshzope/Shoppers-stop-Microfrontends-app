export interface ProductRow {
  id: string;
  title: string;
  description: string;
  price: string;
  image_url: string;
}

/** Catalog card shape consumed by the product grid. */
export interface ProductSummary {
  id: number;
  title: string;
  price: number;
  url: string;
}

export interface ProductDetails extends ProductSummary {
  description: string;
}
