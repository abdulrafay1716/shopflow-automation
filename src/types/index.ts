// Common timezones for automation
export const COMMON_TIMEZONES = [
  { value: 'Asia/Karachi', label: 'Pakistan (PKT)', country: 'Pakistan' },
  { value: 'Asia/Dubai', label: 'UAE (GST)', country: 'UAE' },
  { value: 'Asia/Riyadh', label: 'Saudi Arabia (AST)', country: 'Saudi Arabia' },
  { value: 'Asia/Kolkata', label: 'India (IST)', country: 'India' },
  { value: 'Asia/Dhaka', label: 'Bangladesh (BST)', country: 'Bangladesh' },
  { value: 'Europe/London', label: 'UK (GMT/BST)', country: 'United Kingdom' },
  { value: 'America/New_York', label: 'US Eastern (EST/EDT)', country: 'United States' },
  { value: 'America/Los_Angeles', label: 'US Pacific (PST/PDT)', country: 'United States' },
];

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
  automation_start_hour: number;
  automation_end_hour: number;
  automation_timezone: string;
  logo_url: string | null;
  updated_at: string;
}

export interface CheckoutFormData {
  customer_name: string;
  phone_number: string;
  address: string;
  city: string;
}
