<script setup>
import { onMounted, ref, computed, reactive, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { sendToCustomer } from '../services/dualScreen';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import ReceiptTemplate from '../components/ReceiptTemplate.vue'; 
import { 
    LogOut, Search, ShoppingBag, Plus, Minus, X, 
    Coffee, Loader2, Monitor, LayoutGrid 
} from 'lucide-vue-next';

const auth = useAuthStore();
const menu = useMenuStore();
const cart = useCartStore();

const [cartListRef] = useAutoAnimate(); 
const showMobileCart = ref(false); 
const searchQuery = ref('');
const activeCategory = ref('All');
const isPaymentMode = ref(false);
const lastOrder = ref(null);
const showOptionsModal = ref(false);
const selectedProduct = ref(null);
const currentOptions = reactive({}); 

onMounted(() => {
    menu.fetchMenu();
});

function getThumbnail(url) {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/w_300,h_400,c_fill,q_auto,f_auto/');
    }
    return url;
}

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

// --- DUAL SCREEN & CART LOGIC ---
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

function handleCheckoutStart() {
    if (cart.cartItems.length === 0) return;
    isPaymentMode.value = true;
    sendToCustomer('SHOW_PAYMENT', { total: cart.totalPrice });
}

function handleUpdateOrder() {
    isPaymentMode.value = false;
    sendToCustomer('UPDATE_CART', { items: JSON.parse(JSON.stringify(cart.cartItems)), total: cart.totalPrice });
}

