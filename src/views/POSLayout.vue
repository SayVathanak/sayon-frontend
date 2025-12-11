<script setup>
import { onMounted, ref, computed, reactive, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { sendToCustomer } from '../services/dualScreen';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import { 
    LogOut, Search, ShoppingBag, Plus, Minus, Trash2, 
    Coffee, X, CreditCard, Loader2, ExternalLink, RefreshCcw, Check, ListPlus 
} from 'lucide-vue-next';

const auth = useAuthStore();
const menu = useMenuStore();
const cart = useCartStore();

const [cartListRef] = useAutoAnimate(); 
const showMobileCart = ref(false); 
const searchQuery = ref('');
const activeCategory = ref('All');
const isPaymentMode = ref(false);

// --- OPTION MODAL STATE ---
const showOptionsModal = ref(false);
const selectedProduct = ref(null);
const currentOptions = reactive({}); // Stores { "Sugar": "50%", "Ice": "Normal" }

onMounted(() => {
    menu.fetchMenu();
});

// --- FILTER LOGIC ---
const filteredProducts = computed(() => {
    let products = [];
    if (menu.menuData) {
        if (activeCategory.value === 'All') {
            Object.values(menu.menuData).forEach(items => {
                if (Array.isArray(items)) products.push(...items);
            });
        } else {
            products = menu.menuData[activeCategory.value] || [];
        }
    }
    return products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase());
        const isAvailable = p.is_available !== false; 
        return matchesSearch && isAvailable;
    });
});

// --- DUAL SCREEN SYNC ---
watch(() => cart.cartItems, (newItems) => {
    if (!isPaymentMode.value) {
        sendToCustomer('UPDATE_CART', { 
            items: JSON.parse(JSON.stringify(newItems)), 
            total: cart.totalPrice 
        });
    }
}, { deep: true });

function openCustomerScreen() {
    window.open('/customer', 'CustomerDisplay', 'width=1000,height=800,menubar=no,toolbar=no');
}

// --- ACTIONS ---
function handleLogout() { auth.logout(); }

// 💡 SMART ADD TO CART
function handleProductClick(product) {
    if (isPaymentMode.value) return;

    // 1. If product has options (Sugar, etc.), open modal
    if (product.options && product.options.length > 0) {
        selectedProduct.value = product;
        // Reset selections
        Object.keys(currentOptions).forEach(key => delete currentOptions[key]);
        // Auto-select first option for speed? (Optional)
        product.options.forEach(opt => {
            if (opt.values.length > 0) currentOptions[opt.name] = opt.values[0]; 
        });
        showOptionsModal.value = true;
    } else {
        // 2. No options? Add directly.
        cart.addItem(product);
    }
}

function confirmOptions() {
    if (!selectedProduct.value) return;
    
    // Create a unique variant based on options
    // e.g. "Iced Latte (Sugar: 50%)"
    const optionsText = Object.entries(currentOptions)
        .map(([key, val]) => `${val}`)
        .join(', ');
        
    const productToAdd = {
        ...selectedProduct.value,
        product_id: `${selectedProduct.value.product_id}-${optionsText}`, // Unique ID for cart
        name: `${selectedProduct.value.name} ${optionsText ? '(' + optionsText + ')' : ''}`,
        original_id: selectedProduct.value.product_id
    };

    cart.addItem(productToAdd);
    showOptionsModal.value = false;
    selectedProduct.value = null;
}

function adjustQty(item, delta) {
    if (isPaymentMode.value) return; 
    const newQty = item.quantity + delta;
    newQty > 0 ? cart.updateQuantity(item.product_id, newQty) : cart.removeItem(item.product_id);
}

// --- CHECKOUT LOGIC ---
function handleCheckoutStart() {
    if (cart.cartItems.length === 0) return;
    isPaymentMode.value = true;
    sendToCustomer('SHOW_PAYMENT', { total: cart.totalPrice });
}

function handleUpdateOrder() {
    isPaymentMode.value = false;
    sendToCustomer('UPDATE_CART', { items: JSON.parse(JSON.stringify(cart.cartItems)), total: cart.totalPrice });
}

function handleCancelOrder() {
    if(confirm("Clear entire order?")) {
        cart.clearCart();
        isPaymentMode.value = false;
        sendToCustomer('UPDATE_CART', { items: [], total: 0 });
    }
}

async function handlePaymentSuccess() {
    try {
        await cart.submitOrder();
        sendToCustomer('PAYMENT_SUCCESS', {});
        isPaymentMode.value = false;
    } catch (err) { alert("Error saving order."); }
}
</script>

