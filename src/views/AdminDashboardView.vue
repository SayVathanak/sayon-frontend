<script setup>
import { onMounted, reactive, ref, computed } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useProductStore } from '../stores/products';
import { useBranchStore } from '../stores/branches';
import apiClient from '../services/api';
import { useRouter } from 'vue-router';
import { useAutoAnimate } from '@formkit/auto-animate/vue';
import { 
    LayoutDashboard, ShoppingBag, Settings, LogOut, Plus, Edit, Trash2, X, 
    Search, Store, MapPin, Loader2, ListPlus, UploadCloud, TrendingUp, Users, DollarSign 
} from 'lucide-vue-next';

const auth = useAuthStore();
const products = useProductStore();
const branchStore = useBranchStore();
const router = useRouter();
const [animationParent] = useAutoAnimate(); 

const activeTab = ref('dashboard');
const searchQuery = ref('');
const showProductModal = ref(false); 

// Data
const stats = reactive({ totalSales: 0, totalOrders: 0, topProduct: 'Loading...' });
const branchStats = ref([]); 

// Product Form
const isEditing = ref(false);
const editingId = ref(null);
const isUploading = ref(false);
const productForm = reactive({
    category_id: 1, name: '', price: 0.00, is_available: true, 
    image_url: '', options: [] 
});
// Option Builder State
const newOptionName = ref('');
const newOptionValues = ref(''); 

// Branch Form
const newBranch = reactive({ username: '', password: '', name: '' });

onMounted(() => {
    if (auth.user?.role !== 'admin') { router.push({ name: 'pos-main' }); return; }
    products.fetchAllProducts();
    branchStore.fetchBranches();
    fetchStats();
});

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
    const file = event.target.files[0];
    if (!file) return;
    isUploading.value = true;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await apiClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        productForm.image_url = response.data.url;
    } catch (err) { alert("Upload failed."); } finally { isUploading.value = false; }
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
    try { await branchStore.addBranch(newBranch); Object.assign(newBranch, {username:'', password:'', name:''}); } catch (err) { alert(err.message); }
}
function handleLogout() { auth.logout(); router.push({ name: 'login' }); }
</script>

