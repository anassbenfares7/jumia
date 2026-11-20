import React, { useState, useEffect } from 'react';
import API from '../services/api';
import type { Product } from '../types';

interface PaginationMeta {
  totalItems: number;
  totalPages: number;
  currentPage: number;
  itemsPerPage: number;
}

interface ProductCatalogProps {
  onAddToCart: (product: Product) => void;
}

interface ProductCatalogResponse {
  data: Product[];
  pagination: PaginationMeta;
}

export const ProductCatalog: React.FC<ProductCatalogProps> = ({ onAddToCart }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState('');
  const [category, setCategory] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const fetchCatalog = async () => {
      const params: Record<string, string | number> = { page, limit: 6 };
      if (submittedSearch) params.search = submittedSearch;
      if (category) params.category = category;

      try {
        setErrorMessage('');
        const response = await API.get<ProductCatalogResponse>('/products', {
          params,
          signal: controller.signal,
        });
        setProducts(response.data.data);
        setPagination(response.data.pagination);
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          console.error('Error fetching marketplace catalog:', error);
          setErrorMessage('We could not load listings right now. Please try again.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void fetchCatalog();
    return () => controller.abort();
  }, [page, category, submittedSearch, refreshKey]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    setSubmittedSearch(search);
    setRefreshKey((current) => current + 1);
  };

  const handleCategoryChange = (nextCategory: string) => {
    setLoading(true);
    setPage(1);
    setCategory(nextCategory);
    setRefreshKey((current) => current + 1);
  };

  const handlePageChange = (nextPage: number) => {
    setLoading(true);
    setPage(nextPage);
  };

  return (
    <div className="catalog">
      <div className="catalog-toolbar">
        <form className="search-form" onSubmit={handleSearchSubmit}>
          <input
            className="search-input"
            type="text"
            placeholder="Search products, brands, categories on Jumia..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
          />
          <button className="button-accent" type="submit">
            Search
          </button>
        </form>

        <div className="category-list" aria-label="Filter by category">
          <button className="topic-pill" aria-pressed={category === ''} onClick={() => handleCategoryChange('')}>
            All Items
          </button>
          <button className="topic-pill" aria-pressed={category === 'electronics'} onClick={() => handleCategoryChange('electronics')}>
            Electronics
          </button>
          <button className="topic-pill" aria-pressed={category === 'fashion'} onClick={() => handleCategoryChange('fashion')}>
            Fashion
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="alert alert--error" role="alert">
          {errorMessage}
          <button className="button-outline button-small" onClick={() => setRefreshKey((current) => current + 1)}>
            Retry
          </button>
        </div>
      )}
      {loading ? (
        <div className="loading-state">Loading marketplace listings…</div>
      ) : products.length === 0 ? (
        <div className="empty-state">
          <h3>No items found matching your filter selection.</h3>
          <p>Try clearing your search query or looking into another product category.</p>
        </div>
      ) : (
        <div>
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-image-wrap">
                  {product.image_url ? (
                    <img className="product-image" src={product.image_url} alt={product.title} loading="lazy" />
                  ) : (
                    <div className="product-image product-image--placeholder" aria-hidden="true">
                      {product.title.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="product-content">
                  <p className="product-category">{product.category_name}</p>
                  <h3 className="product-title">{product.title}</h3>
                  <p className="product-description">{product.description}</p>
                  <span className="product-seller">By {product.business_name}</span>
                  <div className="product-card-footer">
                    <span className="product-price">{parseFloat(product.price).toFixed(2)} DH</span>
                    {product.stock > 0 ? (
                      <button className="button-accent button-small" onClick={() => onAddToCart(product)}>
                        Add to Cart
                      </button>
                    ) : (
                      <span className="muted-copy">Out of stock</span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="pagination">
              <button className="button-outline button-small" disabled={page === 1} onClick={() => handlePageChange(page - 1)}>
                Previous
              </button>
              <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button className="button-outline button-small" disabled={page === pagination.totalPages} onClick={() => handlePageChange(page + 1)}>
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
