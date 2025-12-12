<script setup>
import { onMounted, reactive, ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useProductStore } from '../stores/products';
import { useBranchStore } from '../stores/branches';
import apiClient from '../services/api';
import CategoryManager from '../components/admin/CategoryManager.vue';
import ProductManager from '@/components/admin/ProductManager.vue';
import { useRouter } from 'vue-router';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import Swal from 'sweetalert2';
import { toast } from 'vue-sonner';
import {
    LayoutDashboard, ShoppingBag, Store, LogOut, Plus, Edit, Trash2, X, Layers,
    Search, MapPin, Loader2, ListPlus, UploadCloud, TrendingUp, Users, Wallet, Menu, Coffee,
    Calendar, Filter
} from 'lucide-vue-next';

const auth = useAuthStore();
const products = useProductStore();
const branchStore = useBranchStore();
const router = useRouter();

// Optimization: Only animate specific lists
const [salesTableRef] = useAutoAnimate();

// --- STATE ---
const activeTab = ref('dashboard');
const searchQuery = ref('');
const showProductModal = ref(false);
const isMobileMenuOpen = ref(false); // 👈 NEW: Controls mobile sidebar

// Stats Data
const stats = reactive({ totalSales: 0, totalOrders: 0, topProduct: 'Loading...' });
const branchStats = ref([]);

// Sales Report State
const reportPeriod = ref('today'); 
const reportBranch = ref('all');
const salesReport = ref([]);
const isReportLoading = ref(false);

// Product Form State (Kept same as before)
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

// --- WATCHERS ---
watch([reportPeriod, reportBranch], () => {
    fetchSalesReport();
});

// Watch route/tab changes to close mobile menu automatically
watch(activeTab, () => {
    isMobileMenuOpen.value = false;
});

// --- HELPER FUNCTIONS ---
function getThumbnail(url) {
    if (!url) return '';
    if (url.includes('cloudinary.com') && url.includes('/upload/')) {
        return url.replace('/upload/', '/upload/w_200,h_200,c_fill,q_auto,f_auto/');
    }
    return url;
}

// --- LIFECYCLE ---
onMounted(() => {
    if (auth.user?.role !== 'admin' && !auth.user) {
        // logic
    }
    products.fetchAllProducts();
    branchStore.fetchBranches();
    fetchStats();
    fetchSalesReport();
});

// --- API ACTIONS (Kept same as before) ---
async function fetchSalesReport() {
    isReportLoading.value = true; // Turn on loading state
    // 💡 TRICK: Do NOT clear salesReport.value here. 
    // We keep showing the old data (blurred) until the new data arrives.
    
    try {
        const res = await apiClient.get('/stats/sales-report', {
            params: {
                period: reportPeriod.value,
                branch_id: reportBranch.value
            }
        });
        salesReport.value = res.data; // Swap data instantly when ready
    } catch (err) {
        console.error("Report error:", err);
    } finally {
        isReportLoading.value = false; // Turn off loading
    }
}

async function fetchStats() {
    try {
        const res = await apiClient.get('/stats');
        Object.assign(stats, res.data);
    } catch (err) { console.error(err); }
}

// --- FORM ACTIONS ---
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
    const file = event.target.files[0];
    if (!file) return;
    isUploading.value = true;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', 'ml_default'); 
    try {
        const res = await fetch(`https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload`, {
            method: 'POST', body: formData
        });
        const data = await res.json();
        productForm.image_url = data.secure_url;
    } catch (err) { console.error('Upload failed', err); } 
    finally { isUploading.value = false; }
}

async function handleSubmit() {
    try {
        if (isEditing.value) {
            await products.updateProduct(editingId.value, productForm);
            toast.success('Product updated successfully!'); // 👈 Nice green popup
        } else {
            await products.addProduct(productForm);
            toast.success('New product added to menu!'); // 👈 Nice green popup
        }
        
        showProductModal.value = false; 
        resetForm();
    } catch (err) {
        // 👈 Nice red popup for errors
        toast.error('Failed to save product. ' + err.message);
    }
}

async function handleCreateBranch() {
    if (!newBranch.username || !newBranch.password || !newBranch.name) return alert("Fill all fields.");
    try { await branchStore.addBranch(newBranch); Object.assign(newBranch, { username: '', password: '', name: '' }); } catch (err) { alert(err.message); }
}
function handleLogout() { auth.logout(); router.push({ name: 'login' }); }
</script>

