<script setup>
import { onMounted, onUnmounted, ref, computed, reactive, watch, nextTick } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useMenuStore } from '../stores/menu';
import { useCartStore } from '../stores/cart';
import { sendToCustomer } from '../services/dualScreen';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import { useRouter } from 'vue-router'; 
import ReceiptTemplate from '../components/ReceiptTemplate.vue';
import {
    LogOut, Search, ShoppingBag, Plus, Minus, X,
    Coffee, Loader2, Printer, Monitor, Settings, Check,
    User, Menu, LayoutDashboard 
} from 'lucide-vue-next';

// --- STORES ---
const auth = useAuthStore();
const menu = useMenuStore();
const cart = useCartStore();
const router = useRouter(); 

// --- REFS & STATE ---
const [cartListRef] = useAutoAnimate();
const showMobileCart = ref(false);
const showMobileMenu = ref(false); // NEW: Controls Left Sidebar on Mobile
const searchQuery = ref('');
const activeCategory = ref('All');
const isPaymentMode = ref(false);
const showSettingsModal = ref(false);
const enablePrint = ref(false);
const lastOrder = ref(null);
const now = ref(new Date());

// --- LIFECYCLE ---
onMounted(() => {
    menu.fetchMenu();
    const timer = setInterval(() => now.value = new Date(), 1000);
    onUnmounted(() => clearInterval(timer));
});

// --- COMPUTED ---
const formattedTime = computed(() =>
    now.value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
);

// --- HELPER: Image Optimization ---
function getThumbnail(url) {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/w_500,h_500,c_fill,q_auto:best,f_auto/');
    }
    return url;
}

