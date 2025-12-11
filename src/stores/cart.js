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
            // Add quantity and notes fields for a new item
            cartItems.value.push({ ...product, quantity: 1, notes: '' });
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
                 removeItem(productId); // Remove if quantity drops to zero
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

        // Prepare data structure for the backend POST /api/orders
        const orderData = {
            total_amount: totalPrice.value, 
            // Map cart items to the simpler structure required by the database
            items: cartItems.value.map(item => ({
                product_id: item.product_id,
                quantity: item.quantity,
                unit_price: parseFloat(item.price),
                notes: item.notes
            })),
            // staff_name is pulled from the JWT payload on the backend
        };

        try {
            const response = await apiClient.post('/orders', orderData);
            
            clearCart(); // Clear cart on successful transaction commit
            return response.data; 
        } catch (error) {
            submissionError.value = 'Order submission failed. Please check the backend log.';
            console.error('Order Submission Error:', error);
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