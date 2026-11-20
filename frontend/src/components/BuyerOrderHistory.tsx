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
    <section className="dashboard-stack">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Your account</p>
          <h1>Your orders</h1>
          <p>Track the details and fulfillment of your marketplace orders.</p>
        </div>
        <button className="button-outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          Refresh orders
        </button>
      </header>
      {errorMessage && <p className="alert alert--error" role="alert">{errorMessage}</p>}
      {loading && <p className="loading-state">Loading your orders…</p>}
      {!loading && !errorMessage && orders.length === 0 && (
        <p className="empty-state">You haven’t placed an order yet. Your next great find is out there.</p>
      )}
      {!loading && orders.length > 0 && (
        <div className="dashboard-card">
          {Object.entries(groupedOrders).map(([orderId, items]) => (
            <article className="order-card" key={orderId}>
              <div className="order-card-header">
                <strong>Order #{orderId}</strong>
                <time dateTime={items[0].created_at}>{new Date(items[0].created_at).toLocaleString()}</time>
              </div>
              <p className="alert alert--notice">
                Demo order · Unpaid (payment status: {items[0].payment_status})
              </p>
              <ul>
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
        </div>
      )}
    </section>
  );
};
