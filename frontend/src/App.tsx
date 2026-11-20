import { useState } from 'react';
import { AuthCard } from './components/AuthCard';
import { ProductCatalog } from './components/ProductCatalog';
import { CartDrawer } from './components/CartDrawer';
import { BuyerOrderHistory } from './components/BuyerOrderHistory';
import { VendorDashboard } from './components/VendorDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import type { CartItem, Product, User } from './types';

const isUser = (value: unknown): value is User => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('id' in value) ||
    !('name' in value) ||
    !('email' in value) ||
    !('role' in value)
  ) {
    return false;
  }

  return (
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'buyer' || value.role === 'vendor' || value.role === 'admin')
  );
};

const getSavedUser = (): User | null => {
  const savedUser = localStorage.getItem('jumia_user');
  if (!savedUser) {
    return null;
  }

  try {
    const parsedUser: unknown = JSON.parse(savedUser);
    if (isUser(parsedUser)) {
      return parsedUser;
    }

    console.error('Stored user session data has an unexpected shape.');
  } catch (error) {
    console.error('Failed to parse active user session tracking data:', error);
  }

  return null;
};

function App() {
  const [user, setUser] = useState<User | null>(getSavedUser);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [activeView, setActiveView] = useState<'marketplace' | 'orders' | 'vendor' | 'admin'>(() =>
    user?.role === 'vendor' ? 'vendor' : user?.role === 'admin' ? 'admin' : 'marketplace'
  );

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setActiveView(authenticatedUser.role === 'vendor' ? 'vendor' : authenticatedUser.role === 'admin' ? 'admin' : 'marketplace');
  };

  const handleLogout = () => {
    localStorage.removeItem('jumia_token');
    localStorage.removeItem('jumia_user');
    setUser(null);
    setCart([]);
    setActiveView('marketplace');
  };

  const handleAddToCart = (product: Product) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((item) => item.id === product.id);
      if (existingItem) {
        return prevCart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }

      return [
        ...prevCart,
        {
          id: product.id,
          title: product.title,
          price: product.price,
          business_name: product.business_name,
          quantity: 1,
        },
      ];
    });
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== productId));
  };

  const handleClearCart = () => {
    setCart([]);
  };

  return (
    <div className="app-shell">
      <header className={`site-header${user ? '' : ' site-header--landing'}`}>
        <div className="header-inner">
          <a
            className="brand-lockup"
            href="#"
            onClick={(event) => {
              event.preventDefault();
              if (user?.role === 'buyer') setActiveView('marketplace');
            }}
          >
            <span className="brand-wordmark">jumia</span>
            <span className="brand-caption">marketplace</span>
          </a>

          {user ? (
            <div className="header-actions">
              <nav className="header-nav" aria-label="Main navigation">
                {user.role === 'buyer' && (
                  <>
                    <button className="header-nav-button" onClick={() => setActiveView('marketplace')} aria-pressed={activeView === 'marketplace'}>
                      Discover
                    </button>
                    <button className="header-nav-button" onClick={() => setActiveView('orders')} aria-pressed={activeView === 'orders'}>
                      My orders
                    </button>
                  </>
                )}
                {user.role === 'vendor' && (
                  <button className="header-nav-button" onClick={() => setActiveView('vendor')} aria-pressed={activeView === 'vendor'}>
                    Seller studio
                  </button>
                )}
                {user.role === 'admin' && (
                  <button className="header-nav-button" onClick={() => setActiveView('admin')} aria-pressed={activeView === 'admin'}>
                    Admin
                  </button>
                )}
              </nav>
              <div className="header-user">
                <span className="user-greeting">Hi, <strong>{user.name}</strong></span>
                <span className="role-pill">{user.role}</span>
                <button className="button-outline button-small" onClick={handleLogout}>Sign out</button>
              </div>
            </div>
          ) : (
            <span className="brand-caption">A marketplace for good finds</span>
          )}
        </div>
      </header>

      {!user ? (
        <main className="landing-main">
          <section className="landing-hero">
            <div className="landing-copy">
              <p className="eyebrow">Good finds. Great stories.</p>
              <h1 className="landing-title">A little more <em>meaning</em> in every find.</h1>
              <p className="landing-description">
                Discover independent sellers and thoughtful finds, all in one welcoming marketplace.
              </p>
              <p className="landing-note">Browse the marketplace, meet local sellers, and find your next favorite.</p>
            </div>
            <div className="auth-panel">
              <AuthCard onAuthSuccess={handleAuthSuccess} />
            </div>
          </section>
          <footer className="app-footer">Jumia Marketplace · Discover something worth keeping.</footer>
        </main>
      ) : (
        <main className="main-shell">
          {user.role === 'buyer' && activeView === 'marketplace' && (
            <>
              <section className="workspace-heading">
                <div className="workspace-heading-copy">
                  <p className="eyebrow">The marketplace</p>
                  <h1 className="page-title">Find your next favorite.</h1>
                  <p className="page-subtitle">A fresh mix of products from independent sellers.</p>
                </div>
                <span className="status-pill">{cart.reduce((count, item) => count + item.quantity, 0)} items in your cart</span>
              </section>
              <div className="market-layout">
                <section className="market-column" aria-label="Product listings">
                  <ProductCatalog onAddToCart={handleAddToCart} />
                </section>
                <CartDrawer cartItems={cart} onRemoveItem={handleRemoveFromCart} onClearCart={handleClearCart} />
              </div>
            </>
          )}
          {user.role === 'buyer' && activeView === 'orders' && <BuyerOrderHistory />}
          {user.role === 'vendor' && activeView === 'vendor' && <VendorDashboard />}
          {user.role === 'admin' && activeView === 'admin' && <AdminDashboard />}
        </main>
      )}
    </div>
  );
}

export default App;