async function handlePaymentSuccess() {
    try {
        lastOrder.value = {
            id: Math.floor(Math.random() * 90000) + 10000, 
            items: JSON.parse(JSON.stringify(cart.cartItems)),
            total: cart.totalPrice
        };
        await cart.submitOrder();
        sendToCustomer('PAYMENT_SUCCESS', {});
        isPaymentMode.value = false;
        await nextTick(); 
        setTimeout(() => window.print(), 100);
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

    <aside class="hidden md:flex flex-col w-20 bg-white border-r border-slate-100 h-full shrink-0 z-20 items-center py-6">
        <div class="w-12 h-12 bg-blue-600 text-white flex items-center justify-center rounded-xl shadow-lg shadow-blue-200 mb-6">
            <span class="font-black text-xl">S</span>
        </div>
        
        <div class="flex-1"></div> <button @click="handleLogout" class="w-12 h-12 flex items-center justify-center rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Log Out">
            <LogOut size="24" />
        </button>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full relative" :class="{'opacity-50 pointer-events-none grayscale': isPaymentMode}">
        
        <header class="shrink-0 bg-white border-b border-slate-100 flex flex-col">
            <div class="h-16 px-6 flex items-center justify-between">
                <div class="flex items-center gap-4">
                     <h2 class="text-xl font-bold text-slate-900 hidden md:block">Menu</h2>
                     <button @click="openCustomerScreen" class="flex items-center gap-2 px-3 py-2 text-slate-500 hover:text-blue-600 bg-slate-50 rounded-xl text-xs font-bold transition-all">
                        <Monitor size="16"/> <span class="hidden lg:inline">Customer Screen</span>
                    </button>
                </div>

                <div class="relative w-full max-w-md group">
                    <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size="18" />
                    <input 
                        v-model="searchQuery" 
                        type="text" 
                        placeholder="Search items..." 
                        class="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-transparent focus:border-blue-100 rounded-xl text-sm font-medium focus:ring-4 focus:ring-blue-50 focus:outline-none transition-all placeholder-slate-400" 
                        :disabled="isPaymentMode"
                    >
                </div>
            </div>

            <div class="flex items-center gap-2 px-6 pb-4 overflow-x-auto scrollbar-hide">
                <button 
                    @click="activeCategory = 'All'"
                    class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border"
                    :class="activeCategory === 'All' ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'"
                >
                    <LayoutGrid size="16" />
                    All Items
                </button>
                
                <button 
                    v-for="cat in menu.categories" 
                    :key="cat"
                    @click="activeCategory = cat"
                    class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border"
                    :class="activeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'"
                >
                    <Coffee size="16" />
                    {{ cat }}
                </button>
            </div>
        </header>

        <div class="flex-1 overflow-y-auto p-6 pb-32 sm:pb-6 custom-scrollbar bg-[#F8F9FD]">
            <div v-if="menu.isLoading" class="flex flex-col items-center justify-center h-64 gap-4">
                <Loader2 class="animate-spin w-8 h-8 text-blue-600" />
                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading Menu...</p>
            </div>

            <div v-else-if="filteredProducts.length === 0" class="flex flex-col items-center justify-center h-64 text-slate-300">
                <Coffee size="64" class="mb-4 opacity-20"/>
                <p class="text-sm font-bold text-slate-400">No items found.</p>
            </div>

            <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <div 
                    v-for="product in filteredProducts" 
                    :key="product.product_id" 
                    @click="handleProductClick(product)" 
                    class="group cursor-pointer bg-white rounded-2xl p-3 shadow-sm hover:shadow-xl hover:-translate-y-1 border border-transparent hover:border-blue-100 transition-all duration-300 flex flex-col relative"
                >
                    <div class="aspect-square bg-slate-50 rounded-xl mb-3 relative overflow-hidden">
                        <img v-if="product.image_url" :src="getThumbnail(product.image_url)" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div v-else class="w-full h-full flex items-center justify-center text-slate-200">
                            <Coffee size="32" />
                        </div>
                        <div v-if="product.options && product.options.length" class="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                            Options
                        </div>
                    </div>
                    
                    <div class="flex-1 flex flex-col justify-between">
                        <h3 class="font-bold text-sm text-slate-800 leading-tight mb-1 line-clamp-2">{{ product.name }}</h3>
                        <div class="flex items-center justify-between mt-2">
                            <span class="text-base font-black text-blue-600">${{ Number(product.price).toFixed(2) }}</span>
                            <div class="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
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
        <div class="p-6 pb-2 shrink-0 flex items-center justify-between border-b border-slate-50 h-16">
            <h2 class="text-lg font-bold text-slate-900">Current Order</h2>
             <button @click="showMobileCart = false" class="md:hidden p-2 bg-slate-100 rounded-full"><X size="18"/></button>
        </div>

        <div class="flex-1 overflow-y-auto p-4 space-y-3" ref="cartListRef">
            <div v-if="cart.cartItems.length === 0" class="h-full flex flex-col items-center justify-center text-slate-300 gap-4 opacity-60">
                <ShoppingBag size="48" stroke-width="1.5"/>
                <p class="text-sm font-medium">Cart is empty</p>
            </div>

            <div 
                v-for="item in cart.cartItems" 
                :key="item.product_id" 
                class="flex gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors group relative"
                :class="{'opacity-50 grayscale': isPaymentMode}"
            >
                <div class="w-14 h-14 bg-slate-100 rounded-lg shrink-0 overflow-hidden">
                    <img v-if="item.image_url" :src="getThumbnail(item.image_url)" class="w-full h-full object-cover" />
                </div>
                <div class="flex-1 min-w-0 flex flex-col justify-center">
                    <p class="font-bold text-sm text-slate-800 truncate">{{ item.name }}</p>
                    <p class="text-xs text-slate-500 font-medium">${{ item.price }} x {{ item.quantity }}</p>
                </div>
                <div class="flex flex-col items-end justify-center gap-1">
                     <p class="font-bold text-sm text-slate-900">${{ (parseFloat(item.price) * item.quantity).toFixed(2) }}</p>
                     <div v-if="!isPaymentMode" class="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-1 shadow-sm">
                        <button @click="adjustQty(item, -1)" class="p-1 hover:text-red-500"><Minus size="12"/></button>
                        <button @click="adjustQty(item, 1)" class="p-1 hover:text-blue-600"><Plus size="12"/></button>
                     </div>
                </div>
            </div>
        </div>

        <div class="p-6 bg-slate-50 border-t border-slate-200 z-10">
            <div v-if="!isPaymentMode" class="space-y-4">
                <div class="flex justify-between text-xl font-black text-slate-900">
                    <span>Total</span>
                    <span>${{ cart.totalPrice }}</span>
                </div>
                
                <button
                    @click="handleCheckoutStart"
                    :disabled="cart.cartItems.length === 0"
                    class="w-full bg-slate-900 text-white h-14 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl active:scale-[0.98]"
                >
                    Charge ${{ cart.totalPrice }}
                </button>
            </div>

            <div v-else class="space-y-3">
                <div class="bg-blue-600 text-white p-4 rounded-xl flex items-center justify-between shadow-lg shadow-blue-200">
                    <div>
                        <p class="text-[10px] font-bold uppercase opacity-80">Total Payable</p>
                        <p class="text-2xl font-black">${{ cart.totalPrice }}</p>
                    </div>
                    <Loader2 class="animate-spin" size="24"/>
                </div>
                <div class="grid grid-cols-2 gap-3">
                    <button @click="handleUpdateOrder" class="py-3 rounded-xl font-bold text-xs uppercase border border-slate-300 hover:bg-white transition-colors">Back</button>
                    <button @click="handlePaymentSuccess" class="py-3 bg-green-500 text-white rounded-xl font-bold text-xs uppercase shadow-lg shadow-green-200 hover:bg-green-600 transition-colors">Confirm Paid</button>
                </div>
            </div>
        </div>
    </aside>

    <div v-if="!showMobileCart" @click="showMobileCart = true" class="md:hidden fixed bottom-6 left-6 right-6 bg-slate-900 text-white p-4 rounded-full z-40 flex justify-between items-center shadow-xl">
        <span class="font-bold text-sm">{{ cart.cartItems.length }} Items</span>
        <span class="font-bold text-lg">${{ cart.totalPrice }}</span>
    </div>

    <div v-if="showOptionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" @click="showOptionsModal = false"></div>
        <div class="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 class="font-black text-xl text-slate-900 mb-1">{{ selectedProduct?.name }}</h3>
            <p class="text-sm font-bold text-blue-600 mb-6">${{ selectedProduct?.price }}</p>
            
            <div class="space-y-6 mb-8 max-h-[60vh] overflow-y-auto">
                <div v-for="optionGroup in selectedProduct?.options" :key="optionGroup.name">
                    <p class="text-xs font-bold uppercase text-slate-400 mb-2">{{ optionGroup.name }}</p>
                    <div class="flex flex-wrap gap-2">
                        <button v-for="val in optionGroup.values" :key="val" @click="currentOptions[optionGroup.name] = val" class="px-4 py-2 rounded-lg text-xs font-bold transition-all border" :class="currentOptions[optionGroup.name] === val ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-500 border-slate-200'">{{ val }}</button>
                    </div>
                </div>
            </div>
            <button @click="confirmOptions" class="w-full py-4 rounded-xl bg-slate-900 text-white text-sm font-bold uppercase hover:bg-black transition-all">Add to Cart</button>
        </div>
    </div>
  </div>
</template>

<style>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>