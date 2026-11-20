import { useEffect, useState } from 'react';
import axios from 'axios';
import API from '../services/api';
import type { PendingVendor, Product } from '../types';

interface DataResponse<T> {
  data: T;
}

interface ProductResponse extends DataResponse<Product[]> {
  pagination: {
    currentPage: number;
    totalPages: number;
  };
}

const getErrorMessage = (error: unknown, fallback: string) =>
  axios.isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || fallback : fallback;

export const AdminDashboard = () => {
  const [vendors, setVendors] = useState<PendingVendor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const loadDashboard = async () => {
      setLoading(true);
      setErrorMessage('');
      try {
        const [vendorResponse, productResponse] = await Promise.all([
          API.get<DataResponse<PendingVendor[]>>('/admin/vendors/pending', { signal: controller.signal }),
          API.get<ProductResponse>('/products', { params: { page, limit: 10 }, signal: controller.signal }),
        ]);
        setVendors(vendorResponse.data.data);
        setProducts(productResponse.data.data);
        setTotalPages(Math.max(productResponse.data.pagination.totalPages, 1));
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setErrorMessage(getErrorMessage(error, 'Could not load the admin dashboard.'));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadDashboard();
    return () => controller.abort();
  }, [page, refreshKey]);

  const approveVendor = async (vendor: PendingVendor) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await API.put(`/admin/approve-vendor/${vendor.id}`);
      setSuccessMessage(`${vendor.business_name} was approved.`);
      setRefreshKey((key) => key + 1);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not approve this vendor.'));
    }
  };

  const removeProduct = async (product: Product) => {
    if (!window.confirm(`Remove "${product.title}" from the catalog?`)) return;
    setSavingProductId(product.id);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      await API.delete(`/admin/products/${product.id}`);
      setSuccessMessage(`"${product.title}" was removed from the catalog.`);
      setRefreshKey((key) => key + 1);
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, 'Could not remove this product.'));
    } finally {
      setSavingProductId(null);
    }
  };

  return (
    <section className="dashboard-stack">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">Marketplace operations</p>
          <h2>Admin workspace</h2>
          <p>Review seller applications and keep the marketplace in good shape.</p>
        </div>
        <button className="button-outline" onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>
          Refresh workspace
        </button>
      </header>
      {errorMessage && <p className="alert alert--error" role="alert">{errorMessage}</p>}
      {successMessage && <p className="alert alert--success" role="status">{successMessage}</p>}

      <div className="dashboard-card">
        <h3>Seller applications</h3>
        {!loading && vendors.length === 0 ? <p className="empty-state">No seller applications are waiting for review.</p> : (
          <div className="data-list">
            {vendors.map((vendor) => (
              <div className="data-row" key={vendor.id}>
                <div className="data-row-copy">
                  <strong>{vendor.business_name}</strong>
                  <p>{vendor.phone_number} · Applied {new Date(vendor.created_at).toLocaleDateString()}</p>
                </div>
                <button className="button-accent button-small" onClick={() => void approveVendor(vendor)}>Approve</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard-card">
        <h3>Product moderation</h3>
        {loading ? <p className="loading-state">Loading products…</p> : products.length === 0 ? <p className="empty-state">There are no products to review.</p> : (
          <div className="data-list">
            {products.map((product) => (
              <div className="data-row" key={product.id}>
                <div className="data-row-copy">
                  <strong>{product.title}</strong>
                  <p>{product.business_name} · {Number(product.price).toFixed(2)} DH</p>
                </div>
                <button className="button-danger button-small" onClick={() => void removeProduct(product)} disabled={savingProductId === product.id}>
                  {savingProductId === product.id ? 'Removing…' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="button-outline button-small" disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button className="button-outline button-small" disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        )}
      </div>
    </section>
  );
};
