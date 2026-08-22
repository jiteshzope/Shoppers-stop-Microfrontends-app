import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { CatalogService } from './catalog.service';
import { ProductDetailsDto, ProductSummaryDto } from './dto/product.dto';

@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  @ApiOperation({ summary: 'List every product in the catalogue' })
  @ApiOkResponse({ type: ProductSummaryDto, isArray: true })
  listProducts(): Promise<ProductSummaryDto[]> {
    return this.catalog.listProducts();
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Fetch one product by id' })
  @ApiOkResponse({ type: ProductDetailsDto })
  getProduct(
    @Param('id', new ParseIntPipe({ errorHttpStatusCode: 400 })) id: number,
  ): Promise<ProductDetailsDto> {
    return this.catalog.getProduct(id);
  }
}
