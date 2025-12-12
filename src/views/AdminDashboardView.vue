<script setup>
import { onMounted, reactive, ref, computed, watch } from 'vue'; // Added watch here
import { useAuthStore } from '../stores/auth';
import { useProductStore } from '../stores/products';
import { useBranchStore } from '../stores/branches';
import apiClient from '../services/api';
import CategoryManager from '../components/admin/CategoryManager.vue';
import ProductManager from '@/components/admin/ProductManager.vue';
import { useRouter } from 'vue-router';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import {
    LayoutDashboard, ShoppingBag, Settings, LogOut, Plus, Edit, Trash2, X, Layers,
    Search, Store, MapPin, Loader2, ListPlus, UploadCloud, TrendingUp, Users, Wallet, Menu, Coffee, ArrowUpRight,
    Calendar, Filter // Added new icons here
} from 'lucide-vue-next';

const auth = useAuthStore();
const products = useProductStore();
const branchStore = useBranchStore();
const router = useRouter();
const [animationParent] = useAutoAnimate();

// 1. DEFINE STATE VARIABLES FIRST
const activeTab = ref('dashboard');
const searchQuery = ref('');
const showProductModal = ref(false);

// Stats Data
const stats = reactive({ totalSales: 0, totalOrders: 0, topProduct: 'Loading...' });
const branchStats = ref([]);

// --- NEW: Sales Report State (MUST BE DEFINED HERE) ---
const reportPeriod = ref('today'); 
const reportBranch = ref('all');
const salesReport = ref([]);
const isReportLoading = ref(false);

// Product Form State
const isEditing = ref(false);
const editingId = ref(null);
const isUploading = ref(false);
const productForm = reactive({
    category_id: 1, name: '', price: 0.00, is_available: true,
    image_url: '', options: []
});
const newOptionName = ref('');
const newOptionValues = ref('');
const newBranch = reactive({ username: '', password: '', name: '' });

// 2. DEFINE WATCHERS AFTER VARIABLES
watch([reportPeriod, reportBranch], () => {
    fetchSalesReport();
});

// 3. LIFECYCLE HOOKS
onMounted(() => {
    if (auth.user?.role !== 'admin' && !auth.user) {
        // logic
    }
    products.fetchAllProducts();
    branchStore.fetchBranches();
    fetchStats();
    fetchSalesReport(); // Call this immediately on load
});

// 4. FUNCTIONS

// --- NEW: Sales Report Function ---
async function fetchSalesReport() {
    isReportLoading.value = true;
    try {
        const res = await apiClient.get('/stats/sales-report', {
            params: {
                period: reportPeriod.value,
                branch_id: reportBranch.value
            }
        });
        salesReport.value = res.data;
    } catch (err) {
        console.error("Report error:", err);
    } finally {
        isReportLoading.value = false;
    }
}

async function fetchStats() {
    try {
        const res = await apiClient.get('/stats');
        Object.assign(stats, res.data);
        const bRes = await apiClient.get('/stats/branches');
        branchStats.value = bRes.data;
    } catch (err) { console.error(err); }
}

