import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CartService } from './cart.service';
import { CartItemDto, CartMutationResultDto } from './dto/cart-item.dto';
import { CartMutationDto } from './dto/cart-mutation.dto';

/**
 * Every cart route belongs to the signed-in shopper. The globally applied
 * access-token guard covers them; there is no `@Public()` here.
 */
@ApiTags('cart')
@ApiBearerAuth()
@Controller('cart')
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Get()
  @ApiOperation({ summary: "List the caller's cart" })
  @ApiOkResponse({ type: CartItemDto, isArray: true })
  listCartItems(@CurrentUser('id') userId: string): Promise<CartItemDto[]> {
    return this.cart.listCartItems(userId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('items')
  @ApiOperation({ summary: 'Add units of a product to the cart' })
  @ApiOkResponse({ type: CartMutationResultDto })
  addCartItem(
    @CurrentUser('id') userId: string,
    @Body() dto: CartMutationDto,
  ): Promise<CartMutationResultDto> {
    return this.cart.addCartItem(userId, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('items/remove')
  @ApiOperation({ summary: 'Remove units of a product from the cart' })
  @ApiOkResponse({ type: CartMutationResultDto })
  removeCartItem(
    @CurrentUser('id') userId: string,
    @Body() dto: CartMutationDto,
  ): Promise<CartMutationResultDto> {
    return this.cart.removeCartItem(userId, dto);
  }

  @Delete()
  @ApiOperation({ summary: 'Empty the cart' })
  clearCart(@CurrentUser('id') userId: string): Promise<{ removed: number }> {
    return this.cart.clearCart(userId);
  }
}
