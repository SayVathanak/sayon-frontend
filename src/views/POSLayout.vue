<script setup>
import { onMounted, onUnmounted, ref, computed, reactive, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { sendToCustomer } from '../services/dualScreen';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import ReceiptTemplate from '../components/ReceiptTemplate.vue';
import {
    LogOut, Search, ShoppingBag, Plus, Minus, X,
    Coffee, Loader2, Trash2, Printer, Monitor, Settings, Check, Menu
} from 'lucide-vue-next';

const auth = useAuthStore();
const menu = useMenuStore();
const cart = useCartStore();

const [cartListRef] = useAutoAnimate();
const showMobileCart = ref(false);
const searchQuery = ref('');
const activeCategory = ref('All');

// --- STATE: Payment Mode ---
const isPaymentMode = ref(false);

// --- STATE: Settings & Print Toggle ---
const showSettingsModal = ref(false);
const enablePrint = ref(true);

// --- RECEIPT STATE ---
const lastOrder = ref(null);

// --- OPTION MODAL STATE ---
const showOptionsModal = ref(false);
const selectedProduct = ref(null);
const currentOptions = reactive({});

const now = ref(new Date());

onMounted(() => {
    menu.fetchMenu();
    // Start Timer
    const timer = setInterval(() => now.value = new Date(), 1000);
    onUnmounted(() => clearInterval(timer));
});

const formattedTime = computed(() =>
    now.value.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    })
);
const formattedDate = computed(() =>
    now.value.toLocaleDateString('en-US', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
    })
);

// --- HELPER: Image Optimization (HIGHER QUALITY) ---
function getThumbnail(url) {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        // Increased quality to w_500, q_auto:best
        return url.replace('/upload/', '/upload/w_500,h_500,c_fill,q_auto:best,f_auto/');
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

// --- DUAL SCREEN LOGIC ---
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

// --- CHECKOUT FLOW ---
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

        if (enablePrint.value) {
            await nextTick();
            setTimeout(() => {
                window.print();
            }, 100);
        }

    } catch (err) {
        alert("Error saving order: " + err.message);
    }
}
</script>