const filteredProducts = computed(() => {
    if (!searchQuery.value) return products.productList;
    return products.productList.filter(p => p.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

// ... (Rest of your functions: openAddModal, startEdit, handleFileUpload, etc. stay the same)

// --- Modal & Form Logic ---
function openAddModal() { resetForm(); showProductModal.value = true; }
function startEdit(product) {
    Object.assign(productForm, product);
    productForm.options = product.options || [];
    productForm.image_url = product.image_url || '';
    isEditing.value = true; editingId.value = product.product_id; showProductModal.value = true;
}
function resetForm() {
    Object.assign(productForm, { category_id: 1, name: '', price: 0.00, is_available: true, image_url: '', options: [] });
    newOptionName.value = ''; newOptionValues.value = ''; isEditing.value = false; editingId.value = null;
}
function addOptionGroup() {
    if (!newOptionName.value || !newOptionValues.value) return;
    productForm.options.push({ name: newOptionName.value, values: newOptionValues.value.split(',').map(v => v.trim()).filter(v => v) });
    newOptionName.value = ''; newOptionValues.value = '';
}
function removeOptionGroup(index) { productForm.options.splice(index, 1); }

async function handleFileUpload(event) {
    // ... your existing upload logic
}

async function handleSubmit() {
    try {
        if (isEditing.value) await products.updateProduct(editingId.value, productForm);
        else await products.addProduct(productForm);
        showProductModal.value = false; resetForm();
    } catch (err) { alert(err.message); }
}

async function handleDeleteProduct(id, name) { if (confirm(`Delete ${name}?`)) try { await products.deleteProduct(id); } catch (err) { alert(err.message); } }
async function handleCreateBranch() {
    if (!newBranch.username || !newBranch.password || !newBranch.name) return alert("Fill all fields.");
    try { await branchStore.addBranch(newBranch); Object.assign(newBranch, { username: '', password: '', name: '' }); } catch (err) { alert(err.message); }
}
function handleLogout() { auth.logout(); router.push({ name: 'login' }); }
</script>

<template>
    <div
        class="flex flex-col md:flex-row h-screen bg-[#F8F9FD] font-sans text-slate-800 overflow-hidden antialiased selection:bg-blue-100 selection:text-blue-900">

        <aside
            class="hidden md:flex flex-col w-72 bg-white border-r border-slate-100 h-full shrink-0 z-20 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
            <div class="p-8 pb-4">
                <h1 class="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                    <div class="w-8 h-8 rounded-lg bg-blue-600"></div> Sayon<span class="text-slate-300">.</span>
                </h1>
                <p class="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest pl-1">Admin Console</p>
            </div>

            <nav class="flex-1 px-4 space-y-2 mt-4">
                <button @click="activeTab = 'dashboard'"
                    :class="activeTab === 'dashboard' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
                    class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all">
                    <LayoutDashboard size="20" /> Dashboard
                </button>

                <button @click="activeTab = 'category'"
                    :class="activeTab === 'category' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
                    class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all">
                    <Layers size="20" /> Categories
                </button>

                <button @click="activeTab = 'products'"
                    :class="activeTab === 'products' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
                    class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all">
                    <ShoppingBag size="20" /> Products
                </button>

                <button @click="activeTab = 'settings'"
                    :class="activeTab === 'settings' ? 'bg-blue-50 text-blue-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'"
                    class="w-full flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-bold transition-all">
                    <Store size="20" /> Branches
                </button>
            </nav>

            <div class="p-6 border-t border-slate-50">
                <div class="flex items-center gap-3 mb-6 p-3 bg-slate-50 rounded-2xl">
                    <div
                        class="w-10 h-10 rounded-xl bg-white text-blue-600 shadow-sm flex items-center justify-center font-black text-lg">
                        {{ auth.userName?.charAt(0) || 'A' }}</div>
                    <div>
                        <p class="text-sm font-bold text-slate-900">{{ auth.userName || 'Admin' }}</p>
                        <p class="text-[10px] text-slate-400 font-bold uppercase">Super User</p>
                    </div>
                </div>
                <button @click="handleLogout"
                    class="w-full flex items-center justify-center gap-2 text-slate-400 hover:text-red-500 text-xs font-bold uppercase tracking-widest transition-colors py-2">
                    <LogOut size="16" /> Sign Out
                </button>
            </div>
        </aside>

        <main class="flex-1 overflow-y-auto p-6 md:p-10 relative pb-24 md:pb-10" ref="animationParent">

            <div class="bg-white p-8 rounded-4xl shadow-sm border border-slate-100 mt-8">
                <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div>
                        <h3 class="font-bold text-lg text-slate-900 flex items-center gap-2">
                            <ListPlus class="text-blue-600" size="20" /> Detailed Sales Report
                        </h3>
                        <p class="text-sm text-slate-400 font-medium">Breakdown of items sold by period.</p>
                    </div>

                    <div class="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl">
                        <div class="relative">
                            <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="14" />
                            <select v-model="reportPeriod"
                                class="pl-9 pr-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 shadow-sm focus:border-blue-500 appearance-none cursor-pointer min-w-[120px]">
                                <option value="today">Today</option>
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                            </select>
                        </div>

                        <div class="relative">
                            <Filter class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="14" />
                            <select v-model="reportBranch"
                                class="pl-9 pr-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 shadow-sm focus:border-blue-500 appearance-none cursor-pointer min-w-[140px]">
                                <option value="all">All Branches</option>
                                <option v-for="branch in branchStore.branchList" :key="branch.user_id"
                                    :value="branch.user_id">
                                    {{ branch.name }}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="overflow-hidden rounded-2xl border border-slate-100">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                            <tr>
                                <th class="p-4">Item Name</th>
                                <th class="p-4 text-center">Qty Sold</th>
                                <th class="p-4 text-right">Revenue Generated</th>
                            </tr>
                        </thead>
                        <tbody class="text-sm divide-y divide-slate-50">
                            <tr v-if="isReportLoading">
                                <td colspan="3" class="p-8 text-center text-slate-400">
                                    <Loader2 class="animate-spin mx-auto mb-2" /> Loading data...
                                </td>
                            </tr>
                            <tr v-else-if="salesReport.length === 0">
                                <td colspan="3" class="p-8 text-center text-slate-400 font-medium">
                                    No sales found for this period.
                                </td>
                            </tr>
                            <tr v-else v-for="(item, idx) in salesReport" :key="idx"
                                class="group hover:bg-blue-50/30 transition-colors">
                                <td class="p-4 font-bold text-slate-700">{{ item.product_name }}</td>
                                <td class="p-4 text-center">
                                    <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded-lg text-xs font-bold">
                                        {{ item.total_quantity }}
                                    </span>
                                </td>
                                <td class="p-4 text-right font-mono font-bold text-slate-900">
                                    ${{ Number(item.total_revenue).toFixed(2) }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div v-if="activeTab === 'category'">
                <CategoryManager />
            </div>

            <div v-if="activeTab === 'products'">
                <ProductManager />
            </div>

            <!-- <div v-if="activeTab === 'products'"
                class="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div
                    class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
                    <div class="relative flex-1 w-full md:max-w-md ml-2">
                        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="18" />
                        <input v-model="searchQuery" type="text" placeholder="Search inventory..."
                            class="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all">
                    </div>
                    <button @click="openAddModal"
                        class="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2">
                        <Plus size="18" /> New Product
                    </button>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div v-for="product in filteredProducts" :key="product.product_id" @click="startEdit(product)"
                        class="bg-white p-4 rounded-4xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer group relative border border-slate-100">
                        <div class="aspect-square bg-slate-50 rounded-3xl mb-4 overflow-hidden relative">
                            <img v-if="product.image_url" :src="product.image_url"
                                class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div v-else class="w-full h-full flex items-center justify-center">
                                <Coffee size="32" class="text-slate-300" />
                            </div>
                        </div>
                        <div class="px-1">
                            <div class="flex justify-between items-start mb-2">
                                <h3 class="font-bold text-slate-900 leading-tight">{{ product.name }}</h3>
                                <span class="text-sm font-black text-blue-600">${{ Number(product.price).toFixed(2)
                                }}</span>
                            </div>
                            <p class="text-xs text-slate-400 font-medium">{{ product.category_name }}</p>
                        </div>
                        <button @click.stop="handleDeleteProduct(product.product_id, product.name)"
                            class="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm">
                            <Trash2 size="16" />
                        </button>
                    </div>
                </div>
            </div> -->

            <div v-if="activeTab === 'settings'"
                class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 class="text-3xl font-black text-slate-900 tracking-tight">Branch Management</h2>

                <div class="bg-white p-8 rounded-4xl shadow-sm border border-slate-100">
                    <h3 class="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">Add New Location</h3>
                    <form @submit.prevent="handleCreateBranch" class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div class="space-y-2"><label class="text-xs font-bold text-slate-700">Branch ID</label><input
                                v-model="newBranch.username" type="text"
                                class="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="st_230" /></div>
                        <div class="space-y-2"><label class="text-xs font-bold text-slate-700">Password</label><input
                                v-model="newBranch.password" type="text"
                                class="w-full bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-100 outline-none"
                                placeholder="******" /></div>
                        <button type="submit"
                            class="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg h-[46px]">Create
                            Branch</button>
                    </form>
                </div>

                <div class="grid gap-4">
                    <div v-for="branch in branchStore.branchList" :key="branch.user_id"
                        class="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-4xl shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">
                                {{ branch.name.charAt(0) }}</div>
                            <div>
                                <p class="font-bold text-slate-900 text-lg">{{ branch.name }}</p>
                                <p
                                    class="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded inline-block mt-1">
                                    ID: {{ branch.username }}</p>
                            </div>
                        </div>
                        <button v-if="branch.role !== 'admin'" @click="branchStore.deleteBranch(branch.user_id)"
                            class="p-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                            <Trash2 size="18" />
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" @click="showProductModal = false"></div>
            <div
                class="relative w-full max-w-lg bg-white rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
                <h3 class="font-black text-2xl text-slate-900 mb-6">{{ isEditing ? 'Edit Product' : 'New Product' }}
                </h3>

                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <div class="flex gap-6">
                        <div
                            class="w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden shrink-0 hover:border-blue-500 transition-colors cursor-pointer group">
                            <img v-if="productForm.image_url" :src="productForm.image_url"
                                class="w-full h-full object-cover" />
                            <UploadCloud v-else size="24" class="text-slate-300 group-hover:text-blue-500" />
                            <input type="file" @change="handleFileUpload"
                                class="absolute inset-0 opacity-0 cursor-pointer" />
                            <div v-if="isUploading"
                                class="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 class="animate-spin text-blue-600" />
                            </div>
                        </div>
                        <div class="flex-1 space-y-4">
                            <input v-model="productForm.name"
                                class="w-full border-b-2 border-slate-100 py-2 text-lg font-bold placeholder-slate-300 focus:border-blue-600 outline-none bg-transparent transition-colors"
                                placeholder="Product Name" required />
                            <div class="flex gap-4">
                                <input v-model.number="productForm.price" type="number" step="0.01"
                                    class="w-full border-b-2 border-slate-100 py-2 font-bold focus:border-blue-600 outline-none bg-transparent"
                                    placeholder="0.00" required />
                                <select v-model.number="productForm.category_id"
                                    class="w-full border-b-2 border-slate-100 py-2 font-bold text-slate-600 focus:border-blue-600 outline-none bg-transparent">
                                    <option :value="1">Hot Coffee</option>
                                    <option :value="2">Iced Coffee</option>
                                    <option :value="3">Pastries</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="bg-slate-50 p-5 rounded-3xl">
                        <label class="text-xs font-bold uppercase text-slate-400 mb-3 block">Options (e.g. Sugar
                            Level)</label>
                        <div class="flex gap-2 mb-3">
                            <input v-model="newOptionName" placeholder="Name"
                                class="flex-1 bg-white rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm" />
                            <input v-model="newOptionValues" placeholder="Values (comma split)"
                                class="flex-2 bg-white rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm" />
                            <button type="button" @click="addOptionGroup" class="bg-blue-600 text-white p-2 rounded-xl">
                                <Plus size="16" />
                            </button>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <div v-for="(opt, i) in productForm.options" :key="i"
                                class="bg-white px-3 py-1 rounded-lg text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2">
                                {{ opt.name }} <button type="button" @click="removeOptionGroup(i)" class="text-red-400">
                                    <X size="12" />
                                </button></div>
                        </div>
                    </div>

                    <div class="flex justify-between items-center pt-2">
                        <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox"
                                v-model="productForm.is_available"
                                class="w-5 h-5 rounded text-blue-600 focus:ring-0" /><span
                                class="text-sm font-bold text-slate-500">Available</span></label>
                        <div class="flex gap-3">
                            <button type="button" @click="showProductModal = false"
                                class="px-6 py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button type="submit"
                                class="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>