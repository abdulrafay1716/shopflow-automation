import { ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { DiscountTicker } from './DiscountTicker';

interface LayoutProps {
  children: ReactNode;
  showTicker?: boolean;
}

export function Layout({ children, showTicker = true }: LayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      {showTicker && <DiscountTicker />}
      <main className="flex-1">
        {children}
      </main>
      <Footer />
    </div>
  );
}