<template>
    <div
        class="flex h-screen bg-[#FAFAFA] font-sans text-zinc-800 overflow-hidden selection:bg-red-800 selection:text-white touch-action-manipulation">

        <ReceiptTemplate v-if="lastOrder" :orderId="lastOrder.id" :items="lastOrder.items" :total="lastOrder.total" />

        <aside
            class="hidden md:flex flex-col w-16 bg-white border-r border-zinc-100 h-full shrink-0 z-20 items-center py-4 gap-2">
            <div class="mb-2">
                <div class="w-10 h-10 bg-red-800 text-white flex items-center justify-center rounded-lg shadow-sm">
                    <Coffee size="20" stroke-width="2.5" />
                </div>
            </div>

            <div class="flex-1 flex flex-col gap-2 w-full px-2">
                <button @click="showSettingsModal = true"
                    class="w-full aspect-square rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-red-800 transition-all flex items-center justify-center"
                    title="Settings">
                    <Settings size="20" />
                </button>
            </div>

            <div class="mt-auto px-2 w-full">
                <button @click="handleLogout"
                    class="w-full aspect-square flex items-center justify-center rounded-lg text-zinc-300 hover:bg-red-50 hover:text-red-800 transition-colors"
                    title="Logout">
                    <LogOut size="20" />
                </button>
            </div>
        </aside>

        <main class="flex-1 flex flex-col min-w-0 h-full relative"
            :class="{ 'opacity-50 pointer-events-none grayscale': isPaymentMode }">

            <header class="flex-none bg-white z-10 border-b border-zinc-100 shadow-[0_2px_10px_rgb(0,0,0,0.03)]">
                <div class="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 md:h-16 md:px-4">

                    <!-- <div
                        class="hidden xl:flex flex-col justify-center mr-2 border-r border-zinc-100 pr-4 h-8 shrink-0 md:order-1">
                        <span class="text-sm font-black text-zinc-800 leading-none">{{ formattedTime }}</span>
                        <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-wide leading-tight">{{
                            formattedDate }}</span>
                    </div> -->

                    <div class="flex items-center gap-2 w-full md:w-auto md:shrink-0 order-1 md:order-2">
                        <button @click="openCustomerScreen"
                            class="flex items-center justify-center w-11 h-11 md:w-10 md:h-10 rounded-xl bg-zinc-50 text-zinc-500 border border-zinc-100 active:scale-95 transition-all hover:text-red-800 hover:border-red-200"
                            title="Open Customer Screen">
                            <Monitor size="20" stroke-width="2" />
                        </button>

                        <div class="relative flex-1 md:w-56 transition-all">
                            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" size="18" />
                            <input v-model="searchQuery" type="text" placeholder="Search items..."
                                class="w-full pl-10 pr-4 h-11 md:h-10 bg-zinc-50 border-none focus:bg-white focus:ring-2 focus:ring-red-800/20 rounded-xl text-sm font-medium focus:outline-none transition-all placeholder-zinc-400 text-zinc-900">
                        </div>
                    </div>

                    <div class="w-full md:flex-1 overflow-x-auto scrollbar-hide order-2 md:order-3 pb-1 md:pb-0">
                        <div class="flex items-center gap-2">
                            <button @click="activeCategory = 'All'"
                                class="px-5 h-10 md:h-9 rounded-xl text-xs font-bold transition-all border whitespace-nowrap flex items-center shadow-sm"
                                :class="activeCategory === 'All' ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'">
                                <div class="grid grid-cols-2 gap-0.5 mr-2 opacity-70">
                                    <div class="w-1 h-1 rounded-full bg-current"></div>
                                    <div class="w-1 h-1 rounded-full bg-current"></div>
                                    <div class="w-1 h-1 rounded-full bg-current"></div>
                                    <div class="w-1 h-1 rounded-full bg-current"></div>
                                </div>
                                All Items
                            </button>

                            <button v-for="cat in menu.categories" :key="cat" @click="activeCategory = cat"
                                class="px-5 h-10 md:h-9 rounded-xl text-sm font-bold transition-all border whitespace-nowrap flex items-center shadow-sm"
                                :class="activeCategory === cat ? 'bg-red-800 text-white border-red-800' : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'">
                                <Coffee v-if="cat.includes('Coffee')" size="14" class="mr-1.5 opacity-80" />
                                {{ cat }}
                            </button>
                        </div>
                    </div>

                </div>
            </header>

            <div class="flex-1 overflow-y-auto px-4 py-4 pb-32 sm:pb-4 custom-scrollbar bg-[#FAFAFA]">
                <div v-if="menu.isLoading" class="flex flex-col items-center justify-center h-64 gap-3">
                    <Loader2 class="animate-spin w-6 h-6 text-red-800" />
                    <p class="tex-xs font-bold text-zinc-400 uppercase tracking-widest">Loading...</p>
                </div>

                <div v-else-if="filteredProducts.length === 0"
                    class="flex flex-col items-center justify-center h-64 text-zinc-300">
                    <Coffee size="48" class="mb-3 opacity-20" />
                    <p class="text-xs font-bold">No items found.</p>
                </div>

                <div v-else class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    <div v-for="product in filteredProducts" :key="product.product_id"
                        @click="handleProductClick(product)"
                        class="group cursor-pointer bg-white rounded-xl p-2 shadow-sm border border-zinc-100 hover:border-red-800 hover:shadow-md transition-all duration-200 flex flex-col gap-2">
                        <div class="aspect-4/3 bg-zinc-50 rounded-lg overflow-hidden relative">
                            <img v-if="product.image_url" :src="getThumbnail(product.image_url)"
                                class="w-full h-full object-cover transition-transform duration-500" loading="lazy" />
                            <div v-else class="w-full h-full flex items-center justify-center text-zinc-200">
                                <Coffee size="24" />
                            </div>
                            <!-- <div v-if="product.options && product.options.length" class="absolute top-1.5 left-1.5 bg-black/60 backdrop-blur text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                            OPT
                        </div> -->
                        </div>

                        <div class="px-1 pb-1">
                            <h3 class="font-medium text-sm text-black leading-tight mb-1 truncate">{{ product.name }}
                            </h3>
                            <div class="flex items-center justify-between">
                                <span class="text-sm font-black text-red-800">${{ Number(product.price).toFixed(2)
                                    }}</span>
                                <div
                                    class="w-6 h-6 rounded bg-zinc-50 text-zinc-300 group-hover:bg-red-800 group-hover:text-white flex items-center justify-center transition-colors">
                                    <Plus size="14" stroke-width="3" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <aside
            class="fixed inset-y-0 right-0 w-full md:w-sm bg-white shadow-xl z-30 flex flex-col md:relative md:translate-y-0 border-l border-zinc-100 transition-transform duration-300"
            :class="showMobileCart ? 'translate-y-0' : 'translate-y-full md:translate-y-0'">
            <div class="h-14 px-5 border-b border-zinc-50 flex items-center justify-between shrink-0 bg-white">
                <img src="/logo.svg" alt="Logo" class="h-8 w-auto object-contain" />

                <div class="flex items-center gap-3">
                    <div class="flex flex-col items-end">
                        <span class="text-xs text-zinc-900 leading-none">{{ formattedTime }}</span>
                        <span class="text-[10px] text-zinc-400 tracking-wide">{{ formattedDate
                            }}</span>
                    </div>

                    <button @click="showMobileCart = false" class="md:hidden p-1 bg-zinc-50 rounded-full">
                        <X size="18" />
                    </button>
                </div>
            </div>

            <div class="px-5 py-3 bg-zinc-50/30 border-b border-zinc-50 flex justify-between items-center">
                <h2 class="text-xs font-bold text-zinc-500 uppercase tracking-wide">Current Order</h2>
                <span class="text-xs font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded-full">{{ cart.cartItems.length
                    }} Items</span>
            </div>

            <div class="flex-1 overflow-y-auto px-5 py-2" ref="cartListRef">
                <div v-if="cart.cartItems.length === 0"
                    class="h-40 flex flex-col items-center justify-center text-zinc-300 gap-2 border-2 border-dashed border-zinc-50 rounded-xl mt-4">
                    <ShoppingBag size="24" stroke-width="1.5" />
                    <p class="text-xs font-medium">Empty Cart</p>
                </div>

                <div v-for="item in cart.cartItems" :key="item.product_id"
                    class="flex items-start gap-3 py-3 border-b border-zinc-50 group"
                    :class="{ 'opacity-60 grayscale': isPaymentMode }">
                    <div class="w-10 h-10 bg-zinc-50 rounded-md shrink-0 overflow-hidden border border-zinc-100">
                        <img v-if="item.image_url" :src="getThumbnail(item.image_url)"
                            class="w-full h-full object-cover" />
                    </div>

                    <div class="flex-1 min-w-0 pt-0.5">
                        <p class="font-medium text-sm text-zinc-800 leading-snug truncate">{{ item.name }}</p>
                        <p class="tex-xs font-medium text-zinc-400">${{ item.price }}</p>
                    </div>

                    <div class="flex flex-col items-end gap-1">
                        <p class="font-black text-xs text-zinc-900">${{ (parseFloat(item.price) *
                            item.quantity).toFixed(2) }}</p>

                        <div v-if="!isPaymentMode" class="flex items-center gap-1 bg-zinc-50 rounded p-0.5">
                            <button @click="adjustQty(item, -1)"
                                class="w-8 h-6 rounded bg-white shadow-sm flex items-center justify-center text-zinc-500 hover:text-red-600 transition-colors">
                                <Minus size="12" v-if="item.quantity > 1" />
                                <Trash2 size="12" class="text-red-500" v-else />
                            </button>

                            <span class="text-xs font-bold w-8 text-center">{{ item.quantity }}</span>

                            <button @click="adjustQty(item, 1)"
                                class="w-8 h-6 rounded bg-white shadow-sm flex items-center justify-center text-zinc-500 hover:text-blue-600 transition-colors">
                                <Plus size="12" />
                            </button>
                        </div>
                        <span v-else class="tex-xs font-bold text-zinc-500 bg-zinc-100 px-1.5 rounded">x{{
                            item.quantity }}</span>
                    </div>
                </div>
            </div>

            <div class="p-5 bg-white z-10 border-t border-zinc-100 shadow-[0_-4px_20px_rgb(0,0,0,0.02)]">

                <div v-if="!isPaymentMode" class="space-y-4">
                    <div class="flex justify-between items-end">
                        <span class="text-xs text-zinc-400 font-bold uppercase">Total</span>
                        <span class="text-xl font-black text-zinc-900">${{ cart.totalPrice }}</span>
                    </div>

                    <button @click="handleCheckoutStart" :disabled="cart.cartItems.length === 0"
                        class="w-full bg-red-800 text-white h-12 rounded-lg text-sm font-bold shadow-lg shadow-red-900/10 hover:bg-red-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] uppercase tracking-wide">
                        Check out
                    </button>
                </div>

                <div v-else class="space-y-3">
                    <div class="bg-red-50 p-4 rounded-lg flex items-center justify-between border border-red-100">
                        <div>
                            <p class="tex-xs font-bold uppercase text-red-800 tracking-wider">Payable</p>
                            <p class="text-2xl font-black text-zinc-900">${{ cart.totalPrice }}</p>
                        </div>
                        <Loader2 class="animate-spin text-red-800" size="18" />
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button @click="handleUpdateOrder"
                            class="py-3 rounded-lg font-bold text-xs uppercase border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">Modify</button>
                        <button @click="handlePaymentSuccess"
                            class="py-3 bg-green-600 text-white rounded-lg font-bold text-xs uppercase shadow-md hover:bg-green-700 transition-all active:scale-[0.98]">
                            Confirm
                        </button>
                    </div>
                </div>
            </div>
        </aside>

        <div v-if="!showMobileCart && cart.cartItems.length > 0"
            class="md:hidden fixed bottom-0 left-0 right-0 p-4 z-40 bg-white/80 backdrop-blur-md border-t border-zinc-200">
            <button @click="showMobileCart = true"
                class="w-full bg-zinc-900 text-white h-14 rounded-2xl flex items-center justify-between px-5 shadow-xl shadow-zinc-900/20 active:scale-[0.98] transition-transform">
                <div class="flex items-center gap-3">
                    <div class="bg-white/20 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold">
                        {{ cart.cartItems.length }}
                    </div>
                    <div class="flex flex-col items-start">
                        <span class="text-xs font-medium text-zinc-300">Total</span>
                        <span class="text-sm font-bold leading-none">View Order</span>
                    </div>
                </div>
                <span class="font-black text-xl">${{ cart.totalPrice }}</span>
            </button>
        </div>

        <div v-if="showOptionsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
                @click="showOptionsModal = false"></div>
            <div
                class="relative w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-200">
                <div class="flex items-start gap-3 mb-5">
                    <div class="w-16 h-16 bg-zinc-50 rounded-lg overflow-hidden shrink-0"><img
                            v-if="selectedProduct?.image_url" :src="getThumbnail(selectedProduct.image_url)"
                            class="w-full h-full object-cover" /></div>
                    <div>
                        <h3 class="font-black text-lg text-zinc-900 leading-tight">{{ selectedProduct?.name }}</h3>
                        <p class="text-sm font-bold text-red-800 mt-0.5">${{ selectedProduct?.price }}</p>
                    </div>
                </div>
                <div class="space-y-4 mb-6">
                    <div v-for="optionGroup in selectedProduct?.options" :key="optionGroup.name">
                        <p class="tex-xs font-bold uppercase text-zinc-400 mb-2">{{ optionGroup.name }}</p>
                        <div class="flex flex-wrap gap-2">
                            <button v-for="val in optionGroup.values" :key="val"
                                @click="currentOptions[optionGroup.name] = val"
                                class="px-3 py-1.5 rounded-md text-xs font-bold transition-all border"
                                :class="currentOptions[optionGroup.name] === val ? 'bg-red-800 text-white border-red-800' : 'bg-white text-zinc-500 border-zinc-200 hover:border-red-200'">{{
                                    val }}</button>
                        </div>
                    </div>
                </div>
                <button @click="confirmOptions"
                    class="w-full py-3 rounded-lg bg-red-800 text-white text-sm font-bold uppercase hover:bg-red-900 shadow-md transition-all">Add
                    to Cart</button>
            </div>
        </div>

        <div v-if="showSettingsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
                @click="showSettingsModal = false"></div>
            <div
                class="relative w-full max-w-xs bg-white rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
                <div class="flex items-center justify-between mb-5">
                    <h3 class="font-bold text-lg text-zinc-900 flex items-center gap-2">Settings</h3>
                    <button @click="showSettingsModal = false" class="p-1.5 bg-zinc-50 rounded-full hover:bg-zinc-100">
                        <X size="16" class="text-zinc-500" />
                    </button>
                </div>
                <div class="space-y-3">
                    <div @click="enablePrint = !enablePrint"
                        class="flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all select-none"
                        :class="enablePrint ? 'border-red-200 bg-red-50/50' : 'border-zinc-100 hover:bg-zinc-50'">
                        <div class="flex items-center gap-3">
                            <div class="p-2 rounded-lg"
                                :class="enablePrint ? 'bg-red-800 text-white' : 'bg-zinc-100 text-zinc-400'">
                                <Printer size="18" />
                            </div>
                            <span class="text-sm font-bold text-zinc-900">Auto-Print</span>
                        </div>
                        <div class="w-10 h-6 rounded-full relative transition-colors duration-200"
                            :class="enablePrint ? 'bg-red-800' : 'bg-zinc-200'">
                            <div class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm"
                                :class="enablePrint ? 'translate-x-4' : 'translate-x-0'"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<style>
.touch-action-manipulation {
    touch-action: manipulation;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #e2e8f0;
    border-radius: 20px;
}

.scrollbar-hide::-webkit-scrollbar {
    display: none;
}

.scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
}
</style>