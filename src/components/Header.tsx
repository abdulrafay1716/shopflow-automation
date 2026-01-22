import { Link } from 'react-router-dom';
import { ShoppingCart, User, Cherry } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCart } from '@/contexts/CartContext';
import { Badge } from '@/components/ui/badge';

export function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-foreground">
          <Cherry className="h-8 w-8 text-primary" />
          <span>Cherry's Store</span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-2">
          <Link to="/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {totalItems > 0 && (
                <Badge 
                  className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-primary text-primary-foreground"
                >
                  {totalItems}
                </Badge>
              )}
            </Button>
          </Link>
          
          <Link to="/admin/login">
            <Button variant="outline" size="sm" className="gap-2">
              <User className="h-4 w-4" />
              Admin
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  );
}
