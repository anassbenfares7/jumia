export interface User {
  id: number;
  name: string;
  email: string;
  role: 'buyer' | 'vendor' | 'admin';
}

export interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  stock: number;
  image_url: string | null;
  category_name: string;
  business_name: string;
}

export interface CartItem {
  id: number;
  title: string;
  price: string;
  business_name: string;
  quantity: number;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
}

export interface VendorProfile {
  id: number;
  business_name: string;
  phone_number: string;
  is_approved: boolean;
  created_at: string;
}

export interface VendorProduct extends Product {
  category_id: number;
}

export interface VendorOrder {
  order_item_id: number;
  quantity: number;
  price_per_unit: string;
  status: 'placed' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  product_title: string;
  created_at: string;
  buyer_name: string;
}

export interface BuyerOrder {
  order_id: number;
  total_amount: string;
  payment_status: string;
  created_at: string;
  order_item_id: number;
  quantity: number;
  price_per_unit: string;
  item_status: string;
  product_title: string;
  image_url: string | null;
  business_name: string;
}

export interface PendingVendor {
  id: number;
  business_name: string;
  phone_number: string;
  created_at: string;
}