<template>
  <div class="flex flex-col h-screen bg-white font-sans text-zinc-900 overflow-hidden antialiased">
    
    <header class="bg-white border-b border-zinc-100 h-16 flex items-center justify-between px-4 sm:px-8 shrink-0 z-20">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-black text-white flex items-center justify-center font-black text-sm tracking-tighter rounded-sm">S</div>
            <h1 class="font-bold text-sm tracking-widest uppercase hidden sm:block">Sayon POS</h1>
        </div>
        <div class="flex-1 max-w-md mx-6 relative group">
            <Search class="absolute left-0 top-1/2 -translate-y-1/2 text-zinc-300 group-focus-within:text-black transition-colors" size="16" />
            <input v-model="searchQuery" type="text" placeholder="SEARCH MENU..." class="w-full pl-8 pr-4 py-2 bg-transparent border-b border-zinc-100 text-xs font-bold uppercase tracking-wider focus:border-black focus:outline-none transition-colors placeholder-zinc-300" :disabled="isPaymentMode">
        </div>
        <div class="flex items-center gap-6">
            <div class="text-right hidden sm:block"><p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Location</p><p class="text-xs font-bold uppercase">{{ auth.userName }}</p></div>
            <button @click="handleLogout" class="text-zinc-400 hover:text-black transition-colors"><LogOut size="18" /></button>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
        <main class="flex-1 flex flex-col min-w-0 bg-white" :class="{'opacity-50 pointer-events-none': isPaymentMode}">
            <div class="px-6 pt-6 pb-2 flex gap-8 overflow-x-auto no-scrollbar shrink-0 border-b border-transparent">
                <button @click="activeCategory = 'All'" :class="activeCategory === 'All' ? 'text-black border-black' : 'text-zinc-400 border-transparent hover:text-zinc-600'" class="pb-2 border-b-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors">All Items</button>
                <button v-for="cat in menu.categories" :key="cat" @click="activeCategory = cat" :class="activeCategory === cat ? 'text-black border-black' : 'text-zinc-400 border-transparent hover:text-zinc-600'" class="pb-2 border-b-2 text-[10px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors">{{ cat }}</button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 pb-32 sm:pb-6">
                <div v-if="menu.isLoading" class="flex items-center justify-center h-64"><Loader2 class="animate-spin w-6 h-6 text-zinc-300" /></div>
                <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-zinc-300"><Coffee size="48" class="mb-4 opacity-20"/><p class="text-xs font-bold uppercase tracking-widest">No items found</p></div>
                <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
                    <div v-for="product in filteredProducts" :key="product.product_id" @click="handleProductClick(product)" class="group cursor-pointer">
                        <div class="aspect-[4/5] bg-zinc-50 mb-3 relative overflow-hidden">
                            <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-cover transition-transform duration-700" />
                            <div v-else class="w-full h-full flex items-center justify-center text-zinc-200"><Coffee size="32" /></div>
                            <div v-if="product.options && product.options.length" class="absolute top-2 left-2 bg-zinc-900 text-white text-[8px] font-bold px-1.5 py-0.5 uppercase tracking-wide">Options</div>
                        </div>
                        <div class="flex justify-between items-start">
                            <div><h3 class="font-bold text-xs uppercase leading-tight mb-1 truncate w-24">{{ product.name }}</h3><p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{{ product.category_name }}</p></div>
                            <span class="font-mono text-xs font-bold">${{ Number(product.price).toFixed(2) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <aside class="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white transform transition-transform duration-300 z-30 flex flex-col sm:relative sm:translate-y-0 border-l border-zinc-100" :class="showMobileCart ? 'translate-y-0' : 'translate-y-[100%] sm:translate-y-0'">
            <div class="sm:hidden flex justify-between items-center p-4 border-b border-zinc-100"><h2 class="text-xs font-bold uppercase tracking-widest">Current Order</h2><button @click="showMobileCart = false"><X size="20"/></button></div>
            <div class="hidden sm:flex p-6 border-b border-zinc-100 justify-between items-center bg-zinc-50/50">
                <h2 class="text-xs font-bold uppercase tracking-widest flex items-center gap-2"><ShoppingBag size="16"/> Order #{{ Math.floor(Math.random() * 900) + 100 }}</h2>
                <span class="font-mono text-xs text-zinc-400">{{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
            </div>

            <div class="flex-1 overflow-y-auto p-6 space-y-6" ref="cartListRef">
                <div v-if="cart.cartItems.length === 0" class="h-full flex flex-col items-center justify-center text-zinc-300 space-y-2 opacity-60">
                    <div class="w-12 h-12 border-2 border-zinc-200 border-dashed rounded-full flex items-center justify-center"><ShoppingBag size="20" /></div><p class="text-[10px] font-bold uppercase tracking-widest">Cart Empty</p>
                </div>
                <div v-for="item in cart.cartItems" :key="item.product_id" class="flex gap-4 group" :class="{'opacity-50': isPaymentMode}">
                    <div class="w-12 h-12 bg-zinc-50 shrink-0 border border-zinc-100"><img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" /><div v-else class="w-full h-full flex items-center justify-center"><Coffee size="16" class="text-zinc-300"/></div></div>
                    <div class="flex-1">
                        <div class="flex justify-between items-start mb-1">
                            <p class="font-bold text-xs uppercase leading-tight">{{ item.name }}</p>
                            <p class="font-mono text-xs font-bold text-zinc-900">${{ (parseFloat(item.price) * item.quantity).toFixed(2) }}</p>
                        </div>
                        <p class="text-[10px] text-zinc-400 font-mono mb-2">${{ item.price }} x {{ item.quantity }}</p>
                        <div v-if="!isPaymentMode" class="flex items-center gap-4">
                            <div class="flex items-center border border-zinc-200">
                                <button @click="adjustQty(item, -1)" class="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 transition-colors"><Minus size="10"/></button>
                                <span class="w-6 text-center font-mono text-xs font-bold">{{ item.quantity }}</span>
                                <button @click="adjustQty(item, 1)" class="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 transition-colors"><Plus size="10"/></button>
                            </div>
                            <button @click="cart.removeItem(item.product_id)" class="text-zinc-300 hover:text-red-600 transition-colors text-[9px] font-bold uppercase tracking-wider">Remove</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-6 bg-zinc-50 border-t border-zinc-100 z-10">
                <div v-if="!isPaymentMode">
                    <div class="space-y-2 mb-6 border-b border-zinc-200 pb-6 border-dashed">
                        <div class="flex justify-between items-end text-xs text-zinc-500 uppercase tracking-wide"><span>Subtotal</span><span class="font-mono">${{ cart.totalPrice }}</span></div>
                        <div class="flex justify-between items-end text-xl font-black uppercase mt-2"><span>Total</span><span class="font-mono">${{ cart.totalPrice }}</span></div>
                    </div>
                    <div class="grid grid-cols-4 gap-2">
                        <button @click="openCustomerScreen" class="col-span-1 bg-white border border-zinc-200 text-zinc-600 flex items-center justify-center hover:bg-zinc-100 transition-colors"><ExternalLink size="18"/></button>
                        <button @click="handleCheckoutStart" :disabled="cart.cartItems.length === 0" class="col-span-3 bg-black text-white h-[50px] text-xs font-bold uppercase tracking-[0.2em] hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm">Checkout <CreditCard size="16"/></button>
                    </div>
                </div>
                <div v-else class="space-y-3">
                    <div class="text-center mb-6 p-4 bg-white border border-zinc-200"><p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 animate-pulse mb-1">Waiting for payment...</p><p class="text-3xl font-mono font-black">${{ cart.totalPrice }}</p></div>
                    <button @click="handleUpdateOrder" class="w-full py-3 bg-white border border-zinc-200 text-zinc-600 font-bold text-xs uppercase hover:bg-zinc-50 transition-colors flex items-center justify-center gap-2"><RefreshCcw size="14"/> Update Order</button>
                    <div class="grid grid-cols-2 gap-2">
                        <button @click="handleCancelOrder" class="py-3 bg-red-50 text-red-600 font-bold text-xs uppercase hover:bg-red-100 transition-colors flex items-center justify-center gap-2"><X size="14"/> Cancel</button>
                        <button @click="handlePaymentSuccess" class="py-3 bg-green-600 text-white font-bold text-xs uppercase hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-md"><Check size="16"/> Paid</button>
                    </div>
                </div>
            </div>
        </aside>

        <div v-if="!showMobileCart" @click="showMobileCart = true" class="sm:hidden fixed bottom-0 left-0 right-0 bg-black text-white p-4 z-40 flex justify-between items-center cursor-pointer">
            <div class="flex items-center gap-3"><div class="bg-white text-black w-6 h-6 flex items-center justify-center font-mono font-bold text-xs rounded-sm">{{ cart.cartItems.length }}</div><span class="font-bold text-xs uppercase tracking-widest">View Cart</span></div><span class="font-mono font-bold text-lg">${{ cart.totalPrice }}</span>
        </div>
        <div v-if="showMobileCart" @click="showMobileCart = false" class="sm:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-20"></div>

    </div>

    <div v-if="showOptionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/90 backdrop-blur-md animate-fade-in">
        <div class="w-full max-w-sm bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h3 class="font-black uppercase tracking-widest text-lg mb-1">{{ selectedProduct?.name }}</h3>
            <p class="text-xs text-zinc-500 font-bold uppercase tracking-wide mb-6">Select Options</p>

            <div v-for="optionGroup in selectedProduct?.options" :key="optionGroup.name" class="mb-6">
                <p class="text-[10px] font-bold uppercase tracking-widest mb-3">{{ optionGroup.name }}</p>
                <div class="grid grid-cols-2 gap-2">
                    <button 
                        v-for="val in optionGroup.values" 
                        :key="val"
                        @click="currentOptions[optionGroup.name] = val"
                        class="py-3 text-[10px] font-bold uppercase tracking-wider border transition-all"
                        :class="currentOptions[optionGroup.name] === val ? 'bg-black text-white border-black' : 'bg-white text-zinc-500 border-zinc-200 hover:border-black'"
                    >
                        {{ val }}
                    </button>
                </div>
            </div>

            <div class="flex gap-4 mt-8">
                <button @click="showOptionsModal = false" class="flex-1 py-3 border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-50">Cancel</button>
                <button @click="confirmOptions" class="flex-1 py-3 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 shadow-lg">Confirm</button>
            </div>
        </div>
    </div>

  </div>
</template>

<style>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>