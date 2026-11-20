import React, { useState } from 'react';
import axios from 'axios';
import API from '../services/api';
import type { CartItem } from '../types';

interface CartDrawerProps {
  cartItems: CartItem[];
  onRemoveItem: (id: number) => void;
  onClearCart: () => void;
}

interface CheckoutResponse {
  data: {
    orderId: number;
  };
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ cartItems, onRemoveItem, onClearCart }) => {
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate order total aggregates dynamically
  const cartSubtotal = cartItems.reduce((total, item) => total + parseFloat(item.price) * item.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Map frontend state to match the precise array layout expected by Step 24's backend controller
      const itemsPayload = cartItems.map(item => ({
        productId: item.id,
        quantity: item.quantity
      }));

      const response = await API.post<CheckoutResponse>('/orders/checkout', { items: itemsPayload });
      
      setSuccessMessage(`Demo order #${response.data.data.orderId} created. No payment was collected; this order is not paid.`);
      onClearCart(); // Empty the cart on successful database write
    } catch (error: unknown) {
      console.error(error);
      const message = axios.isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      setErrorMessage(message || 'Checkout failed. Please ensure you are logged in as a buyer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className="cart-panel">
      <div className="cart-heading">
        <h2 className="section-title">Your bag</h2>
        <span className="cart-count">{cartItems.reduce((count, item) => count + item.quantity, 0)}</span>
      </div>

      <div className="demo-notice">
        Demo mode only: no payment is collected, and orders are not marked as paid.
      </div>

      {successMessage && (
        <div className="alert alert--success" role="status">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="alert alert--error" role="alert">
          {errorMessage}
        </div>
      )}

      {cartItems.length === 0 ? (
        <p className="empty-state">Your bag is empty. Find something you love and it will appear here.</p>
      ) : (
        <div>
          <div className="cart-items">
            {cartItems.map((item) => (
              <div className="cart-item" key={item.id}>
                <div>
                  <h3 className="cart-item-title">{item.title}</h3>
                  <div className="cart-item-meta">
                    Seller: <strong>{item.business_name}</strong>
                  </div>
                  <div className="cart-item-price">
                    {item.quantity} x {parseFloat(item.price).toFixed(2)} DH
                  </div>
                </div>
                <button className="button-quiet" onClick={() => onRemoveItem(item.id)}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="cart-total">
            <span>Subtotal</span>
            <span>{cartSubtotal.toFixed(2)} DH</span>
          </div>
          <p className="cart-caption">Taxes and delivery are not included in this demo.</p>

          <button className="button-accent button-full" onClick={handleCheckout} disabled={loading}>
            {loading ? 'Creating demo order…' : 'Place demo order'}
          </button>
        </div>
      )}
    </aside>
  );
};
