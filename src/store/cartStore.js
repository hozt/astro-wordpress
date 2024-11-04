// src/store/cartStore.js

import { atom } from 'nanostores';

export const cartItems = atom(getInitialCartItems());

function getInitialCartItems() {
  if (typeof localStorage !== 'undefined') {
    const storedItems = localStorage.getItem('cartItems');
    return storedItems ? JSON.parse(storedItems) : [];
  }
  return [];
}

function updateCart(items) {
  cartItems.set(items);
  localStorage.setItem('cartItems', JSON.stringify(items));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('cartUpdated', { detail: items }));
  }
}

export function addToCart(item) {
  const currentItems = cartItems.get();
  const existingItemIndex = currentItems.findIndex(i => i.id === item.id);
  if (existingItemIndex > -1) {
    currentItems[existingItemIndex].quantity += 1;
  } else {
    currentItems.push({ ...item, quantity: 1 });
  }
  updateCart(currentItems);
}

export function removeFromCart(id) {
  const currentItems = cartItems.get();
  console.log('Current items before removal:', currentItems);
  console.log('Attempting to remove item with id:', id);

  const stringId = String(id);

  const index = currentItems.findIndex(item => String(item.id) === stringId);
  console.log('Found item at index:', index);

  if (index > -1) {
    console.log('Removing item at index:', index);
    currentItems.splice(index, 1);
    console.log('Items after removal:', currentItems);
  } else {
    console.log('Item not found in cart');
  }

  updateCart(currentItems);
}

export function updateQuantity(id, newQuantity) {
  const currentItems = cartItems.get();
  const updatedItems = currentItems.map(item =>
    item.id === id ? { ...item, quantity: newQuantity } : item
  );
  cartItems.set(updatedItems);
  localStorage.setItem('cartItems', JSON.stringify(updatedItems));
  window.dispatchEvent(new CustomEvent('cartUpdated', { detail: updatedItems }));
}

export function getCartTotal(items, shippingMethod) {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingPrice = shippingMethod ? shippingMethod.price : 0;
  return {
    subtotal,
    shipping: shippingPrice,
    total: subtotal + shippingPrice
  };
}
