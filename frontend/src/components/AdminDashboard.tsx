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
    <section style={{ display: 'grid', gap: 20 }}>
      <header style={{ padding: 20, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8 }}>
        <h2 style={{ marginTop: 0 }}>Admin Workspace</h2>
        <p>Review vendor applications and moderate public product listings.</p>
        <button onClick={() => setRefreshKey((key) => key + 1)} disabled={loading}>Refresh dashboard</button>
      </header>
      {errorMessage && <p role="alert" style={{ color: '#b42318' }}>{errorMessage}</p>}
      {successMessage && <p role="status" style={{ color: '#067647' }}>{successMessage}</p>}

      <div style={{ padding: 20, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Pending vendor applications</h3>
        {!loading && vendors.length === 0 ? <p>No vendor applications are waiting for approval.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {vendors.map((vendor) => (
              <div key={vendor.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #eee', paddingTop: 10 }}>
                <span><strong>{vendor.business_name}</strong> · {vendor.phone_number}</span>
                <button onClick={() => void approveVendor(vendor)}>Approve</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: 20, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8 }}>
        <h3 style={{ marginTop: 0 }}>Product moderation</h3>
        {loading ? <p>Loading products...</p> : products.length === 0 ? <p>There are no products to moderate.</p> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {products.map((product) => (
              <div key={product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, borderTop: '1px solid #eee', paddingTop: 10 }}>
                <span><strong>{product.title}</strong> · {product.business_name} · {Number(product.price).toFixed(2)} DH</span>
                <button onClick={() => void removeProduct(product)} disabled={savingProductId === product.id}>
                  {savingProductId === product.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            ))}
          </div>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 16 }}>
            <button disabled={page <= 1 || loading} onClick={() => setPage((current) => current - 1)}>Previous</button>
            <span>Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next</button>
          </div>
        )}
      </div>
    </section>
  );
};
