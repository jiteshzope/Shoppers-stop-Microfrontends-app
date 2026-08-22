import { ApiProperty } from '@nestjs/swagger';

/** Catalogue card shape consumed by the product grid. */
export class ProductSummaryDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'classic-leather-backpack' })
  slug!: string;

  @ApiProperty({ example: 'Classic Leather Backpack' })
  title!: string;

  @ApiProperty({ example: 79 })
  price!: number;

  @ApiProperty({ example: 'http://localhost:3000/images/products/classic-leather-backpack.jpg' })
  url!: string;
}

export class ProductDetailsDto extends ProductSummaryDto {
  @ApiProperty()
  description!: string;
}
