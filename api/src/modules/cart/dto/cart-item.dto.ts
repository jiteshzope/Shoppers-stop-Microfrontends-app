import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty()
  title!: string;

  @ApiProperty()
  url!: string;

  @ApiProperty()
  quantity!: number;

  @ApiProperty()
  price!: number;

  @ApiProperty({ description: 'price × quantity' })
  lineTotal!: number;
}

/** Result of a quantity change; `removed` marks the line dropping out of the cart. */
export class CartMutationResultDto {
  @ApiPropertyOptional()
  id?: number;

  @ApiProperty()
  productId!: number;

  @ApiProperty()
  quantity!: number;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  url?: string;

  @ApiPropertyOptional()
  price?: number;

  @ApiPropertyOptional()
  removed?: boolean;
}
