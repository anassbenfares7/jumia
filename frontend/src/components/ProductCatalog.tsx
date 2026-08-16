import React, { useState, useEffect } from 'react';
import API from '../services/api';

interface Product {
  id: number;
  title: string;
  description: string;
  price: string;
  stock: number;
  image_url: string;
  category_name: string;
  business_name: string;
}

interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

interface ProductCatalogProps {
  onAddToCart: (product: Product) => void;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchCatalog = async () => {
    setLoading(true);
    try {
      // Build dynamic query parameters for our paginated backend endpoint
      const params: any = { page, limit: 6 };
      if (search) params.search = search;
      if (category) params.category = category;

      const response = await API.get('/products', { params });
      setProducts(response.data.data);
      setPagination(response.data.pagination);
    } catch (err) {
      console.error('Error fetching marketplace catalog:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch automatically whenever page or category filters change
  useEffect(() => {
    fetchCatalog();
  }, [page, category]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 on a fresh search
    fetchCatalog();
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '20px' }}>
      {/* Search & Filter Header Bar */}
      <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginBottom: '30px', alignItems: 'center' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexGrow: 1, maxWidth: '500px' }}>
          <input
            type="text"
            placeholder="Search products, brands, categories on Jumia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '10px 15px', border: '1px solid #ccc', borderRadius: '4px 0 0 4px', fontSize: '15px', outline: 'none' }}
          />
          <button type="submit" style={{ padding: '10px 20px', border: 'none', backgroundColor: '#f57c00', color: '#fff', fontWeight: 'bold', borderRadius: '0 4px 4px 0', cursor: 'pointer' }}>
            Search
          </button>
        </form>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setCategory(''); setPage(1); }} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '20px', backgroundColor: category === '' ? '#f57c00' : '#fff', color: category === '' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 'bold' }}>
            All Items
          </button>
          <button onClick={() => { setCategory('electronics'); setPage(1); }} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '20px', backgroundColor: category === 'electronics' ? '#f57c00' : '#fff', color: category === 'electronics' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 'bold' }}>
            Electronics
          </button>
          <button onClick={() => { setCategory('fashion'); setPage(1); }} style={{ padding: '8px 15px', border: '1px solid #ccc', borderRadius: '20px', backgroundColor: category === 'fashion' ? '#f57c00' : '#fff', color: category === 'fashion' ? '#fff' : '#333', cursor: 'pointer', fontWeight: 'bold' }}>
            Fashion
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px', fontSize: '18px', color: '#666' }}>Loading marketplace listings...</div>
      ) : products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px', border: '1px dashed #ccc', borderRadius: '8px', color: '#666' }}>
          <h3>No items found matching your filter selection.</h3>
          <p>Try clearing your search query or looking into another product category.</p>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '25px', marginBottom: '30px' }}>
            {products.map((product) => (
              <div key={product.id} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '15px', display: 'flex', flexDirection: 'column', justifyContent: 'between', backgroundColor: '#fff', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                <img
                  src={product.image_url || 'https://placeholder.com'}
                  alt={product.title}
                  style={{ width: '100%', height: '200px', objectFit: 'contain', marginBottom: '15px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}
                />
                <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#f57c00', fontWeight: 'bold', marginBottom: '5px' }}>
                  {product.category_name}
                </div>
                <h3 style={{ fontSize: '16px', margin: '0 0 10px 0', height: '44px', overflow: 'hidden', color: '#333' }}>{product.title}</h3>
                <p style={{ fontSize: '13px', color: '#666', height: '36px', overflow: 'hidden', margin: '0 0 15px 0' }}>{product.description}</p>
                
                <div style={{ margin: 'auto 0 0 0' }}>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '5px' }}>
                    Seller: <span style={{ fontWeight: 'bold', color: '#555' }}>{product.business_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#333' }}>{parseFloat(product.price).toFixed(2)} DH</span>
                    {product.stock > 0 ? (
                      <button onClick={() => onAddToCart(product)} style={{ backgroundColor: '#f57c00', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px' }}>
                        Add to Cart
                      </button>
                    ) : (
                      <span style={{ color: '#d32f2f', fontWeight: 'bold', fontSize: '13px' }}>Out of Stock</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination && pagination.totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
              <button disabled={page === 1} onClick={() => setPage((prev) => prev - 1)} style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}>
                Previous
              </button>
              <span style={{ fontWeight: 'bold', color: '#555' }}>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button disabled={page === pagination.totalPages} onClick={() => setPage((prev) => prev + 1)} style={{ padding: '8px 15px', borderRadius: '4px', border: '1px solid #ccc', backgroundColor: '#fff', cursor: page === pagination.totalPages ? 'not-allowed' : 'pointer', opacity: page === pagination.totalPages ? 0.5 : 1 }}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
