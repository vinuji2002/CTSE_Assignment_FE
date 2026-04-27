"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trash2, Plus, Minus, ShoppingBag,
  ArrowLeft, CreditCard, Truck, Loader2,
} from "lucide-react";
import { useCartStore } from "@/store/useCartStore";
import { useAuthStore } from "@/store/useAuthStore";
import { useNotificationStore } from "@/store/useNotificationStore";
import { cartService } from "@/services/cart.service";
import { OrderSuccess } from "@/components/motion/shared/OrderSuccess";
import { notificationService } from "@/services/notification.service";


export default function CartPage() {
  const [mounted, setMounted] = useState(false);
  const [isOrdered, setIsOrdered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');

  const router = useRouter();

  const { items, updateQuantity, removeItem, getTotalPrice, clearCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const { addNotification, addConfirmation } = useNotificationStore(); //    updated

  useEffect(() => {
    setMounted(true);
  }, []);

  const subtotal = getTotalPrice();
  const deliveryFee = subtotal > 0 ? 2.5 : 0;
  const total = subtotal + deliveryFee;

  //    Handle quantity update with backend sync
  const handleUpdateQuantity = async (id: string, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    //    Prevent going below 1
    if (item.quantity <= 1 && delta < 0) return;

    const newQuantity = item.quantity + delta;

    //    Update local store first
    updateQuantity(id, delta);

    //    Sync with backend if logged in
    if (isAuthenticated) {
      try {
        await cartService.updateItem(id, newQuantity);
      } catch (error) {
        //    Silent fail
      }
    }
  };

  //    Handle remove with confirmation toast
  const handleRemoveItem = (id: string, name: string) => {
    //    Show confirmation using notification store toast
    addConfirmation(
      `Remove "${name}" from your cart?`,
      //    onConfirm: Yes, Remove clicked
      async () => {
        removeItem(id);
        addNotification(`"${name}" removed from cart`, 'info');
        if (isAuthenticated) {
          try {
            await cartService.removeItem(id);
          } catch (error) {
            //    Silent fail
          }
        }
      },
      //    onCancel: Cancel clicked — do nothing
    );
  };

  //    Handle checkout
  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      addNotification('Please login to place an order', 'error');
      router.push('/login');
      return;
    }

    if (!shippingAddress.trim()) {
      setOrderError('Please enter a delivery address');
      return;
    }

    try {
      setIsLoading(true);
      setOrderError('');

      await cartService.checkout(shippingAddress);

      clearCart();
      setIsOrdered(true);
      addNotification('Order placed successfully!', 'success');
      addNotification('Receipt has been sent to your email!', 'success');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        'Failed to place order. Please try again.';
      setOrderError(message);
      addNotification(message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-4">
            <div className="h-32 bg-white rounded-[2.5rem] animate-pulse shadow-sm" />
            <div className="h-32 bg-white rounded-[2.5rem] animate-pulse shadow-sm" />
          </div>
          <div className="h-96 bg-white rounded-[3rem] animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

  if (isOrdered) {
    return (
      <div className="min-h-screen pt-32 flex items-center justify-center bg-gray-50">
        <OrderSuccess />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center space-y-8 max-w-md mx-auto text-center"
        >
          <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center shadow-xl shadow-gray-200/50">
            <ShoppingBag size={56} className="text-orange-600" />
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-gray-900">
              Your cart is empty
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed">
              Looks like you haven't added any delicious meals yet!
            </p>
          </div>
          <Link
            href="/menu"
            className="bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-orange-700 transition-all flex items-center gap-3 shadow-lg shadow-orange-200 active:scale-95"
          >
            <ArrowLeft size={20} />
            Browse Menu
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-32 pb-20 px-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <Link
            href="/menu"
            className="p-3 bg-white hover:bg-gray-100 rounded-full transition-colors shadow-sm"
          >
            <ArrowLeft size={24} className="text-gray-900" />
          </Link>
          <h1 className="text-4xl font-black text-gray-900">Checkout</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">

          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="flex flex-col sm:flex-row items-center gap-6 bg-white p-5 rounded-[2.5rem] border border-gray-100 shadow-sm"
                >
                  <div className="relative h-28 w-28 rounded-2xl overflow-hidden flex-shrink-0">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="font-bold text-xl text-gray-900">
                      {item.name}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {item.category}
                    </p>
                    <p className="text-orange-600 font-black text-lg mt-1">
                      ${item.price.toFixed(2)}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-5 bg-gray-50 px-5 py-2.5 rounded-2xl">
                    {/*    Minus disabled at quantity 1 */}
                    <button
                      onClick={() => handleUpdateQuantity(item.id, -1)}
                      disabled={item.quantity <= 1}
                      className="text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400"
                    >
                      <Minus size={20} />
                    </button>
                    <span className="font-black text-xl min-w-[24px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleUpdateQuantity(item.id, 1)}
                      className="text-gray-400 hover:text-orange-600 transition-colors"
                    >
                      <Plus size={20} />
                    </button>
                  </div>

                  {/*    Delete button triggers confirmation toast */}
                  <button
                    onClick={() => handleRemoveItem(item.id, item.name)}
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                  >
                    <Trash2 size={24} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>

            {/*    Add Items button aligned with cards */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <Link
                href="/menu"
                className="flex items-center gap-2 bg-orange-600 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-orange-700 transition-all active:scale-95 shadow-lg shadow-orange-200"
              >
                <Plus size={18} />
                Add Items
              </Link>
            </motion.div>
          </div>

          {/* Order Summary Sidebar */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-2xl shadow-gray-200/50 lg:sticky lg:top-32"
          >
            <h2 className="text-2xl font-black text-gray-900 mb-8">
              Order Summary
            </h2>

            <div className="space-y-5 mb-6">
              <div className="flex justify-between text-gray-600 font-medium">
                <span className="flex items-center gap-3">
                  <ShoppingBag size={20} className="text-gray-400" /> Subtotal
                </span>
                <span className="text-gray-900 font-bold">
                  ${subtotal.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 font-medium">
                <span className="flex items-center gap-3">
                  <Truck size={20} className="text-gray-400" /> Delivery
                </span>
                <span className="text-gray-900 font-bold">
                  ${deliveryFee.toFixed(2)}
                </span>
              </div>
              <div className="border-t border-dashed border-gray-200 pt-6 flex justify-between items-center">
                <span className="text-xl font-black text-gray-900">Total</span>
                <span className="text-3xl font-black text-orange-600">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Shipping Address */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Delivery Address{' '}
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="Enter your delivery address"
                className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={handlePlaceOrder}
                disabled={isLoading}
                className="w-full bg-gray-900 text-white py-5 rounded-[2rem] font-black text-lg flex items-center justify-center gap-3 hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={22} className="animate-spin" />
                    Placing Order...
                  </>
                ) : (
                  <>
                    <CreditCard size={22} />
                    Confirm & Pay
                  </>
                )}
              </button>

              {/* Error message */}
              {orderError && (
                <p className="text-red-500 text-sm text-center font-medium">
                  {orderError}
                </p>
              )}

              {/* Login prompt */}
              {!isAuthenticated && (
                <p className="text-orange-500 text-sm text-center font-medium">
                  Please{' '}
                  <Link href="/login" className="underline font-bold">
                    login
                  </Link>
                  {' '}to place an order
                </p>
              )}

              <p className="text-xs text-center text-gray-400 font-medium px-4">
                Tax included. Secure checkout powered by GustoBistro Pay.
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}