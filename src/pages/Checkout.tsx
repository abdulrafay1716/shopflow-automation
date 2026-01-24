import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/contexts/CartContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const PAKISTANI_CITIES = [
  'Karachi', 'Lahore', 'Faisalabad', 'Rawalpindi', 'Multan',
  'Hyderabad', 'Gujranwala', 'Peshawar', 'Quetta', 'Islamabad',
  'Bahawalpur', 'Sargodha', 'Sialkot', 'Sukkur', 'Larkana'
];

const Checkout = () => {
  const navigate = useNavigate();
  const { items, totalAmount, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState('');
  
  const [formData, setFormData] = useState({
    customer_name: '',
    phone_number: '',
    address: '',
    city: 'Karachi',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.customer_name.trim()) {
      newErrors.customer_name = 'Full name is required';
    }

    if (!formData.phone_number.trim()) {
      newErrors.phone_number = 'Phone number is required';
    } else if (!/^03\d{2}-?\d{7}$/.test(formData.phone_number.replace(/\s/g, ''))) {
      newErrors.phone_number = 'Enter valid Pakistani number (03XX-XXXXXXX)';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);

    try {
      // Generate order ID
      const orderIdPrefix = 'CHR-' + new Date().toISOString().slice(0, 10).replace(/-/g, '') + '-';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const newOrderId = orderIdPrefix + randomSuffix;

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_id: newOrderId,
          customer_name: formData.customer_name,
          phone_number: formData.phone_number,
          address: formData.address,
          city: formData.city,
          total_amount: totalAmount,
          order_type: 'MANUAL',
          payment_method: 'COD',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map((item) => ({
        order_id: orderData.id,
        product_id: item.product.id,
        product_name: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
        discount_percentage: item.product.discount_percentage,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Sync to Google Sheets
      try {
        await supabase.functions.invoke('sync-google-sheets', {
          body: { order: orderData }
        });
      } catch (syncError) {
        console.log('Google Sheets sync skipped or failed:', syncError);
      }

      setOrderId(newOrderId);
      setOrderComplete(true);
      clearCart();
      toast.success('Order placed successfully!');

    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !orderComplete) {
    return (
      <Layout showTicker={false}>
        <div className="container py-16 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Your cart is empty</h1>
          <Link to="/">
            <Button>Browse Products</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  if (orderComplete) {
    return (
      <Layout showTicker={false}>
        <div className="container py-16 text-center max-w-md mx-auto">
          <div className="animate-fade-in">
            <CheckCircle className="h-20 w-20 text-success mx-auto mb-6" />
            <h1 className="font-display text-3xl font-bold mb-4">Order Placed!</h1>
            <p className="text-muted-foreground mb-2">
              Your order has been placed successfully.
            </p>
            <div className="bg-card border rounded-lg p-4 mb-6">
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-mono font-bold text-lg">{orderId}</p>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              💵 Please keep cash ready for delivery. We'll contact you shortly!
            </p>
            <Link to="/">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout showTicker={false}>
      <div className="container py-8 max-w-2xl">
        <div className="mb-6">
          <Link to="/cart" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Cart
          </Link>
        </div>

        <h1 className="font-display text-3xl font-bold mb-8">Checkout</h1>

        {/* COD Notice */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-8">
          <p className="text-center font-medium text-primary">
            💵 Only Cash on Delivery is available
          </p>
          <p className="text-center text-sm text-muted-foreground mt-1">
            Pay when you receive your order
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="customer_name">Full Name *</Label>
            <Input
              id="customer_name"
              placeholder="Enter your full name"
              value={formData.customer_name}
              onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
              className={errors.customer_name ? 'border-destructive' : ''}
            />
            {errors.customer_name && (
              <p className="text-sm text-destructive">{errors.customer_name}</p>
            )}
          </div>

          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone_number">Mobile Number *</Label>
            <Input
              id="phone_number"
              placeholder="03XX-XXXXXXX"
              value={formData.phone_number}
              onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              className={errors.phone_number ? 'border-destructive' : ''}
            />
            {errors.phone_number && (
              <p className="text-sm text-destructive">{errors.phone_number}</p>
            )}
          </div>

          {/* City */}
          <div className="space-y-2">
            <Label htmlFor="city">City *</Label>
            <select
              id="city"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {PAKISTANI_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label htmlFor="address">Complete Address *</Label>
            <textarea
              id="address"
              placeholder="House/Flat No., Street, Area, Landmark"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              className={`flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${errors.address ? 'border-destructive' : ''}`}
            />
            {errors.address && (
              <p className="text-sm text-destructive">{errors.address}</p>
            )}
          </div>

          {/* Order Summary */}
          <div className="bg-card border rounded-lg p-4 space-y-3">
            <h3 className="font-semibold">Order Summary</h3>
            <div className="space-y-2 text-sm">
              {items.map(({ product, quantity }) => {
                const discountedPrice = product.price - (product.price * product.discount_percentage) / 100;
                return (
                  <div key={product.id} className="flex justify-between">
                    <span className="text-muted-foreground">
                      {product.name} × {quantity}
                    </span>
                    <span>PKR {(discountedPrice * quantity).toLocaleString()}</span>
                  </div>
                );
              })}
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">PKR {totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full btn-cart"
            disabled={loading}
          >
            {loading ? 'Placing Order...' : 'Place Order (Cash on Delivery)'}
          </Button>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
