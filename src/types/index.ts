export interface Product {
  id: string;
  name: string;
  price: number;
  discount_percentage: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  order_id: string;
  customer_name: string;
  phone_number: string;
  address: string;
  city: string | null;
  total_amount: number;
  order_type: 'MANUAL' | 'AUTO';
  payment_method: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

export interface SiteSettings {
  id: string;
  ticker_text: string;
  ticker_enabled: boolean;
  automation_running: boolean;
  logo_url: string | null;
  updated_at: string;
}

export interface CheckoutFormData {
  customer_name: string;
  phone_number: string;
  address: string;
  city: string;
}
