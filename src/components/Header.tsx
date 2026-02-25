import { Link } from 'react-router-dom';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

const Badge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  return (
    <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full">
      {count > 99 ? '99+' : count}
    </span>
  );
};

const Header = () => {
  const { totalItems } = useCart();
  const { user, isAdmin, signOut } = useAuth();
  const { adminUnreadOrders, adminUnreadMessages, userUnreadMessages } = useNotifications();

  const adminTotal = adminUnreadOrders + adminUnreadMessages;

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
          <Link to="/orders" className="hover:opacity-60 transition-opacity">
            Orders<Badge count={userUnreadMessages} />
          </Link>
          <Link to="/how-to-buy" className="hover:opacity-60 transition-opacity">How to Buy</Link>
          {isAdmin && (
            <Link to="/admin" className="hover:opacity-60 transition-opacity font-medium">
              Admin<Badge count={adminTotal} />
            </Link>
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