<template>
    <div class="flex flex-col md:flex-row h-screen bg-[#F8F9FD] font-sans text-slate-800 overflow-hidden antialiased selection:bg-blue-100 selection:text-blue-900">

        <div class="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-100 shrink-0 z-30">
            <h1 class="text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <div class="w-7 h-7 rounded-lg bg-blue-600"></div> Sayon.
            </h1>
            <button @click="isMobileMenuOpen = true" class="p-2 text-slate-500 hover:bg-slate-50 rounded-lg">
                <Menu size="24" />
            </button>
        </div>

        <div v-if="isMobileMenuOpen" 
             @click="isMobileMenuOpen = false"
             class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-200">
        </div>

        <aside :class="[
            'flex flex-col w-72 bg-white border-r border-slate-100 h-full shrink-0 z-50 shadow-[4px_0_24px_rgba(0,0,0,0.02)] transition-transform duration-300',
            'fixed top-0 left-0 bottom-0 md:relative', // Positioning
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0' // Slide logic
        ]">
            <div class="p-8 pb-4 flex justify-between items-start">
                <div>
                    <h1 class="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                        <div class="w-8 h-8 rounded-lg bg-blue-600"></div> Sayon<span class="text-slate-300">.</span>
                    </h1>
                    <p class="text-xs font-bold text-slate-400 mt-2 uppercase tracking-widest pl-1">Admin Console</p>
                </div>
                <button @click="isMobileMenuOpen = false" class="md:hidden text-slate-400 hover:text-red-500">
                    <X size="24" />
                </button>
            </div>

            <nav class="flex-1 px-4 space-y-2 mt-4 overflow-y-auto">
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
                    <div class="w-10 h-10 rounded-xl bg-white text-blue-600 shadow-sm flex items-center justify-center font-black text-lg">
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

        <main class="flex-1 overflow-y-auto p-4 md:p-10 relative pb-24 md:pb-10 w-full">

            <div v-show="activeTab === 'dashboard'">
                <div class="bg-white p-6 md:p-8 rounded-3xl md:rounded-4xl shadow-sm border border-slate-100 mt-4 md:mt-8">
                    
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                        
                        <div>
                            <h3 class="font-bold text-lg text-slate-900 flex items-center gap-2">
                                <ListPlus class="text-blue-600" size="20" /> Detailed Sales Report
                            </h3>
                            <p class="text-sm text-slate-400 font-medium">Breakdown of items sold by period.</p>
                        </div>

                        <div class="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-slate-50 p-2 rounded-2xl w-full md:w-auto">
                            
                            <div class="relative flex-1">
                                <Calendar class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="14" />
                                <select v-model="reportPeriod"
                                    class="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 shadow-sm focus:border-blue-500 appearance-none cursor-pointer hover:border-blue-300 transition-colors">
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
                                </select>
                            </div>

                            <div class="relative flex-1">
                                <Filter class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="14" />
                                <select v-model="reportBranch"
                                    class="w-full pl-9 pr-4 py-2 bg-white rounded-xl text-xs font-bold text-slate-700 outline-none border border-slate-200 shadow-sm focus:border-blue-500 appearance-none cursor-pointer hover:border-blue-300 transition-colors">
                                    <option value="all">All Branches</option>
                                    <option v-for="branch in branchStore.branchList" :key="branch.user_id" :value="branch.user_id">
                                        {{ branch.name }}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div class="relative overflow-hidden rounded-2xl border border-slate-100 min-h-[300px]">
                        
                        <div v-if="isReportLoading" 
                             class="absolute inset-0 z-10 flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-all duration-300">
                             <div class="bg-white p-3 rounded-2xl shadow-lg border border-slate-100 flex items-center gap-3">
                                <Loader2 class="animate-spin text-blue-600" size="20" />
                                <span class="text-xs font-bold text-slate-500">Updating...</span>
                             </div>
                        </div>

                        <div class="overflow-x-auto">
                            <table class="w-full text-left min-w-[500px]">
                                <thead class="bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                                    <tr>
                                        <th class="p-4">Item Name</th>
                                        <th class="p-4 text-center">Qty Sold</th>
                                        <th class="p-4 text-right">Revenue Generated</th>
                                    </tr>
                                </thead>
                                
                                <tbody :class="{ 'opacity-40': isReportLoading }" class="text-sm divide-y divide-slate-50 transition-opacity duration-300">
                                    
                                    <tr v-if="!isReportLoading && salesReport.length === 0">
                                        <td colspan="3" class="p-12 text-center text-slate-400 font-medium">
                                            <div class="flex flex-col items-center gap-2">
                                                <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-2">
                                                    <ShoppingBag class="text-slate-300" size="24" />
                                                </div>
                                                No sales found for this period.
                                            </div>
                                        </td>
                                    </tr>

                                    <tr v-else v-for="(item, idx) in salesReport" :key="idx"
                                        class="group hover:bg-blue-50/30 transition-colors">
                                        <td class="p-4 font-bold text-slate-700">
                                            {{ item.product_name }}
                                        </td>
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
                </div>
            </div>

            <KeepAlive>
                <div v-if="activeTab === 'category'">
                    <CategoryManager />
                </div>
            </KeepAlive>

            <KeepAlive>
                <div v-if="activeTab === 'products'">
                    <ProductManager />
                </div>
            </KeepAlive>

            <div v-if="activeTab === 'settings'"
                class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <h2 class="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Branch Management</h2>
                <div class="bg-white p-6 md:p-8 rounded-4xl shadow-sm border border-slate-100">
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
                            class="bg-slate-900 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-lg h-[46px] w-full md:w-auto">Create
                            Branch</button>
                    </form>
                </div>
                <div class="grid gap-4">
                    <div v-for="branch in branchStore.branchList" :key="branch.user_id"
                        class="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-white border border-slate-100 rounded-3xl md:rounded-4xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] gap-4">
                        <div class="flex items-center gap-4">
                            <div
                                class="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg shrink-0">
                                {{ branch.name.charAt(0) }}</div>
                            <div>
                                <p class="font-bold text-slate-900 text-lg">{{ branch.name }}</p>
                                <p class="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded inline-block mt-1">
                                    ID: {{ branch.username }}</p>
                            </div>
                        </div>
                        <button v-if="branch.role !== 'admin'" @click="branchStore.deleteBranch(branch.user_id)"
                            class="p-3 bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors self-end sm:self-center">
                            <Trash2 size="18" />
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
             <div class="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" @click="showProductModal = false"></div>
            <div class="relative w-full max-w-lg bg-white rounded-4xl p-6 md:p-8 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
                <h3 class="font-black text-2xl text-slate-900 mb-6">{{ isEditing ? 'Edit Product' : 'New Product' }}</h3>
                <form @submit.prevent="handleSubmit" class="space-y-6">
                    <div class="flex flex-col sm:flex-row gap-6">
                        <div class="w-full sm:w-24 h-24 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center relative overflow-hidden shrink-0 hover:border-blue-500 transition-colors cursor-pointer group">
                            <img v-if="productForm.image_url" :src="getThumbnail(productForm.image_url)" class="w-full h-full object-cover" />
                            <UploadCloud v-else size="24" class="text-slate-300 group-hover:text-blue-500" />
                            <input type="file" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer" />
                            <div v-if="isUploading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                                <Loader2 class="animate-spin text-blue-600" />
                            </div>
                        </div>
                        <div class="flex-1 space-y-4">
                            <input v-model="productForm.name" class="w-full border-b-2 border-slate-100 py-2 text-lg font-bold placeholder-slate-300 focus:border-blue-600 outline-none bg-transparent transition-colors" placeholder="Product Name" required />
                            <div class="flex gap-4">
                                <input v-model.number="productForm.price" type="number" step="0.01" class="w-full border-b-2 border-slate-100 py-2 font-bold focus:border-blue-600 outline-none bg-transparent" placeholder="0.00" required />
                                <select v-model.number="productForm.category_id" class="w-full border-b-2 border-slate-100 py-2 font-bold text-slate-600 focus:border-blue-600 outline-none bg-transparent">
                                    <option :value="1">Hot Coffee</option>
                                    <option :value="2">Iced Coffee</option>
                                    <option :value="3">Pastries</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="bg-slate-50 p-5 rounded-3xl">
                        <label class="text-xs font-bold uppercase text-slate-400 mb-3 block">Options</label>
                        <div class="flex flex-col sm:flex-row gap-2 mb-3">
                            <input v-model="newOptionName" placeholder="Name" class="flex-1 bg-white rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm" />
                            <input v-model="newOptionValues" placeholder="Values (comma split)" class="flex-2 bg-white rounded-xl px-4 py-2 text-xs font-bold outline-none shadow-sm" />
                            <button type="button" @click="addOptionGroup" class="bg-blue-600 text-white p-2 rounded-xl self-end sm:self-auto"><Plus size="16" /></button>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <div v-for="(opt, i) in productForm.options" :key="i" class="bg-white px-3 py-1 rounded-lg text-xs font-bold text-slate-600 shadow-sm flex items-center gap-2">
                                {{ opt.name }} <button type="button" @click="removeOptionGroup(i)" class="text-red-400"><X size="12" /></button>
                            </div>
                        </div>
                    </div>
                     <div class="flex flex-col sm:flex-row justify-between items-center pt-2 gap-4">
                        <label class="flex items-center gap-2 cursor-pointer self-start sm:self-center"><input type="checkbox" v-model="productForm.is_available" class="w-5 h-5 rounded text-blue-600 focus:ring-0" /><span class="text-sm font-bold text-slate-500">Available</span></label>
                        <div class="flex gap-3 w-full sm:w-auto">
                            <button type="button" @click="showProductModal = false" class="flex-1 sm:flex-none px-6 py-3 rounded-2xl font-bold text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                            <button type="submit" class="flex-1 sm:flex-none bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>
</template>