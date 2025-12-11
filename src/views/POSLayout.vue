<script setup>
import { onMounted } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';

// Import local components (you will create these next)
// import MenuGrid from '../components/MenuGrid.vue'; 
// import OrderCart from '../components/OrderCart.vue'; 

const auth = useAuthStore();
const menu = useMenuStore();
const cart = useCartStore();

onMounted(() => {
    // Fetch menu data as soon as the main POS component loads
    menu.fetchMenu();
});

function handleLogout() {
    auth.logout();
    // Router guard will redirect to login
}
</script>

<template>
  <div class="flex h-screen bg-gray-50">

    <div class="absolute top-0 right-0 p-4">
        <span class="font-medium text-gray-700 mr-4">Cashier: {{ auth.userName }}</span>
        <button @click="handleLogout" class="text-sm text-red-500 hover:text-red-700">
            (Logout)
        </button>
    </div>

    <div class="flex-1 p-6 overflow-y-auto pt-16">
        <h1 class="text-3xl font-extrabold text-gray-800 mb-6">Coffee Menu</h1>
        
        <div v-if="menu.isLoading" class="text-center py-10 text-gray-500">
            Loading Menu...
        </div>
        <div v-else-if="menu.error" class="text-red-600">
            Error loading menu: {{ menu.error }}
        </div>
        <div v-else>
            <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                <div v-for="categoryName in menu.categories" :key="categoryName" class="col-span-4 mt-6">
                    <h2 class="text-2xl font-semibold text-gray-700 border-b pb-2 mb-4">{{ categoryName }}</h2>
                    <div v-for="product in menu.menuData[categoryName]" :key="product.product_id"
                        @click="cart.addItem(product)"
                        class="bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition cursor-pointer border border-gray-200"
                    >
                        <p class="font-bold text-lg">{{ product.name }}</p>
                        <p class="text-green-600">${{ product.price }}</p>
                    </div>
                </div>
            </div>
            </div>
    </div>

    <div class="w-full lg:w-96 bg-white border-l border-gray-200 p-6 flex flex-col shadow-2xl">
        <h2 class="text-2xl font-extrabold text-gray-800 mb-6">Current Order</h2>
        
        <div class="flex-1 overflow-y-auto space-y-3">
            <div v-if="cart.cartItems.length === 0" class="text-gray-500 text-center py-10">
                No items added yet.
            </div>
            <div v-for="item in cart.cartItems" :key="item.product_id" class="flex justify-between items-center py-2 border-b">
                <div class="flex-1">
                    <p class="font-medium">{{ item.name }}</p>
                    <p class="text-sm text-gray-500">Qty: {{ item.quantity }} x ${{ item.price }}</p>
                </div>
                <div class="text-right font-semibold">
                    ${{ (parseFloat(item.price) * item.quantity).toFixed(2) }}
                </div>
            </div>
        </div>

        <div class="mt-6 pt-4 border-t border-gray-300">
            <div class="flex justify-between text-xl font-bold mb-4">
                <span>TOTAL:</span>
                <span class="text-green-600">${{ cart.totalPrice }}</span>
            </div>

            <button
                @click="cart.submitOrder"
                :disabled="cart.cartItems.length === 0 || cart.isSubmitting"
                class="w-full py-3 px-4 rounded-lg text-white font-semibold text-lg transition duration-150"
                :class="cart.cartItems.length > 0 ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'"
            >
                <span v-if="cart.isSubmitting">Processing...</span>
                <span v-else>Checkout & Confirm KHQR Payment</span>
            </button>
            <p v-if="cart.submissionError" class="text-red-500 text-center mt-2 text-sm">{{ cart.submissionError }}</p>
        </div>
    </div>

  </div>
</template>