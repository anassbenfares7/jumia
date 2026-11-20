import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import API from '../services/api';
import type { Category, VendorOrder, VendorProduct, VendorProfile } from '../types';

interface DataResponse<T> {
  data: T;
}

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

const fulfillmentStatuses: VendorOrder['status'][] = [
  'placed',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

export const VendorDashboard = () => {
  const [profile, setProfile] = useState<VendorProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [productForm, setProductForm] = useState({
    categoryId: '',
    title: '',
    description: '',
    price: '',
    stock: '',
    imageUrl: '',
  });
  const [orderStatuses, setOrderStatuses] = useState<Record<number, VendorOrder['status']>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const profileResponse = await API.get<DataResponse<VendorProfile | null>>('/vendors/profile', {
          signal: controller.signal,
        });
        const vendorProfile = profileResponse.data.data;
        setProfile(vendorProfile);
        setProfileLoaded(true);

        if (vendorProfile?.is_approved) {
          const [categoryResponse, productResponse, orderResponse] = await Promise.all([
            API.get<DataResponse<Category[]>>('/products/categories', { signal: controller.signal }),
            API.get<DataResponse<VendorProduct[]>>('/vendors/products', { signal: controller.signal }),
            API.get<DataResponse<VendorOrder[]>>('/vendors/orders', { signal: controller.signal }),
          ]);
          setCategories(categoryResponse.data.data);
          setProducts(productResponse.data.data);
          setOrders(orderResponse.data.data);
          setOrderStatuses(Object.fromEntries(
            orderResponse.data.data.map((order) => [order.order_item_id, order.status])
          ));
        }
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setErrorMessage(getErrorMessage(error, 'Could not load the vendor dashboard.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, [refreshKey]);

  const registerProfile = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const response = await API.post<DataResponse<VendorProfile>>('/vendors/register-profile', {
        businessName,
        phoneNumber,
      });
      setProfile(response.data.data);
      setSuccessMessage('Business profile submitted. It must be approved before you can list products.');
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not submit your business profile.'));
    } finally {
      setSaving(false);
    }
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await API.post('/products', {
        ...productForm,
        categoryId: Number(productForm.categoryId),
        price: Number(productForm.price),
        stock: Number(productForm.stock),
        imageUrl: productForm.imageUrl || undefined,
      });
      setProductForm({ categoryId: '', title: '', description: '', price: '', stock: '', imageUrl: '' });
      setSuccessMessage('Product listed successfully.');
      setRefreshKey((key) => key + 1);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not create the product listing.'));
    } finally {
      setSaving(false);
    }
  };

  const updateFulfillment = async (order: VendorOrder) => {
    const status = orderStatuses[order.order_item_id] || order.status;
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await API.put(`/vendors/orders/${order.order_item_id}/status`, { status });
      setSuccessMessage(`Order item #${order.order_item_id} updated to ${status}.`);
      setRefreshKey((key) => key + 1);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not update the fulfillment status.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !profileLoaded) return <p className="loading-state">Loading seller studio…</p>;

  return (
    <section className="dashboard-stack">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Seller studio</p>
          <h2>Make good things happen.</h2>
          <p>Manage your business, listings, and orders in one place.</p>
        </div>
        <button className="button-outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          Refresh studio
        </button>
      </header>
      {errorMessage && <p className="alert alert--error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="alert alert--success" role="status">{successMessage}</p>}

      {!profile && (
        <form className="dashboard-card dashboard-form" onSubmit={registerProfile}>
          <h3>Register your business</h3>
          <label className="form-field">
            Business name
            <input required maxLength={255} autoComplete="organization" value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
          </label>
          <label className="form-field">
            Contact phone
            <input required maxLength={50} autoComplete="tel" value={phoneNumber} onChange={(event) => setPhoneNumber(event.target.value)} />
          </label>
          <button className="button-accent" type="submit" disabled={saving}>{saving ? 'Submitting…' : 'Submit for approval'}</button>
        </form>
      )}

      {profile && (
        <div className="dashboard-card">
          <p className="eyebrow">Business profile</p>
          <h3>{profile.business_name}</h3>
          <p className="muted-copy">Contact: {profile.phone_number}</p>
          <strong className={`status-pill ${profile.is_approved ? 'status-approved' : 'status-pending'}`}>
            {profile.is_approved ? 'Approved — you can manage listings and orders.' : 'Pending admin approval'}
          </strong>
        </div>
      )}

      {profile?.is_approved && (
        <>
          <form className="dashboard-card dashboard-form" onSubmit={createProduct}>
            <h3>Add a product</h3>
            <label className="form-field">
              Category
              <select required value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}>
                <option value="">Choose a category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </label>
            <label className="form-field">Product name<input required maxLength={255} value={productForm.title} onChange={(event) => setProductForm({ ...productForm, title: event.target.value })} /></label>
            <label className="form-field">Description<textarea required value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} /></label>
            <label className="form-field">Price (DH)<input required type="number" min="0" step="0.01" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} /></label>
            <label className="form-field">Stock<input required type="number" min="0" step="1" value={productForm.stock} onChange={(event) => setProductForm({ ...productForm, stock: event.target.value })} /></label>
            <label className="form-field">Image URL (optional)<input type="url" value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} /></label>
            <button className="button-accent" type="submit" disabled={saving || categories.length === 0}>{saving ? 'Saving…' : 'Create listing'}</button>
          </form>

          <div className="dashboard-card">
            <h3>Your listings</h3>
            <p className="muted-copy">Product editing and vendor-side removal are not available in this demo.</p>
            {products.length === 0 ? <p className="empty-state">You haven’t listed a product yet.</p> : (
              <div className="data-list">{products.map((product) => (
                <div className="data-row" key={product.id}>
                  <div className="data-row-copy">
                    <strong>{product.title}</strong>
                    <p>{product.category_name} · {Number(product.price).toFixed(2)} DH · Stock: {product.stock}</p>
                  </div>
                </div>
              ))}</div>
            )}
          </div>

          <div className="dashboard-card">
            <h3>Orders to fulfill</h3>
            {orders.length === 0 ? <p className="empty-state">No orders are assigned to your store yet.</p> : (
              <div className="data-list">
                {orders.map((order) => (
                  <div className="order-card" key={order.order_item_id}>
                    <div className="data-row-copy">
                      <strong>{order.product_title}</strong>
                      <p>Buyer: {order.buyer_name} · Quantity: {order.quantity} · {Number(order.price_per_unit).toFixed(2)} DH each</p>
                    </div>
                    <div className="order-status-form">
                      <label className="form-field">
                        Fulfillment status
                        <select
                          value={orderStatuses[order.order_item_id] || order.status}
                          onChange={(event) => setOrderStatuses({
                            ...orderStatuses,
                            [order.order_item_id]: event.target.value as VendorOrder['status'],
                          })}
                        >
                          {fulfillmentStatuses.map((status) => <option key={status} value={status}>{status}</option>)}
                        </select>
                      </label>
                      <button className="button-outline button-small" onClick={() => void updateFulfillment(order)} disabled={saving}>
                        Save status
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
};
