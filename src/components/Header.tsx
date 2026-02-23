import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();

  return (
    <header className="border-b border-foreground">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="text-lg font-medium tracking-tight">
          NAGSOM
        </Link>
        <nav className="flex gap-6 text-sm items-center">
          <Link to="/" className="hover:opacity-60 transition-opacity">Products</Link>
          <Link to="/cart" className="hover:opacity-60 transition-opacity">
            Cart{totalItems > 0 && <span className="ml-1 font-mono">({totalItems})</span>}
          </Link>
          <Link to="/orders" className="hover:opacity-60 transition-opacity">Orders</Link>
          {user && <Link to="/messages" className="hover:opacity-60 transition-opacity">Messages</Link>}
          <Link to="/how-to-buy" className="hover:opacity-60 transition-opacity">How to Buy</Link>
          {isAdmin && (
            <Link to="/admin" className="hover:opacity-60 transition-opacity font-medium">Admin</Link>
          )}
          {user ? (
            <button onClick={signOut} className="hover:opacity-60 transition-opacity">
              Logout
            </button>
          ) : (
            <Link to="/auth" className="hover:opacity-60 transition-opacity">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Header;
