import { useEffect, useState } from 'react';
import axios from 'axios';
import API from '../services/api';
import type { BuyerOrder } from '../types';

interface OrdersResponse {
  data: BuyerOrder[];
}

export const BuyerOrderHistory = () => {
  const [orders, setOrders] = useState<BuyerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadOrders = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const response = await API.get<OrdersResponse>('/orders/history', { signal: controller.signal });
        setOrders(response.data.data);
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          const message = axios.isAxiosError<{ message?: string }>(error)
            ? error.response?.data?.message
            : undefined;
          setErrorMessage(message || 'Could not load your order history.');
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadOrders();
    return () => controller.abort();
  }, [refreshKey]);

  const groupedOrders = orders.reduce<Record<number, BuyerOrder[]>>((groups, item) => {
    (groups[item.order_id] ??= []).push(item);
    return groups;
  }, {});

  return (
    <section style={{ padding: 20, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <h2 style={{ marginTop: 0 }}>Your Orders</h2>
        <button onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>Refresh</button>
      </div>
      {errorMessage && <p role="alert" style={{ color: '#b42318' }}>{errorMessage}</p>}
      {loading ? <p>Loading your orders...</p> : null}
      {!loading && !errorMessage && orders.length === 0 && <p>You have not placed any demo orders yet.</p>}
      {!loading && Object.entries(groupedOrders).map(([orderId, items]) => (
        <article key={orderId} style={{ borderTop: '1px solid #eee', padding: '16px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <strong>Order #{orderId}</strong>
            <span>{new Date(items[0].created_at).toLocaleString()}</span>
          </div>
          <p style={{ margin: '8px 0', color: '#7a4b00' }}>
            Demo order — unpaid (payment status: {items[0].payment_status})
          </p>
          <ul style={{ paddingLeft: 20 }}>
            {items.map((item) => (
              <li key={item.order_item_id}>
                {item.product_title} — {item.quantity} × {Number(item.price_per_unit).toFixed(2)} DH
                {' · '}{item.business_name} · fulfillment: {item.item_status}
              </li>
            ))}
          </ul>
          <strong>Order total: {Number(items[0].total_amount).toFixed(2)} DH</strong>
        </article>
      ))}
    </section>
  );
};
