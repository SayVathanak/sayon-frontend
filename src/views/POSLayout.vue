<script setup>
import { onMounted, ref, computed, reactive, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { sendToCustomer } from '../services/dualScreen';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import ReceiptTemplate from '@/components/ReceiptTemplate.vue';
import { 
    LogOut, Search, ShoppingBag, Plus, Minus, Trash2, 
    Coffee, X, CreditCard, Loader2, ExternalLink, RefreshCcw, Check, 
    ChevronRight, SlidersHorizontal, LayoutGrid, Tag, Settings, Menu, Monitor
} from 'lucide-vue-next';

const auth = useAuthStore();
const menu = useMenuStore();
const cart = useCartStore();

const [cartListRef] = useAutoAnimate(); 
const showMobileCart = ref(false); 
const searchQuery = ref('');
const activeCategory = ref('All');
const isPaymentMode = ref(false);

// --- RECEIPT STATE ---
const showReceipt = ref(false);
const lastOrder = ref(null);

// --- OPTION MODAL STATE ---
const showOptionsModal = ref(false);
const selectedProduct = ref(null);
const currentOptions = reactive({}); 

onMounted(() => {
    menu.fetchMenu();
});

// --- HELPER: Image Optimization ---
function getThumbnail(url) {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/w_300,h_400,c_fill,q_auto,f_auto/');
    }
    return url;
}

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
    // 👈 ADDED: Function to open the dual screen
    window.open('/customer', 'CustomerDisplay', 'width=1000,height=800,menubar=no,toolbar=no');
}

// --- ACTIONS ---
function handleLogout() { auth.logout(); }

function handleProductClick(product) {
    if (isPaymentMode.value) return;

    if (product.options && product.options.length > 0) {
        selectedProduct.value = product;
        Object.keys(currentOptions).forEach(key => delete currentOptions[key]);
        product.options.forEach(opt => {
            if (opt.values.length > 0) currentOptions[opt.name] = opt.values[0]; 
        });
        showOptionsModal.value = true;
    } else {
        cart.addItem(product);
    }
}

function confirmOptions() {
    if (!selectedProduct.value) return;
    const optionsText = Object.entries(currentOptions).map(([key, val]) => `${val}`).join(', ');
    const productToAdd = {
        ...selectedProduct.value,
        product_id: `${selectedProduct.value.product_id}-${Date.now()}-${optionsText}`,
        original_id: selectedProduct.value.product_id,
        name: `${selectedProduct.value.name} (${optionsText})`,
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
        // 1. Prepare Receipt Data
        lastOrder.value = {
            id: Math.floor(Math.random() * 90000) + 10000, 
            items: JSON.parse(JSON.stringify(cart.cartItems)),
            total: cart.totalPrice
        };

        // 2. Submit to DB
        await cart.submitOrder();
        
        // 3. Notify Customer Screen
        sendToCustomer('PAYMENT_SUCCESS', {});
        
        // 4. Switch mode
        isPaymentMode.value = false;
        
        // 💡 THE FIX: Wait for Vue to render the ReceiptTemplate
        await nextTick(); 
        
        // 💡 EXTRA SAFETY: Wait a tiny bit more for the browser layout
        setTimeout(() => {
            window.print();
        }, 100);

    } catch (err) { 
        alert("Error saving order: " + err.message); 
    }
}
</script>

