import { create } from 'zustand';

export const useStore = create((set) => ({
  // 👤 FELHASZNÁLÓI ÁLLAPOTOK
  user: JSON.parse(localStorage.getItem('sandwichUser')) || null,
  
  setUser: (userData) => {
    localStorage.setItem('sandwichUser', JSON.stringify(userData));
    localStorage.setItem('lastActivityTime', Date.now().toString());
    set({ user: userData });
  },
  
  logout: () => {
    localStorage.removeItem('sandwichUser');
    localStorage.removeItem('sandwichToken');
    localStorage.removeItem('lastActivityTime');
    set({ user: null, cart: [], isAdminView: false, isProfileView: false });
  },

  // 🛒 KOSÁR ÁLLAPOTOK ÉS LOGIKA
  cart: JSON.parse(localStorage.getItem('sandwichCart')) || [],
  
  addToCart: (sandwich, qty) => set((state) => {
    const existingItem = state.cart.find(item => item.sandwichId === sandwich.id);
    let newCart;
    if (existingItem) {
      newCart = state.cart.map(item => 
        item.sandwichId === sandwich.id ? { ...item, quantity: item.quantity + qty } : item
      );
    } else {
      newCart = [...state.cart, { sandwichId: sandwich.id, name: sandwich.name, price: sandwich.price, quantity: qty }];
    }
    localStorage.setItem('sandwichCart', JSON.stringify(newCart));
    return { cart: newCart };
  }),
  
  setCart: (newCart) => {
    localStorage.setItem('sandwichCart', JSON.stringify(newCart));
    set({ cart: newCart });
  },
  
  clearCart: () => {
    localStorage.setItem('sandwichCart', JSON.stringify([]));
    set({ cart: [] });
  },

  isAdminView: false,
  setIsAdminView: (val) => set({ isAdminView: val }),
  
  isProfileView: false,
  setIsProfileView: (val) => set({ isProfileView: val })
}));