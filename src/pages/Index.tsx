import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Product } from '@/types';
import { supabase } from '@/integrations/supabase/client';

const Index = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('products_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        () => {
          fetchProducts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setProducts(data as Product[]);
    }
    setLoading(false);
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Hero Section */}
        <section className="mb-12 text-center">
          <h1 className="font-display text-4xl font-bold text-foreground mb-4 animate-fade-in">
            Welcome to Cherry's Store
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto animate-fade-in">
            Discover amazing products at unbeatable prices. 
            All orders are Cash on Delivery – pay when you receive!
          </p>
        </section>

        {/* Products Grid */}
        <section>
          <h2 className="font-display text-2xl font-semibold mb-6">
            Our Products
          </h2>

          {loading ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-8 w-1/2" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-4xl mb-4">🛒</p>
              <h3 className="font-display text-xl font-semibold text-muted-foreground mb-2">
                No Products Yet
              </h3>
              <p className="text-muted-foreground">
                Check back soon for amazing products!
              </p>
            </div>
          )}
        </section>
      </div>
    </Layout>
  );
};

export default Index;