<template>
  <div class="flex h-screen bg-[#F8F9FD] font-sans text-slate-800 overflow-hidden selection:bg-blue-100 selection:text-blue-900 touch-action-manipulation">
    
    <ReceiptTemplate 
        v-if="lastOrder"
        :orderId="lastOrder.id" 
        :items="lastOrder.items" 
        :total="lastOrder.total" 
    />

    <aside class="hidden md:flex flex-col w-24 lg:w-64 bg-white border-r border-slate-100 h-full shrink-0 z-20">
        <div class="h-20 flex items-center justify-center lg:justify-start lg:px-8 border-b border-slate-50">
            <div class="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded-xl shadow-lg shadow-blue-200">
                <span class="font-black text-lg">S</span>
            </div>
            <h1 class="hidden lg:block ml-3 font-bold text-xl tracking-tight text-slate-900">Sayon</h1>
        </div>

        <div class="flex-1 overflow-y-auto py-6 px-3 space-y-1">
            <p class="hidden lg:block px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Menu</p>
            
            <button 
                @click="activeCategory = 'All'"
                class="w-full flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all group relative"
                :class="activeCategory === 'All' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'"
            >
                <LayoutGrid size="20" :class="activeCategory === 'All' ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'"/> 
                <span class="hidden lg:block text-sm font-bold">All Items</span>
                <div v-if="activeCategory === 'All'" class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full"></div>
            </button>

            <button 
                v-for="cat in menu.categories" 
                :key="cat"
                @click="activeCategory = cat"
                class="w-full flex items-center gap-3 px-3 lg:px-4 py-3 rounded-xl transition-all group relative"
                :class="activeCategory === cat ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'"
            >
                <Coffee size="20" :class="activeCategory === cat ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'"/>
                <span class="hidden lg:block text-sm font-bold truncate">{{ cat }}</span>
                <div v-if="activeCategory === cat" class="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-600 rounded-l-full"></div>
            </button>
        </div>

        <div class="p-4 border-t border-slate-50">
             <button @click="handleLogout" class="w-full flex items-center justify-center lg:justify-start gap-3 p-3 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors">
                <LogOut size="20" />
                <span class="hidden lg:block text-sm font-bold">Log Out</span>
            </button>
        </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full relative" :class="{'opacity-50 pointer-events-none grayscale': isPaymentMode}">
        
        <header class="h-20 px-6 flex items-center justify-between shrink-0 bg-white md:bg-transparent border-b md:border-none border-slate-100">
            <div class="flex flex-col">
                <h2 class="text-xl font-bold text-slate-900">{{ activeCategory === 'All' ? 'Menu' : activeCategory }}</h2>
                <p class="text-xs text-slate-400 font-medium hidden md:block">{{ filteredProducts.length }} items available</p>
            </div>
            
            <div class="flex items-center gap-3">
                <button @click="openCustomerScreen" class="md:hidden p-2 text-slate-400 hover:text-blue-600 bg-white rounded-xl shadow-sm border border-slate-100">
                    <Monitor size="20"/>
                </button>
                <button @click="openCustomerScreen" class="hidden md:flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-blue-600 bg-white rounded-xl text-xs font-bold shadow-sm border border-slate-100 transition-all">
                    <Monitor size="16"/> Customer Screen
                </button>

                <div class="relative w-40 md:w-80 group">
                    <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size="18" />
                    <input 
                        v-model="searchQuery" 
                        type="text" 
                        placeholder="Search..." 
                        class="w-full pl-11 pr-4 py-3 bg-white border border-transparent focus:border-blue-100 rounded-2xl text-sm font-medium shadow-sm focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder-slate-400" 
                        :disabled="isPaymentMode"
                    >
                </div>
            </div>
        </header>

        <div class="md:hidden flex gap-2 overflow-x-auto px-6 py-2 scrollbar-hide shrink-0">
             <button 
                @click="activeCategory = 'All'"
                class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border"
                :class="activeCategory === 'All' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-100'"
            >
                All Items
            </button>
            <button 
                v-for="cat in menu.categories" 
                :key="cat"
                @click="activeCategory = cat"
                class="px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border"
                :class="activeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-slate-500 border-slate-100'"
            >
                {{ cat }}
            </button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 pt-2 md:pt-0 pb-32 sm:pb-6 custom-scrollbar">
            <div v-if="menu.isLoading" class="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 class="animate-spin w-8 h-8 text-blue-600" />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Menu...</p>
            </div>

            <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-slate-300">
                <Coffee size="64" class="mb-4 opacity-20"/>
                <p class="text-sm font-bold text-slate-400">No items found.</p>
            </div>

            <div v-else class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
                <div 
                    v-for="product in filteredProducts" 
                    :key="product.product_id" 
                    @click="handleProductClick(product)" 
                    class="group cursor-pointer bg-white rounded-3xl p-3 shadow-[0_2px_10px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-transparent hover:border-blue-100 transition-all duration-300 flex flex-col relative"
                >
                    <div class="aspect-3/4 bg-slate-50 rounded-2xl mb-3 relative overflow-hidden">
                        <img v-if="product.image_url" :src="getThumbnail(product.image_url)" class="w-full h-full object-cover transition-transform duration-500" />
                        <div v-else class="w-full h-full flex items-center justify-center text-slate-200">
                            <Coffee size="32" />
                        </div>
                        
                        <div v-if="product.options && product.options.length" class="absolute top-2 left-2 bg-white/90 backdrop-blur text-slate-800 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm">
                            Customizable
                        </div>
                    </div>
                    
                    <div class="flex-1 flex flex-col justify-between px-1">
                        <div>
                            <h3 class="font-bold text-xs text-slate-800 leading-tight">{{ product.name }}</h3>
                        </div>
                        <div class="mt-1 flex items-center justify-between">
                            <span class="text-base font-black text-blue-600">${{ Number(product.price).toFixed(2) }}</span>
                            <div class="w-8 h-8 rounded-full bg-slate-50 group-hover:bg-blue-600 group-hover:text-white flex items-center justify-center text-slate-300 transition-all shadow-sm">
                                <Plus size="16" stroke-width="3" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </main>

    <aside 
        class="fixed inset-y-0 right-0 w-full md:w-[380px] bg-white shadow-2xl z-30 flex flex-col md:relative md:translate-y-0 border-l border-slate-100 transition-transform duration-300" 
        :class="showMobileCart ? 'translate-y-0' : 'translate-y-full md:translate-y-0'"
    >
        <div class="p-6 pb-2 shrink-0 flex items-center justify-between">
            <div>
                <h2 class="text-xl font-bold text-slate-900 tracking-tight">Order Details</h2>
                <p class="text-xs text-slate-400 font-medium mt-0.5">Order #{{ Math.floor(Math.random() * 900) + 100 }}</p>
            </div>
             <button @click="showMobileCart = false" class="md:hidden p-2 bg-slate-100 rounded-full"><X size="18"/></button>
        </div>

        <div class="flex-1 overflow-y-auto p-6 space-y-4" ref="cartListRef">
            <div v-if="cart.cartItems.length === 0" class="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-60">
                <ShoppingBag size="48" stroke-width="1.5"/>
                <p class="text-sm font-medium">Cart is empty</p>
            </div>

            <div 
                v-for="item in cart.cartItems" 
                :key="item.product_id" 
                class="flex gap-4 group"
                :class="{'opacity-50 grayscale': isPaymentMode}"
            >
                <div class="w-16 h-16 bg-slate-50 rounded-xl shrink-0 overflow-hidden">
                        <img v-if="item.image_url" :src="getThumbnail(item.image_url)" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-between py-1">
                    <div class="flex justify-between items-start">
                        <p class="font-bold text-sm text-slate-800 truncate pr-2">{{ item.name }}</p>
                        <p class="font-bold text-sm text-slate-900">${{ (parseFloat(item.price) * item.quantity).toFixed(2) }}</p>
                    </div>
                    
                    <div class="flex items-center justify-between">
                        <p class="text-[10px] text-slate-400 font-bold uppercase">${{ item.price }}</p>
                        
                        <div v-if="!isPaymentMode" class="flex items-center gap-3">
                            <button @click="adjustQty(item, -1)" class="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-red-500 hover:text-red-500 transition-colors"><Minus size="12"/></button>
                            <span class="text-xs font-bold w-3 text-center">{{ item.quantity }}</span>
                            <button @click="adjustQty(item, 1)" class="w-6 h-6 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:border-blue-600 hover:text-blue-600 transition-colors"><Plus size="12"/></button>
                        </div>
                        <span v-else class="text-xs font-bold text-slate-500">x{{ item.quantity }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div class="p-6 bg-white border-t border-slate-100 z-10">
            <div v-if="!isPaymentMode" class="space-y-4">
                <div class="space-y-2 mb-6">
                    <div class="flex justify-between text-sm text-slate-500"><span>Subtotal</span><span>${{ cart.totalPrice }}</span></div>
                    <div class="flex justify-between text-sm text-slate-500"><span>Tax (0%)</span><span>$0.00</span></div>
                    <div class="flex justify-between text-lg font-black text-slate-900 pt-2 border-t border-slate-50 border-dashed mt-2">
                        <span>Total</span>
                        <span>${{ cart.totalPrice }}</span>
                    </div>
                </div>
                
                <button
                    @click="handleCheckoutStart"
                    :disabled="cart.cartItems.length === 0"
                    class="w-full bg-blue-600 text-white h-14 rounded-2xl text-sm font-bold uppercase tracking-wide hover:bg-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-blue-200 active:scale-[0.98]"
                >
                    Place Order
                </button>
            </div>

            <div v-else class="space-y-4">
                <div class="bg-blue-50 p-4 rounded-2xl flex items-center justify-between border border-blue-100">
                    <div>
                        <p class="text-xs font-bold uppercase text-blue-700">Total Payable</p>
                        <p class="text-2xl font-black text-slate-900">${{ cart.totalPrice }}</p>
                    </div>
                    <Loader2 class="animate-spin text-blue-600" size="24"/>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button @click="handleUpdateOrder" class="py-4 rounded-2xl font-bold text-xs uppercase border border-slate-200 hover:bg-slate-50 transition-colors">Modify</button>
                    <button @click="handlePaymentSuccess" class="py-4 bg-green-500 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-green-200 hover:bg-green-600 transition-colors">Confirm Paid</button>
                </div>
            </div>
        </div>
    </aside>

    <div v-if="!showMobileCart" @click="showMobileCart = true" class="md:hidden fixed bottom-6 left-6 right-6 bg-blue-600 text-white p-4 rounded-full z-40 flex justify-between items-center shadow-xl shadow-blue-900/20">
        <span class="font-bold text-sm">{{ cart.cartItems.length }} Items</span>
        <span class="font-bold text-lg">${{ cart.totalPrice }}</span>
    </div>

    <div v-if="showOptionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="showOptionsModal = false"></div>
        <div class="relative w-full max-w-sm bg-white rounded-4xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div class="flex items-start gap-4 mb-6">
                <div class="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden shrink-0"><img v-if="selectedProduct?.image_url" :src="getThumbnail(selectedProduct.image_url)" class="w-full h-full object-cover" /></div>
                <div>
                    <h3 class="font-black text-xl text-slate-900">{{ selectedProduct?.name }}</h3>
                    <p class="text-sm font-bold text-blue-600 mt-1">${{ selectedProduct?.price }}</p>
                </div>
            </div>
            <div class="space-y-6 mb-8">
                <div v-for="optionGroup in selectedProduct?.options" :key="optionGroup.name">
                    <p class="text-xs font-bold uppercase text-slate-400 mb-3">{{ optionGroup.name }}</p>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="val in optionGroup.values" :key="val" @click="currentOptions[optionGroup.name] = val" class="px-4 py-2 rounded-xl text-xs font-bold transition-all border" :class="currentOptions[optionGroup.name] === val ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300'">{{ val }}</button>
                    </div>
                </div>
            </div>
            <button @click="confirmOptions" class="w-full py-4 rounded-2xl bg-blue-600 text-white text-sm font-bold uppercase hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all">Add to Cart</button>
        </div>
    </div>
  </div>
</template>

<style>
/* 💡 ADDED: Disables double-tap zoom on buttons and inputs
   This makes the app feel native on mobile
*/
.touch-action-manipulation {
    touch-action: manipulation;
}

/* Clean scrollbar for modern browsers */
.custom-scrollbar::-webkit-scrollbar { width: 6px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background-color: #e2e8f0; border-radius: 20px; }

/* Hide scrollbar for category list */
.scrollbar-hide::-webkit-scrollbar {
    display: none;
}
.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>