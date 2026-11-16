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
    <div style={{ padding: '20px', border: '1px solid #e0e0e0', borderRadius: '8px', backgroundColor: '#fff', width: '100%', boxSizing: 'border-box', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#333', borderBottom: '2px solid #f57c00', paddingBottom: '10px', marginTop: 0 }}>Your Shopping Cart</h2>

      <div style={{ padding: '12px', marginBottom: '15px', color: '#7a4b00', backgroundColor: '#fff3cd', border: '1px solid #ffeeba', borderRadius: '4px', fontSize: '14px' }}>
        Demo mode only: no payment is collected, and orders are not marked as paid.
      </div>

      {successMessage && (
        <div style={{ padding: '12px', marginBottom: '15px', color: '#155724', backgroundColor: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '4px', fontSize: '14px' }}>
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div style={{ padding: '12px', marginBottom: '15px', color: '#721c24', backgroundColor: '#721c2415', border: '1px solid #721c2430', borderRadius: '4px', fontSize: '14px' }}>
          {errorMessage}
        </div>
      )}

      {cartItems.length === 0 ? (
        <p style={{ color: '#888', textAlign: 'center', padding: '30px 0' }}>Your cart is empty. Add items from the marketplace to begin.</p>
      ) : (
        <div>
          <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '20px' }}>
            {cartItems.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee' }}>
                <div style={{ flexGrow: 1, paddingRight: '10px' }}>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: '#333' }}>{item.title}</h4>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Seller: <span style={{ fontWeight: 'bold' }}>{item.business_name}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#f57c00', fontWeight: 'bold', marginTop: '2px' }}>
                    {item.quantity} x {parseFloat(item.price).toFixed(2)} DH
                  </div>
                </div>
                <button onClick={() => onRemoveItem(item.id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#d32f2f', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', textDecoration: 'underline' }}>
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '2px solid #eee', paddingTop: '15px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: '#333' }}>
              <span>Total Amount:</span>
              <span style={{ color: '#f57c00' }}>{cartSubtotal.toFixed(2)} DH</span>
            </div>
            <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#888', textAlign: 'right' }}>Includes VAT and multi-vendor delivery route splitting.</p>
          </div>

          <button onClick={handleCheckout} disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: '#f57c00', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '16px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Creating Demo Order...' : 'Place Demo Order (No Payment)'}
          </button>
        </div>
      )}
    </div>
  );
};