// --- FILTER LOGIC ---
const filteredProducts = computed(() => {
    let products = [];
    if (menu.menuData) {
        if (activeCategory.value === 'All') {
            Object.values(menu.menuData).forEach(items => { if (Array.isArray(items)) products.push(...items); });
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

// --- NEW STATE: Tracks the last selected sugar level for each product ID
const lastSelectedSugar = reactive({});

// --- WRAPPER ACTION: Updates state and calls original handler
function handleProductClickWrapper(product, sugarLevel) {
    lastSelectedSugar[product.product_id] = sugarLevel;
    const finalSugar = sugarLevel === 'Default' ? null : sugarLevel;
    handleProductClick(product, finalSugar);
}

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
    showMobileMenu.value = false; // Close menu on mobile click
}

// --- ACTIONS ---
function handleLogout() { 
    auth.logout(); 
    showMobileMenu.value = false;
}

function goToAdmin() {
    router.push({ name: 'admin-dashboard' });
    showMobileMenu.value = false;
}

function handleProductClick(product, sugarLevel = null) {
    if (isPaymentMode.value) return;

    let optionsText = '';

    if (sugarLevel) {
        optionsText = sugarLevel;
    }
    else if (product.options && product.options.length > 0) {
        optionsText = product.options.map(opt => opt.values[0]).join(', ');
    }

    const uniqueId = optionsText
        ? `${product.product_id}-${optionsText}`
        : `${product.product_id}`;

    const productToAdd = {
        ...product,
        product_id: uniqueId,
        original_id: product.product_id,
        name: optionsText ? `${product.name} (${optionsText})` : product.name,
        price: product.price,
        image_url: product.image_url,
        category_name: product.category_name
    };

    cart.addItem(productToAdd);
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
            total: cart.totalPrice,
        };
        await cart.submitOrder();
        sendToCustomer('PAYMENT_SUCCESS', {});
        isPaymentMode.value = false;

        if (enablePrint.value) {
            await nextTick();
            setTimeout(() => { window.print(); }, 100);
        }
    } catch (err) {
        alert("Error saving order: " + err.message);
    }
}
</script>

<template>
    <div
        class="flex h-screen bg-[#F8F8F8] font-montserrat text-[#000000] overflow-hidden selection:bg-[#AA2B1D] selection:text-white">

        <ReceiptTemplate v-if="lastOrder" :orderId="lastOrder.id" :items="lastOrder.items" :total="lastOrder.total" />

        <div v-if="showMobileMenu" @click="showMobileMenu = false"
             class="fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity">
        </div>

        <aside 
            class="fixed inset-y-0 left-0 z-50 flex flex-col w-16 bg-[#000000] h-full shrink-0 
                   items-center py-6 gap-6 rounded-r-3xl transition-transform duration-300
                   md:relative md:translate-x-0"
            :class="showMobileMenu ? 'translate-x-0' : '-translate-x-full'">
            
            <button @click="showMobileMenu = !showMobileMenu" 
                class="w-10 h-10 text-gray-400 flex items-center justify-center rounded-xl mb-4 hover:text-white transition-colors">
                <X v-if="showMobileMenu" size="20" class="md:hidden" />
                <Menu v-else size="20" stroke-width="2.5" />
            </button>

            <div class="mt-auto pb-4 flex flex-col items-center gap-6">

                <button v-if="auth.user?.role === 'admin'" @click="goToAdmin" 
                    title="Go to Admin Dashboard"
                    class="flex items-center justify-center text-gray-400 hover:text-white transition-colors cursor-pointer mb-6 border-b border-gray-800 pb-6">
                    <LayoutDashboard size="20" />
                </button>

                <button @click="openCustomerScreen" class="w-10 h-10 rounded-xl flex items-center justify-center
             text-gray-400 hover:text-white transition-colors cursor-pointer" title="Open Customer View">
                    <Monitor size="20" />
                </button>

                <button @click="() => { showSettingsModal = true; showMobileMenu = false; }" 
                    class="w-10 h-10 rounded-xl flex items-center justify-center
             text-gray-400 hover:text-white transition-colors cursor-pointer" title="Settings">
                    <Settings size="20" />
                </button>

                <button @click="handleLogout" class="w-10 h-10 rounded-xl flex items-center justify-center
             text-gray-400 hover:text-red-400 transition-colors" title="Logout">
                    <LogOut size="20" />
                </button>
            </div>
        </aside>

        <main class="flex-1 flex flex-col min-w-0 h-full relative px-4 py-6"
            :class="{ 'opacity-50 pointer-events-none grayscale': isPaymentMode }">

            <header class="flex items-center justify-between mb-6">
                <div class="flex items-center gap-4 md:gap-8 flex-1">
                    
                    <!-- <button @click="showMobileMenu = true" 
                        class="md:hidden text-[#000000] flex items-center justify-center shadow-sm active:bg-gray-100">
                        <Menu size="20" />
                    </button> -->

                    <div>
                        <button @click="showMobileMenu = true" 
                            class="text-xl md:text-2xl font-preahvihear font-medium text-[#000000]">សាយ័ណ្ហកាហ្វេ
                        </button>
                        <p class="text-xs font-medium text-gray-400 mt-1">{{ formattedTime }}</p>
                    </div>

                    <div class="relative w-full max-w-md hidden lg:block">
                        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size="18" />
                        <input v-model="searchQuery" type="text" placeholder="Search menu..."
                            class="w-full pl-11 pr-4 h-11 bg-white rounded-xl text-sm focus:outline-none text-[#000000] placeholder-gray-300">
                    </div>
                </div>

                <div class="flex items-center gap-4">

                    <div class="flex items-center gap-3 ml-2 bg-white pl-2 pr-4 py-1.5 rounded-full ">
                        <div class="w-8 h-8 rounded-full bg-[#000000] text-white flex items-center justify-center">
                            <User size="14" />
                        </div>
                        <div class="text-left">
                            <p class="text-xs font-medium text-[#000000]">{{ auth.userName }}</p>
                            <p class="text-[10px] text-gray-400 capitalize">{{ auth.user?.role || 'Staff' }}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div class="flex items-center gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2">
                <button @click="activeCategory = 'All'"
                    class="px-6 py-2.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                    :class="activeCategory === 'All' ? 'bg-[#000000] text-white ' : 'bg-white text-gray-400 hover:text-[#000000]'">
                    All Items
                </button>

                <button v-for="cat in menu.categories" :key="cat" @click="activeCategory = cat"
                    class="px-6 py-2.5 rounded-full text-xs font-medium transition-all whitespace-nowrap"
                    :class="activeCategory === cat ? 'bg-[#000000] text-white ' : 'bg-white text-gray-400 hover:text-[#000000]'">
                    <Coffee v-if="cat.includes('Coffee')" size="14" class="mr-2 inline-block opacity-70" />
                    {{ cat }}
                </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-2 pb-20 scrollbar-hide">
                <div v-if="menu.isLoading" class="flex flex-col items-center justify-center h-64 gap-3">
                    <Loader2 class="animate-spin w-8 h-8 text-[#AA2B1D]" />
                    <p class="text-sm font-medium text-gray-400">Loading Menu...</p>
                </div>

                <div v-else-if="filteredProducts.length === 0"
                    class="flex flex-col items-center justify-center h-64 text-gray-400">
                    <Coffee size="48" class="mb-4 opacity-20" />
                    <p class="font-medium">No items found.</p>
                </div>

                <div v-else class="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    <div v-for="product in filteredProducts" :key="product.product_id"
                        class="bg-white rounded-xl shadow-md p-4 transition-all duration-300 group flex flex-col relative border border-transparent hover:border-[#AA2B1D]/20">
                        <div class="w-full aspect-square rounded-2xl overflow-hidden relative mb-3">
                            <img v-if="product.image_url" :src="getThumbnail(product.image_url)"
                                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                loading="lazy" />
                            <div v-else class="w-full h-full flex items-center justify-center text-gray-300">
                                <Coffee size="32" />
                            </div>
                        </div>

                        <div class="flex flex-col flex-1">
                            <div class="flex justify-between items-start mb-1 gap-2">
                                <h3 class="font-medium text-[#000000] text-xs leading-tight line-clamp-2">{{
                                    product.name }}</h3>
                                <span class="font-medium text-[#000000] text-[10px] whitespace-nowrap">${{ product.price
                                    }}</span>
                            </div>

                            <p class="text-[10px] text-gray-400 mb-3 font-semibold tracking-wide">
                                Sugar Level
                            </p>

                            <div class="mt-auto flex justify-between items-center bg-zinc-50 rounded-xl p-1 gap-1">

                                <button @click.stop="handleProductClickWrapper(product, '0% Sugar')" :class="{
                                    'bg-red-800 text-white rounded-full': lastSelectedSugar[product.product_id] === '0% Sugar',
                                    'text-gray-500 hover:bg-[#AA2B1D] hover:text-white': lastSelectedSugar[product.product_id] !== '0% Sugar'
                                }" class="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors">
                                    0%
                                </button>

                                <button @click.stop="handleProductClickWrapper(product, '50% Sugar')" :class="{
                                    'bg-red-800 text-white rounded-full': lastSelectedSugar[product.product_id] === '50% Sugar',
                                    'text-gray-500 hover:bg-[#AA2B1D] hover:text-white': lastSelectedSugar[product.product_id] !== '50% Sugar'
                                }" class="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors">
                                    50%
                                </button>

                                <button @click.stop="handleProductClickWrapper(product, '100% Sugar')" :class="{
                                    'bg-red-800 text-white rounded-full': lastSelectedSugar[product.product_id] === '100% Sugar',
                                    'text-gray-500 hover:bg-[#AA2B1D] hover:text-white': lastSelectedSugar[product.product_id] !== '100% Sugar'
                                }" class="flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-colors">
                                    100%
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>

        <aside
            class="fixed inset-y-0 right-0 w-full md:w-sm bg-white z-30 flex flex-col md:relative md:translate-y-0 transition-transform duration-300   md:border-l md:border-gray-100 px-6 py-6"
            :class="showMobileCart ? 'translate-y-0' : 'translate-y-full md:translate-y-0'">

            <div class="flex items-center justify-between mb-6">
                <div>
                    <h2 class="text-xl font-medium text-[#000000] mb-1">Current Order</h2>
                    <p class="text-xs text-gray-400 font-kantumruy">ការបញ្ជាទិញបច្ចុប្បន្ន</p>
                </div>
                <button @click="cart.clearCart()"
                    class="text-xs font-medium text-gray-300 hover:text-red-500 transition-colors uppercase tracking-wide">Clear</button>
                <button @click="showMobileCart = false" class="md:hidden p-2 bg-gray-100 rounded-full">
                    <X size="20" />
                </button>
            </div>

            <div class="flex-1 overflow-y-auto pr-1" ref="cartListRef">
                <div v-if="cart.cartItems.length === 0"
                    class="h-40 flex flex-col items-center justify-center text-gray-300 gap-2 border-2 border-dashed border-gray-100 rounded-xl">
                    <ShoppingBag size="32" class="opacity-20" />
                    <p class="text-xs font-medium">Cart Empty</p>
                </div>

                <div v-for="item in cart.cartItems" :key="item.product_id"
                    class="flex items-center gap-4 py-4 border-b border-gray-50 last:border-0 group">

                    <div class="flex-1 min-w-0">
                        <p class="font-medium text-sm text-[#000000] truncate">{{ item.name }}</p>
                        <p class="text-xs text-gray-400 font-medium mt-1">${{ item.price }}</p>
                    </div>

                    <div v-if="!isPaymentMode" class="flex items-center gap-3">
                        <button @click="adjustQty(item, -1)"
                            class="w-7 h-7 rounded-full border border-gray-200 text-[#000000] flex items-center justify-center hover:bg-[#AA2B1D] hover:text-white hover:border-[#AA2B1D] transition-all">
                            <Minus size="12" stroke-width="3" />
                        </button>
                        <span class="font-medium text-[#000000] w-4 text-center text-sm">{{ item.quantity }}</span>
                        <button @click="adjustQty(item, 1)"
                            class="w-7 h-7 rounded-full border border-gray-200 text-[#000000] flex items-center justify-center hover:bg-[#AA2B1D] hover:text-white hover:border-[#AA2B1D] transition-all">
                            <Plus size="12" stroke-width="3" />
                        </button>
                    </div>
                    <div v-else class="font-medium text-[#000000]">x{{ item.quantity }}</div>
                </div>
            </div>

            <div class="mt-auto pt-6 border-t border-dashed border-gray-200">
                <div class="space-y-3 mb-6">
                    <div class="flex justify-between items-center text-[#000000] text-sm font-medium">
                        <span>Subtotal</span>
                        <span>${{ cart.totalPrice }}</span>
                    </div>
                    <div class="flex justify-between items-center text-gray-400 text-sm ">
                        <span>Tax / Fees</span>
                        <span>$0.00</span>
                    </div>
                    <div class="border-t border-dashed border-gray-200 my-2"></div>
                    <div class="flex justify-between items-center text-[#000000] text-xl font-medium">
                        <span>Total</span>
                        <span>${{ cart.totalPrice }}</span>
                    </div>
                </div>

                <div v-if="!isPaymentMode">
                    <button @click="handleCheckoutStart" :disabled="cart.cartItems.length === 0"
                        class="w-full bg-[#000000] text-white h-14 rounded-xl text-sm font-medium hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">

                        <Printer v-if="enablePrint" size="18" />

                        {{ enablePrint ? 'Print Bills' : 'Checkout' }}
                    </button>
                </div>

                <div v-else class="grid grid-cols-2 gap-3">
                    <button @click="handleUpdateOrder"
                        class="py-3 rounded-xl font-medium text-sm border border-gray-200 text-gray-500 hover:bg-gray-50">Back</button>
                    <button @click="handlePaymentSuccess"
                        class="py-3 bg-[#AA2B1D] text-white rounded-xl font-medium text-sm  hover:bg-[#d67a28]">Confirm</button>
                </div>
            </div>
        </aside>

        <div v-if="!showMobileCart && cart.cartItems.length > 0" class="md:hidden fixed bottom-6 left-6 right-6 z-40">
            <button @click="showMobileCart = true"
                class="w-full bg-[#000000] text-white h-14 rounded-2xl flex items-center justify-between px-6 ">
                <span class="font-medium">{{ cart.cartItems.length }} items</span>
                <span class="font-medium text-lg">${{ cart.totalPrice }}</span>
            </button>
        </div>

        <div v-if="showSettingsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showSettingsModal = false"></div>
            <div class="relative w-full max-w-sm bg-white rounded-3xl p-6 ">
                <div class="flex justify-between items-center mb-6">
                    <h3 class="font-medium text-xl text-[#000000]">Settings</h3>
                    <button @click="showSettingsModal = false">
                        <X class="text-gray-400" />
                    </button>
                </div>
                <div @click="enablePrint = !enablePrint"
                    class="flex items-center justify-between p-4 rounded-2xl border cursor-pointer"
                    :class="enablePrint ? 'border-[#AA2B1D] bg-[#AA2B1D]/10' : 'border-gray-100'">
                    <div class="flex items-center gap-3">
                        <Printer :class="enablePrint ? 'text-[#AA2B1D]' : 'text-gray-400'" />
                        <span class="font-medium text-[#000000]">Auto-Print Receipt</span>
                    </div>
                    <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                        :class="enablePrint ? 'border-[#AA2B1D] bg-[#AA2B1D]' : 'border-gray-300'">
                        <Check v-if="enablePrint" size="14" class="text-white" />
                    </div>
                </div>
            </div>
        </div>

    </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');

.font-montserrat {
    font-family: 'Montserrat', sans-serif;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background-color: #e5e7eb;
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