<template>
  <div class="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden antialiased selection:bg-red-100 selection:text-red-900">
    
    <aside class="hidden md:flex flex-col w-64 bg-white border-r border-zinc-200 h-full shrink-0 z-20">
        <div class="p-8">
            <h1 class="text-xl font-black uppercase flex items-center gap-2 tracking-tight text-red-950">
                <div class="w-8 h-8 bg-red-800 text-white flex items-center justify-center rounded-lg shadow-lg shadow-red-200">S</div>
                Sayon Admin
            </h1>
        </div>
        <nav class="flex-1 px-4 space-y-2">
            <button @click="activeTab = 'dashboard'" :class="activeTab === 'dashboard' ? 'bg-red-50 text-red-800' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                <LayoutDashboard size="18" /> Dashboard
            </button>
            <button @click="activeTab = 'products'" :class="activeTab === 'products' ? 'bg-red-50 text-red-800' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                <ShoppingBag size="18" /> Inventory
            </button>
            <button @click="activeTab = 'settings'" :class="activeTab === 'settings' ? 'bg-red-50 text-red-800' : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900'" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all">
                <Users size="18" /> Branches
            </button>
        </nav>
        <div class="p-6 border-t border-zinc-100">
            <div class="flex items-center gap-3 mb-4">
                <div class="w-8 h-8 rounded-full bg-zinc-100 text-zinc-500 flex items-center justify-center font-bold text-xs">{{ auth.userName.charAt(0) }}</div>
                <div><p class="text-xs font-bold text-zinc-900">{{ auth.userName }}</p><p class="text-[10px] text-zinc-400 font-bold uppercase">Administrator</p></div>
            </div>
            <button @click="handleLogout" class="w-full flex items-center gap-2 text-zinc-400 hover:text-red-600 text-xs font-bold uppercase tracking-widest transition-colors"><LogOut size="14" /> Sign Out</button>
        </div>
    </aside>

    <main class="flex-1 overflow-y-auto p-8 relative" ref="animationParent">
        
        <div v-if="activeTab === 'dashboard'" class="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <header>
                <h2 class="text-3xl font-black tracking-tight text-zinc-900">Performance Overview</h2>
                <p class="text-zinc-500 font-medium">Real-time metrics from all branches.</p>
            </header>
            
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-lg hover:shadow-red-50 hover:border-red-100 transition-all group">
                    <div class="flex justify-between items-start mb-4"><div class="p-2 bg-red-50 text-red-800 rounded-lg"><DollarSign size="20"/></div><span class="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">+12%</span></div>
                    <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Revenue</p>
                    <p class="text-4xl font-black text-zinc-900 mt-1">${{ stats.totalSales.toLocaleString() }}</p>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-lg hover:shadow-red-50 hover:border-red-100 transition-all group">
                    <div class="flex justify-between items-start mb-4"><div class="p-2 bg-blue-50 text-blue-800 rounded-lg"><ShoppingBag size="20"/></div></div>
                    <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Orders</p>
                    <p class="text-4xl font-black text-zinc-900 mt-1">{{ stats.totalOrders }}</p>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-100 hover:shadow-lg hover:shadow-red-50 hover:border-red-100 transition-all group">
                    <div class="flex justify-between items-start mb-4"><div class="p-2 bg-amber-50 text-amber-800 rounded-lg"><TrendingUp size="20"/></div></div>
                    <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Best Seller</p>
                    <p class="text-2xl font-black text-zinc-900 mt-1 truncate">{{ stats.topProduct }}</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-zinc-100 overflow-hidden">
                <div class="p-6 border-b border-zinc-50"><h3 class="font-bold text-lg text-zinc-900">Branch Leaderboard</h3></div>
                <table class="w-full text-left">
                    <thead class="bg-zinc-50 text-zinc-400 text-[10px] font-bold uppercase tracking-widest"><tr><th class="p-4 pl-6">Rank</th><th class="p-4">Location</th><th class="p-4 text-right">Orders</th><th class="p-4 text-right">Revenue</th><th class="p-4 pr-6 hidden md:table-cell">Performance</th></tr></thead>
                    <tbody class="text-sm text-zinc-600">
                        <tr v-for="(branch, idx) in branchStats" :key="idx" class="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                            <td class="p-4 pl-6 font-mono text-zinc-400">#{{ idx + 1 }}</td>
                            <td class="p-4 font-bold text-zinc-900">{{ branch.branch_name }}</td>
                            <td class="p-4 text-right font-mono">{{ branch.total_orders }}</td>
                            <td class="p-4 text-right font-bold text-red-800 font-mono">${{ Number(branch.total_revenue).toFixed(2) }}</td>
                            <td class="p-4 pr-6 hidden md:table-cell"><div class="h-1.5 bg-zinc-100 rounded-full w-full overflow-hidden"><div class="h-full bg-red-800 rounded-full" :style="{ width: (branch.total_revenue / (branchStats[0]?.total_revenue || 1) * 100) + '%' }"></div></div></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div v-if="activeTab === 'products'" class="max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div class="flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 class="text-3xl font-black text-zinc-900 tracking-tight">Product Inventory</h2>
                <div class="flex gap-3 w-full md:w-auto">
                    <div class="relative flex-1 md:w-64"><Search class="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size="16"/><input v-model="searchQuery" type="text" placeholder="Search..." class="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-100 focus:border-red-800 outline-none transition-all"></div>
                    <button @click="openAddModal" class="bg-red-800 text-white px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-900 transition-colors shadow-lg shadow-red-100 flex items-center gap-2"><Plus size="16"/> Add New</button>
                </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div v-for="product in filteredProducts" :key="product.product_id" @click="startEdit(product)" class="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm hover:shadow-xl hover:shadow-red-50 hover:border-red-100 transition-all cursor-pointer group relative overflow-hidden">
                    <div class="aspect-square bg-zinc-50 rounded-xl mb-3 overflow-hidden flex items-center justify-center">
                        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <Coffee v-else size="32" class="text-zinc-300"/>
                    </div>
                    <div class="flex justify-between items-start">
                        <div><h3 class="font-bold text-sm text-zinc-900 leading-tight mb-1">{{ product.name }}</h3><p class="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">{{ product.category_name }}</p></div>
                        <span class="text-sm font-black text-red-800 font-mono">${{ Number(product.price).toFixed(2) }}</span>
                    </div>
                    <button @click.stop="handleDeleteProduct(product.product_id, product.name)" class="absolute top-3 right-3 p-2 bg-white/90 rounded-lg text-zinc-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 shadow-sm"><Trash2 size="16"/></button>
                </div>
            </div>
        </div>

        <div v-if="activeTab === 'settings'" class="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 class="text-3xl font-black text-zinc-900 tracking-tight">Branch Management</h2>
            <div class="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
                <h3 class="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">Create New Location</h3>
                <form @submit.prevent="handleCreateBranch" class="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div class="space-y-1"><label class="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Branch ID</label><input v-model="newBranch.username" type="text" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-100 outline-none" placeholder="st_230" /></div>
                    <div class="space-y-1"><label class="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Password</label><input v-model="newBranch.password" type="text" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-100 outline-none" placeholder="******" /></div>
                    <div class="space-y-1"><label class="text-[10px] font-bold uppercase tracking-wide text-zinc-500">Display Name</label><input v-model="newBranch.name" type="text" class="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-red-100 outline-none" placeholder="SAYON 230" /></div>
                    <button type="submit" class="bg-zinc-900 text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-800 transition-colors shadow-lg">Create</button>
                </form>
            </div>
            <div class="space-y-3">
                <div v-for="branch in branchStore.branchList" :key="branch.user_id" class="flex items-center justify-between p-5 bg-white border border-zinc-100 rounded-2xl shadow-sm hover:shadow-md transition-all">
                    <div class="flex items-center gap-4"><div class="w-10 h-10 bg-red-50 text-red-800 rounded-xl flex items-center justify-center font-bold text-sm">{{ branch.name.charAt(0) }}</div><div><p class="font-bold text-zinc-900">{{ branch.name }}</p><p class="text-xs font-mono text-zinc-400">ID: {{ branch.username }}</p></div></div>
                    <div class="flex items-center gap-4"><span class="px-3 py-1 bg-zinc-50 text-zinc-500 text-[10px] font-bold uppercase tracking-widest rounded-lg">{{ branch.role }}</span><button v-if="branch.role !== 'admin'" @click="branchStore.deleteBranch(branch.user_id)" class="w-8 h-8 flex items-center justify-center bg-zinc-50 text-zinc-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"><Trash2 size="16" /></button></div>
                </div>
            </div>
        </div>
    </main>

    <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" @click="showProductModal = false"></div>
        <div class="relative w-full max-w-lg bg-white rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div class="flex justify-between items-center mb-6"><h3 class="font-black text-2xl text-zinc-900 tracking-tight">{{ isEditing ? 'Edit Item' : 'New Item' }}</h3><button @click="showProductModal = false" class="p-2 bg-zinc-50 rounded-full hover:bg-red-50 hover:text-red-600 transition-colors"><X size="20"/></button></div>
            <form @submit.prevent="handleSubmit" class="space-y-5">
                <div class="flex gap-4">
                    <div class="w-24 h-24 bg-zinc-50 rounded-2xl border border-dashed border-zinc-300 flex items-center justify-center overflow-hidden relative cursor-pointer hover:border-red-800 transition-colors">
                        <img v-if="productForm.image_url" :src="productForm.image_url" class="w-full h-full object-cover" />
                        <div v-else class="text-center"><UploadCloud size="24" class="mx-auto text-zinc-400 mb-1"/><span class="text-[8px] font-bold uppercase text-zinc-400">Upload</span></div>
                        <input type="file" @change="handleFileUpload" class="absolute inset-0 opacity-0 cursor-pointer"/>
                        <div v-if="isUploading" class="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 class="animate-spin text-red-800"/></div>
                    </div>
                    <div class="flex-1 space-y-3">
                        <input v-model="productForm.name" class="w-full border-b border-zinc-200 py-2 text-lg font-bold text-zinc-900 placeholder-zinc-300 focus:border-red-800 outline-none transition-colors" placeholder="Product Name" required />
                        <div class="flex gap-3">
                            <div class="flex-1 relative"><span class="absolute left-0 top-2 text-zinc-400 font-mono text-sm">$</span><input v-model.number="productForm.price" type="number" step="0.01" class="w-full pl-4 border-b border-zinc-200 py-2 font-mono font-bold text-zinc-900 focus:border-red-800 outline-none" placeholder="0.00" required /></div>
                            <select v-model.number="productForm.category_id" class="flex-1 border-b border-zinc-200 py-2 text-sm font-medium text-zinc-700 focus:border-red-800 outline-none bg-transparent"><option :value="1">Hot Coffee</option><option :value="2">Iced Coffee</option><option :value="3">Pastries</option></select>
                        </div>
                    </div>
                </div>

                <div class="bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3 block">Product Options</label>
                    <div class="flex gap-2 mb-3">
                        <input v-model="newOptionName" placeholder="Name (e.g. Sugar)" class="flex-1 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-red-800 outline-none"/>
                        <input v-model="newOptionValues" placeholder="Values (0%, 50%)" class="flex-2 bg-white border border-zinc-200 rounded-lg px-3 py-2 text-xs font-medium focus:border-red-800 outline-none"/>
                        <button type="button" @click="addOptionGroup" class="bg-zinc-900 text-white p-2 rounded-lg hover:bg-red-800 transition-colors"><Plus size="16"/></button>
                    </div>
                    <div class="flex flex-wrap gap-2"><div v-for="(opt, i) in productForm.options" :key="i" class="bg-white border border-zinc-200 px-3 py-1.5 rounded-lg flex items-center gap-2 shadow-sm"><span class="text-[10px] font-bold uppercase text-zinc-700">{{ opt.name }}</span><button type="button" @click="removeOptionGroup(i)" class="text-red-400 hover:text-red-600"><X size="12"/></button></div></div>
                </div>

                <div class="flex justify-between items-center pt-2">
                    <label class="flex items-center gap-2 cursor-pointer"><input type="checkbox" v-model="productForm.is_available" class="w-5 h-5 accent-red-800 rounded"/><span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Available for Sale</span></label>
                    <button type="submit" class="bg-red-800 text-white px-8 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-red-900 transition-colors shadow-lg shadow-red-200">Save Item</button>
                </div>
            </form>
        </div>
    </div>
  </div>
</template>