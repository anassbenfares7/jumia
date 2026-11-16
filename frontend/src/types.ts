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
