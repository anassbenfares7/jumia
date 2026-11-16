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
    <div style={{ backgroundColor: '#f5f5f5', minHeight: '100vh', margin: 0, padding: 0, fontFamily: 'sans-serif' }}>
      {/* Global Brand Navigation Header bar */}
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #e0e0e0', padding: '15px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h1 style={{ color: '#f57c00', margin: 0, fontSize: '26px', fontWeight: 'black', letterSpacing: '-0.5px' }}>
          JUMIA <span style={{ color: '#333', fontSize: '16px', fontWeight: 'normal' }}>Clone Workspace</span>
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              {user.role === 'buyer' && (
                <nav aria-label="Buyer navigation" style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setActiveView('marketplace')} aria-pressed={activeView === 'marketplace'}>Marketplace</button>
                  <button onClick={() => setActiveView('orders')} aria-pressed={activeView === 'orders'}>My Orders</button>
                </nav>
              )}
              {user.role === 'vendor' && (
                <button onClick={() => setActiveView('vendor')} aria-pressed={activeView === 'vendor'}>Vendor Workspace</button>
              )}
              {user.role === 'admin' && (
                <button onClick={() => setActiveView('admin')} aria-pressed={activeView === 'admin'}>Admin Workspace</button>
              )}
              <span style={{ fontSize: '14px', color: '#555' }}>
                Welcome, <span style={{ fontWeight: 'bold', color: '#333' }}>{user.name}</span> 
                <span style={{ marginLeft: '8px', padding: '3px 8px', borderRadius: '12px', backgroundColor: '#f57c0020', color: '#f57c00', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  {user.role}
                </span>
              </span>
              <button onClick={handleLogout} style={{ padding: '6px 12px', border: '1px solid #ccc', borderRadius: '4px', backgroundColor: '#fff', color: '#d32f2f', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}>
                Logout
              </button>
            </div>
          ) : (
            <span style={{ fontSize: '14px', color: '#888', fontWeight: 'bold' }}>Guest Session Dashboard</span>
          )}
        </div>
      </header>

      {/* Main Responsive Grid Layout Content */}
      <main style={{ maxWidth: '1400px', margin: '30px auto', padding: '0 20px', display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
        
        {/* If the current session tracking context is completely unauthenticated, serve the gateway gate */}
        {!user && <AuthCard onAuthSuccess={handleAuthSuccess} />}

        {!user && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '30px', alignItems: 'start', opacity: 0.4, pointerEvents: 'none' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '15px' }}>
              <h2 style={{ margin: '0 0 10px 10px', color: '#333', fontSize: '20px' }}>Discover Jumia Listings</h2>
              <ProductCatalog onAddToCart={handleAddToCart} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
              <CartDrawer cartItems={cart} onRemoveItem={handleRemoveFromCart} onClearCart={handleClearCart} />
              <div style={{ padding: '15px', border: '1px dashed #f57c00', borderRadius: '8px', backgroundColor: '#f57c0005', color: '#f57c00', textAlign: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                Sign in as a buyer to use the cart and demo checkout.
              </div>
            </div>
          </div>
        )}

        {user?.role === 'buyer' && activeView === 'marketplace' && (
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '30px', alignItems: 'start' }}>
            <div style={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e0e0e0', padding: '15px' }}>
              <h2 style={{ margin: '0 0 10px 10px', color: '#333', fontSize: '20px' }}>Discover Jumia Listings</h2>
              <ProductCatalog onAddToCart={handleAddToCart} />
            </div>
            <CartDrawer cartItems={cart} onRemoveItem={handleRemoveFromCart} onClearCart={handleClearCart} />
          </div>
        )}
        {user?.role === 'buyer' && activeView === 'orders' && <BuyerOrderHistory />}
        {user?.role === 'vendor' && activeView === 'vendor' && <VendorDashboard />}
        {user?.role === 'admin' && activeView === 'admin' && <AdminDashboard />}

      </main>
    </div>
  );
}

export default App;
