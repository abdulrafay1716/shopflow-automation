import { ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Product } from '@/types';
import { useCart } from '@/contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart } = useCart();

  const discountedPrice = product.price - (product.price * product.discount_percentage) / 100;

  return (
    <div className="product-card group">
      {/* Discount Badge */}
      {product.discount_percentage > 0 && (
        <div className="discount-badge">
          -{product.discount_percentage}%
        </div>
      )}

      {/* Product Image */}
      <div className="aspect-square overflow-hidden bg-secondary">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <span className="text-4xl">📦</span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 space-y-3">
        <h3 className="font-display font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>

        {/* Pricing */}
        <div className="flex items-center gap-2">
          {product.discount_percentage > 0 ? (
            <>
              <span className="price-discounted">
                PKR {discountedPrice.toLocaleString()}
              </span>
              <span className="price-original">
                PKR {product.price.toLocaleString()}
              </span>
            </>
          ) : (
            <span className="price-discounted">
              PKR {product.price.toLocaleString()}
            </span>
          )}
        </div>

        {/* Add to Cart Button */}
        <Button 
          onClick={() => addToCart(product)}
          className="btn-cart"
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}
