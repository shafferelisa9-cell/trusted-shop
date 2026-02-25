import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { KeyProvider } from "@/contexts/KeyProvider";
import Index from "./pages/Index";
import ProductDetail from "./pages/ProductDetail";
import OrderStatus from "./pages/OrderStatus";
import MyOrders from "./pages/MyOrders";
import HowToBuy from "./pages/HowToBuy";
import Cart from "./pages/Cart";
import Reviews from "./pages/Reviews";
import Messages from "./pages/Messages";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppRoutes = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <KeyProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/order/:token" element={<OrderStatus />} />
              <Route path="/orders" element={<MyOrders />} />
              <Route path="/how-to-buy" element={<HowToBuy />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/reviews/:id" element={<Reviews />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
        </KeyProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default AppRoutes;
