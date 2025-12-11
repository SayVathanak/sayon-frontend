// sayon-frontend/src/stores/cart.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '../services/api'; 

export const useCartStore = defineStore('cart', () => {
    // --- STATE ---
    const cartItems = ref([]);
    const isSubmitting = ref(false);
    const submissionError = ref(null);

    // --- GETTERS ---
    const totalPrice = computed(() => {
        return cartItems.value.reduce((total, item) => 
            total + (parseFloat(item.price) * item.quantity), 0
        ).toFixed(2);
    });

    // --- ACTIONS ---
    function addItem(product) {
        const existingItem = cartItems.value.find(item => item.product_id === product.product_id);
        
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cartItems.value.push({ ...product, quantity: 1 });
        }
    }

    function removeItem(productId) {
        cartItems.value = cartItems.value.filter(item => item.product_id !== productId);
    }
    
    function updateQuantity(productId, quantity) {
        const item = cartItems.value.find(i => i.product_id === productId);
        if (item) {
            item.quantity = quantity;
            if (item.quantity <= 0) {
                 removeItem(productId);
            }
        }
    }

    function clearCart() {
        cartItems.value = [];
    }

    async function submitOrder() {
        if (cartItems.value.length === 0) return;

        isSubmitting.value = true;
        submissionError.value = null;

        // Prepare order payload matching backend expectations
        const orderData = {
            total: parseFloat(totalPrice.value),
            items: cartItems.value.map(item => {
                // Use original_id if it exists (for customized products), otherwise use product_id
                const productId = item.original_id || item.product_id;
                
                console.log('🛒 Mapping cart item:', {
                    cartId: item.product_id,
                    dbId: productId,
                    name: item.name,
                    qty: item.quantity,
                    price: item.price
                });

                return {
                    product_id: productId,
                    quantity: item.quantity,
                    price: parseFloat(item.price)
                };
            })
        };

        console.log('📤 Submitting order:', orderData);

        try {
            const response = await apiClient.post('/orders', orderData);
            console.log('✅ Order submitted successfully:', response.data);
            
            clearCart();
            return response.data; 
        } catch (error) {
            submissionError.value = 'Order submission failed. Please check the backend log.';
            console.error('❌ Order Submission Error:', error.response?.data || error.message);
            throw error;
        } finally {
            isSubmitting.value = false;
        }
    }

    return { 
        cartItems, 
        totalPrice, 
        isSubmitting, 
        submissionError, 
        addItem, 
        removeItem, 
        updateQuantity, 
        clearCart, 
        submitOrder 
    };
});