<script setup>
import { onMounted, ref, computed, reactive, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { sendToCustomer } from '../services/dualScreen';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import { 
    LogOut, Search, ShoppingBag, Plus, Minus, Trash2, 
    Coffee, X, CreditCard, Loader2, ExternalLink, RefreshCcw, Check, 
    ChevronRight, SlidersHorizontal 
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
const currentOptions = reactive({}); 

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

function handleProductClick(product) {
    if (isPaymentMode.value) return;

    // 1. If options exist, open modal
    if (product.options && product.options.length > 0) {
        selectedProduct.value = product;
        Object.keys(currentOptions).forEach(key => delete currentOptions[key]);
        // Auto-select first option
        product.options.forEach(opt => {
            if (opt.values.length > 0) currentOptions[opt.name] = opt.values[0]; 
        });
        showOptionsModal.value = true;
    } else {
        // 2. Add directly
        cart.addItem(product);
    }
}

function confirmOptions() {
    if (!selectedProduct.value) return;
    
    const optionsText = Object.entries(currentOptions)
        .map(([key, val]) => `${val}`)
        .join(', ');
        
    const productToAdd = {
        ...selectedProduct.value,
        // Create a unique cart ID that includes options
        product_id: `${selectedProduct.value.product_id}-${Date.now()}-${optionsText}`,
        // Store the original numeric ID for the database
        original_id: selectedProduct.value.product_id,
        // Update the display name with options
        name: `${selectedProduct.value.name} (${optionsText})`,
        // Keep other properties
        price: selectedProduct.value.price,
        image_url: selectedProduct.value.image_url,
        category_name: selectedProduct.value.category_name
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
  <div class="flex flex-col h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden antialiased selection:bg-red-100 selection:text-red-900">
    
    <header class="bg-white h-16 flex items-center justify-between px-6 shrink-0 z-20 shadow-sm border-b border-zinc-100">
        <div class="flex items-center gap-3">
            <div class="w-8 h-8 bg-red-800 text-white flex items-center justify-center font-black text-sm rounded-lg shadow-red-200 shadow-lg">S</div>
            <h1 class="font-bold text-lg tracking-tight text-red-950 hidden sm:block">Sayon<span class="text-red-800">.POS</span></h1>
        </div>

        <div class="flex-1 max-w-lg mx-8 relative group hidden md:block">
            <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 group-focus-within:text-red-800 transition-colors" size="18" />
            <input 
                v-model="searchQuery" 
                type="text" 
                placeholder="Search menu items..." 
                class="w-full pl-11 pr-4 py-2.5 bg-zinc-100 rounded-full text-sm font-medium focus:bg-white focus:ring-2 focus:ring-red-100 focus:outline-none transition-all placeholder-zinc-400" 
                :disabled="isPaymentMode"
            >
        </div>

        <div class="flex items-center gap-6">
            <div class="text-right hidden sm:block">
                <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-0.5">Cashier</p>
                <p class="text-sm font-bold text-zinc-800">{{ auth.userName }}</p>
            </div>
            <button @click="handleLogout" class="w-10 h-10 rounded-full bg-zinc-50 hover:bg-red-50 text-zinc-500 hover:text-red-800 flex items-center justify-center transition-colors">
                <LogOut size="18" />
            </button>
        </div>
    </header>

    <div class="flex-1 flex overflow-hidden relative">
        
        <main class="flex-1 flex flex-col min-w-0 bg-zinc-50" :class="{'opacity-50 pointer-events-none grayscale': isPaymentMode}">
            
            <div class="px-6 py-4 flex gap-3 overflow-x-auto no-scrollbar shrink-0">
                <button 
                    @click="activeCategory = 'All'" 
                    class="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all shadow-sm border"
                    :class="activeCategory === 'All' ? 'bg-red-800 text-white border-red-800 shadow-red-200' : 'bg-white text-zinc-500 border-zinc-200 hover:border-red-200 hover:text-red-800'"
                >
                    All Items
                </button>
                <button 
                    v-for="cat in menu.categories" 
                    :key="cat" 
                    @click="activeCategory = cat" 
                    class="px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all shadow-sm border whitespace-nowrap"
                    :class="activeCategory === cat ? 'bg-red-800 text-white border-red-800 shadow-red-200' : 'bg-white text-zinc-500 border-zinc-200 hover:border-red-200 hover:text-red-800'"
                >
                    {{ cat }}
                </button>
            </div>

            <div class="flex-1 overflow-y-auto p-6 pt-0 pb-32 sm:pb-6">
                <div v-if="menu.isLoading" class="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 class="animate-spin w-8 h-8 text-red-800" />
                    <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Loading Menu...</p>
                </div>

                <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-zinc-300">
                    <Coffee size="64" class="mb-4 opacity-20 text-red-900"/>
                    <p class="text-sm font-bold text-zinc-400">No items found matching your search.</p>
                </div>

                <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    <div 
                        v-for="product in filteredProducts" 
                        :key="product.product_id" 
                        @click="handleProductClick(product)" 
                        class="group cursor-pointer bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl hover:shadow-red-100/50 border border-transparent hover:border-red-100 transition-all duration-300 flex flex-col relative overflow-hidden"
                    >
                        <div class="aspect-square bg-zinc-50 rounded-xl mb-3 relative overflow-hidden">
                            <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div v-else class="w-full h-full flex items-center justify-center text-zinc-200 bg-zinc-50">
                                <Coffee size="32" />
                            </div>
                            
                            <div v-if="product.options && product.options.length" class="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-zinc-800 text-[9px] font-bold px-2 py-1 rounded-full shadow-sm flex items-center gap-1">
                                <SlidersHorizontal size="10" /> Options
                            </div>

                            <div class="absolute inset-0 bg-red-900/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <div class="bg-white text-red-800 w-10 h-10 rounded-full flex items-center justify-center shadow-lg transform scale-50 group-hover:scale-100 transition-transform">
                                    <Plus size="20" stroke-width="3" />
                                </div>
                            </div>
                        </div>
                        
                        <div class="flex-1 flex flex-col justify-between">
                            <div>
                                <h3 class="font-bold text-sm text-zinc-800 leading-tight mb-1 line-clamp-2">{{ product.name }}</h3>
                                <p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{{ product.category_name }}</p>
                            </div>
                            <div class="mt-3 flex items-center justify-between">
                                <span class="text-sm font-black text-red-800">${{ Number(product.price).toFixed(2) }}</span>
                                <div class="w-6 h-6 rounded-full bg-zinc-50 group-hover:bg-red-50 flex items-center justify-center text-zinc-300 group-hover:text-red-800 transition-colors">
                                    <ChevronRight size="14" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <aside 
            class="fixed inset-y-0 right-0 w-full sm:w-[400px] bg-white shadow-2xl z-30 flex flex-col sm:relative sm:translate-y-0 border-l border-zinc-100 transition-transform duration-300" 
            :class="showMobileCart ? 'translate-y-0' : 'translate-y-full sm:translate-y-0'"
        >
            <div class="p-6 border-b border-zinc-100 flex justify-between items-center bg-white z-10">
                <div>
                    <h2 class="text-sm font-black uppercase tracking-widest text-zinc-800 flex items-center gap-2">
                        Current Order
                    </h2>
                    <p class="text-[10px] font-bold text-zinc-400 mt-1">#{{ Math.floor(Math.random() * 900) + 100 }} • {{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</p>
                </div>
                <button @click="showMobileCart = false" class="sm:hidden w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center"><X size="18"/></button>
                <div class="hidden sm:flex bg-red-50 text-red-800 px-3 py-1 rounded-full text-xs font-bold items-center gap-1">
                    <ShoppingBag size="14"/> {{ cart.cartItems.length }}
                </div>
            </div>

            <div class="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50/50" ref="cartListRef">
                <div v-if="cart.cartItems.length === 0" class="h-full flex flex-col items-center justify-center text-zinc-300 gap-3 opacity-60">
                    <div class="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center">
                        <ShoppingBag size="24" class="text-zinc-400"/>
                    </div>
                    <p class="text-xs font-bold uppercase tracking-widest">No Items Added</p>
                </div>

                <div 
                    v-for="item in cart.cartItems" 
                    :key="item.product_id" 
                    class="bg-white p-3 rounded-xl shadow-sm border border-transparent hover:border-red-100 transition-colors flex gap-4 group"
                    :class="{'opacity-50 grayscale': isPaymentMode}"
                >
                    <div class="w-16 h-16 bg-zinc-50 rounded-lg shrink-0 overflow-hidden relative">
                         <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
                         <div v-else class="w-full h-full flex items-center justify-center"><Coffee size="20" class="text-zinc-300"/></div>
                    </div>

                    <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div class="flex justify-between items-start gap-2">
                            <p class="font-bold text-sm text-zinc-800 leading-tight truncate">{{ item.name }}</p>
                            <p class="font-bold text-sm text-red-800">${{ (parseFloat(item.price) * item.quantity).toFixed(2) }}</p>
                        </div>
                        
                        <div class="flex items-end justify-between mt-2">
                            <p class="text-[10px] text-zinc-400 font-medium">${{ item.price }} / unit</p>
                            
                            <div v-if="!isPaymentMode" class="flex items-center bg-zinc-100 rounded-lg p-0.5 gap-2">
                                <button @click="adjustQty(item, -1)" class="w-6 h-6 bg-white rounded-md shadow-sm flex items-center justify-center hover:text-red-600 transition-colors">
                                    <Minus size="12"/>
                                </button>
                                <span class="w-4 text-center text-xs font-bold">{{ item.quantity }}</span>
                                <button @click="adjustQty(item, 1)" class="w-6 h-6 bg-white rounded-md shadow-sm flex items-center justify-center hover:text-green-600 transition-colors">
                                    <Plus size="12"/>
                                </button>
                            </div>
                            <span v-else class="text-xs font-bold text-zinc-500">x{{ item.quantity }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="p-6 bg-white border-t border-zinc-100 z-10 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                
                <div v-if="!isPaymentMode" class="space-y-4">
                    <div class="space-y-2">
                        <div class="flex justify-between items-end text-xs font-bold text-zinc-400 uppercase tracking-wide">
                            <span>Subtotal</span>
                            <span>${{ cart.totalPrice }}</span>
                        </div>
                        <div class="flex justify-between items-end">
                            <span class="text-sm font-black uppercase text-zinc-800">Total Due</span>
                            <span class="text-2xl font-black text-red-800 tracking-tight">${{ cart.totalPrice }}</span>
                        </div>
                    </div>
                    
                    <div class="flex gap-3">
                        <button @click="openCustomerScreen" class="w-12 h-12 bg-zinc-100 text-zinc-600 rounded-xl flex items-center justify-center hover:bg-zinc-200 transition-colors" title="Open Customer Screen">
                            <ExternalLink size="20"/>
                        </button>
                        
                        <button
                            @click="handleCheckoutStart"
                            :disabled="cart.cartItems.length === 0"
                            class="flex-1 bg-red-800 text-white h-12 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-lg shadow-red-200 active:scale-[0.98]"
                        >
                            Checkout <CreditCard size="16"/>
                        </button>
                    </div>
                </div>

                <div v-else class="space-y-4">
                    <div class="text-center p-4 bg-red-50 rounded-xl border border-red-100">
                        <div class="flex justify-center mb-2">
                            <Loader2 class="animate-spin text-red-800" size="24"/>
                        </div>
                        <p class="text-[10px] font-bold uppercase tracking-widest text-red-800 mb-1">Awaiting Payment</p>
                        <p class="text-3xl font-black text-zinc-900">${{ cart.totalPrice }}</p>
                    </div>

                    <button @click="handleUpdateOrder" class="w-full py-3 bg-white border-2 border-zinc-100 text-zinc-600 rounded-xl font-bold text-xs uppercase hover:border-zinc-300 transition-colors flex items-center justify-center gap-2">
                        <RefreshCcw size="14"/> Modify Order
                    </button>

                    <div class="grid grid-cols-2 gap-3">
                        <button @click="handleCancelOrder" class="py-3 bg-zinc-100 text-zinc-500 rounded-xl font-bold text-xs uppercase hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center gap-2">
                            <X size="14"/> Cancel
                        </button>
                        <button @click="handlePaymentSuccess" class="py-3 bg-green-600 text-white rounded-xl font-bold text-xs uppercase hover:bg-green-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-200">
                            <Check size="16"/> Paid
                        </button>
                    </div>
                </div>
            </div>
        </aside>

        <div v-if="!showMobileCart" @click="showMobileCart = true" class="sm:hidden fixed bottom-6 left-6 right-6 bg-red-800 text-white p-4 rounded-full z-40 flex justify-between items-center cursor-pointer shadow-xl shadow-red-900/20 active:scale-95 transition-transform">
            <div class="flex items-center gap-3">
                <div class="bg-white/20 w-8 h-8 flex items-center justify-center font-bold text-xs rounded-full">{{ cart.cartItems.length }}</div>
                <span class="font-bold text-xs uppercase tracking-widest">View Cart</span>
            </div>
            <span class="font-bold text-lg">${{ cart.totalPrice }}</span>
        </div>
        
        <Transition enter-active-class="transition opacity-0 duration-200" enter-to-class="opacity-100" leave-active-class="transition opacity-100 duration-200" leave-to-class="opacity-0">
             <div v-if="showMobileCart" @click="showMobileCart = false" class="sm:hidden fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-20"></div>
        </Transition>
    </div>

    <Transition 
        enter-active-class="transition duration-200 ease-out" 
        enter-from-class="opacity-0 scale-95" 
        enter-to-class="opacity-100 scale-100" 
        leave-active-class="transition duration-150 ease-in" 
        leave-from-class="opacity-100 scale-100" 
        leave-to-class="opacity-0 scale-95"
    >
        <div v-if="showOptionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" @click="showOptionsModal = false"></div>
            
            <div class="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl">
                <div class="text-center mb-6">
                    <div class="w-16 h-16 bg-zinc-100 rounded-2xl mx-auto mb-4 overflow-hidden shadow-inner">
                         <img v-if="selectedProduct?.image_url" :src="selectedProduct.image_url" class="w-full h-full object-cover" />
                    </div>
                    <h3 class="font-black text-xl text-zinc-800">{{ selectedProduct?.name }}</h3>
                    <p class="text-xs font-bold text-red-800 uppercase tracking-wide mt-1">Customize Your Drink</p>
                </div>

                <div class="space-y-6 max-h-[50vh] overflow-y-auto pr-2">
                    <div v-for="optionGroup in selectedProduct?.options" :key="optionGroup.name">
                        <p class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{{ optionGroup.name }}</p>
                        <div class="grid grid-cols-3 gap-2">
                            <button 
                                v-for="val in optionGroup.values" 
                                :key="val"
                                @click="currentOptions[optionGroup.name] = val"
                                class="py-2.5 px-1 rounded-xl text-[10px] font-bold uppercase tracking-wide border transition-all duration-200"
                                :class="currentOptions[optionGroup.name] === val ? 'bg-red-800 text-white border-red-800 shadow-md shadow-red-200 scale-105' : 'bg-white text-zinc-500 border-zinc-200 hover:border-red-200 hover:bg-red-50'"
                            >
                                {{ val }}
                            </button>
                        </div>
                    </div>
                </div>

                <div class="flex gap-3 mt-8 pt-4 border-t border-zinc-100">
                    <button @click="showOptionsModal = false" class="flex-1 py-3.5 rounded-xl border border-zinc-200 text-zinc-500 text-xs font-bold uppercase tracking-widest hover:bg-zinc-50 transition-colors">Cancel</button>
                    <button @click="confirmOptions" class="flex-1 py-3.5 rounded-xl bg-red-800 text-white text-xs font-bold uppercase tracking-widest hover:bg-red-900 shadow-lg shadow-red-200 transition-all active:scale-95">Add to Order</button>
                </div>
            </div>
        </div>
    </Transition>

  </div>
</template>

<style>
.no-scrollbar::-webkit-scrollbar { display: none; }
.no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
</style>