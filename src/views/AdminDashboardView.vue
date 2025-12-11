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
    Search, Store, MapPin, Loader2, ListPlus, Tag 
} from 'lucide-vue-next';

// --- SETUP ---
const auth = useAuthStore();
const products = useProductStore();
const branchStore = useBranchStore();
const router = useRouter();
const [animationParent] = useAutoAnimate(); 

const activeTab = ref('products'); 
const searchQuery = ref('');
const showProductModal = ref(false); 

// --- STATS ---
const stats = reactive({ totalSales: 0, totalOrders: 0, topProduct: 'Loading...' });
const branchStats = ref([]); 

// --- FORMS ---
const isEditing = ref(false);
const editingId = ref(null);
const statusMessage = ref('');
const isUploading = ref(false);

// 💡 NEW FORM STRUCTURE
const productForm = reactive({
    category_id: 1, 
    name: '', 
    price: 0.00, 
    is_available: true, 
    image_url: '',
    options: [] // 💡 Stores [{ name: 'Sugar', values: ['50%', '100%'] }]
});

// Temp state for adding a new option group
const newOptionName = ref('');
const newOptionValues = ref(''); // Comma separated string

const newBranch = reactive({ username: '', password: '', name: '' });

// --- LIFECYCLE ---
onMounted(() => {
    if (auth.user?.role !== 'admin') { router.push({ name: 'pos-main' }); return; }
    products.fetchAllProducts();
    branchStore.fetchBranches();
    fetchStats();
});

// --- ACTIONS ---
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

function openAddModal() { resetForm(); showProductModal.value = true; }

function startEdit(product) {
    Object.assign(productForm, product);
    // Ensure options is an array (handle database NULL)
    productForm.options = product.options || [];
    productForm.image_url = product.image_url || '';
    
    isEditing.value = true; 
    editingId.value = product.product_id;
    showProductModal.value = true;
}

function resetForm() {
    Object.assign(productForm, { 
        category_id: 1, name: '', price: 0.00, is_available: true, image_url: '', options: [] 
    });
    newOptionName.value = '';
    newOptionValues.value = '';
    isEditing.value = false; editingId.value = null; statusMessage.value = '';
}

// 💡 HELPER: Add Option Group
function addOptionGroup() {
    if (!newOptionName.value || !newOptionValues.value) return;
    
    // Convert "50%, 100%" -> ["50%", "100%"]
    const valuesArray = newOptionValues.value.split(',').map(v => v.trim()).filter(v => v);
    
    productForm.options.push({
        name: newOptionName.value,
        values: valuesArray
    });
    
    newOptionName.value = '';
    newOptionValues.value = '';
}

function removeOptionGroup(index) {
    productForm.options.splice(index, 1);
}

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    isUploading.value = true;
    const formData = new FormData();
    formData.append('file', file);
    try {
        const response = await apiClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        productForm.image_url = response.data.url;
    } catch (err) { alert("Upload failed."); } 
    finally { isUploading.value = false; }
}

async function handleSubmit() {
    statusMessage.value = '';
    try {
        if (isEditing.value) await products.updateProduct(editingId.value, productForm);
        else await products.addProduct(productForm);
        showProductModal.value = false; resetForm();
    } catch (err) { statusMessage.value = `Error: ${err.message}`; }
}

async function handleDeleteProduct(id, name) {
    if (confirm(`Delete ${name}?`)) {
        try { await products.deleteProduct(id); } catch (err) { alert(err.message); }
    }
}

async function handleCreateBranch() {
    if (!newBranch.username || !newBranch.password || !newBranch.name) { alert("Fill all fields."); return; }
    try { await branchStore.addBranch(newBranch); Object.assign(newBranch, {username:'', password:'', name:''}); } 
    catch (err) { alert(err.message); }
}

function handleLogout() { auth.logout(); router.push({ name: 'login' }); }
</script>

<template>
  <div class="flex h-screen bg-white font-sans text-zinc-900 overflow-hidden antialiased">
    <aside class="hidden md:flex flex-col w-64 border-r border-zinc-100 h-full bg-white flex-shrink-0">
        <div class="p-8 pb-12"><h1 class="text-xl font-black uppercase flex items-center gap-2"><div class="w-6 h-6 bg-black text-white flex items-center justify-center rounded-sm">S</div>Sayon Admin</h1></div>
        <nav class="flex-1 px-6 space-y-2">
            <button @click="activeTab = 'dashboard'" :class="activeTab === 'dashboard' ? 'text-black border-black' : 'text-zinc-400 border-transparent hover:text-zinc-600'" class="w-full flex items-center gap-4 py-2 pl-3 border-l-2 text-xs font-bold uppercase tracking-widest transition-all">Dashboard</button>
            <button @click="activeTab = 'products'" :class="activeTab === 'products' ? 'text-black border-black' : 'text-zinc-400 border-transparent hover:text-zinc-600'" class="w-full flex items-center gap-4 py-2 pl-3 border-l-2 text-xs font-bold uppercase tracking-widest transition-all">Inventory</button>
            <button @click="activeTab = 'settings'" :class="activeTab === 'settings' ? 'text-black border-black' : 'text-zinc-400 border-transparent hover:text-zinc-600'" class="w-full flex items-center gap-4 py-2 pl-3 border-l-2 text-xs font-bold uppercase tracking-widest transition-all">Branches</button>
        </nav>
        <div class="p-8"><div class="text-[10px] text-zinc-400 uppercase font-bold tracking-widest mb-1">Logged in as</div><div class="text-sm font-bold uppercase mb-4">{{ auth.userName }}</div><button @click="handleLogout" class="flex items-center gap-2 text-zinc-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest transition-colors"><LogOut size="12" /> Sign Out</button></div>
    </aside>

    <main class="flex-1 overflow-y-auto relative bg-white pb-20 md:pb-0" ref="animationParent">
        <header class="md:hidden bg-white border-b border-zinc-100 p-5 flex justify-between items-center sticky top-0 z-20"><h1 class="font-black uppercase tracking-tight flex items-center gap-2 text-lg">Sayon</h1><button @click="handleLogout"><LogOut size="20" class="text-zinc-400"/></button></header>

        <div v-if="activeTab === 'dashboard'" class="p-6 md:p-12 max-w-7xl mx-auto space-y-12 animate-fade-in">
            <header><h2 class="text-3xl font-black uppercase tracking-tighter">Performance</h2><p class="text-zinc-400 text-xs font-bold uppercase tracking-widest mt-2">Real-time Analytics</p></header>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div class="group"><p class="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-black transition-colors">Total Revenue</p><p class="text-5xl font-thin font-mono tracking-tighter">${{ stats.totalSales.toLocaleString() }}</p></div>
                <div class="group"><p class="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-black transition-colors">Orders Processed</p><p class="text-5xl font-thin font-mono tracking-tighter">{{ stats.totalOrders }}</p></div>
                <div class="group"><p class="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mb-1 group-hover:text-black transition-colors">Top Product</p><p class="text-3xl font-bold mt-2 truncate">{{ stats.topProduct }}</p></div>
            </div>
            <div class="pt-8 border-t border-zinc-100"><h3 class="text-sm font-black uppercase tracking-widest mb-6">Branch Leaderboard</h3>
                <table class="w-full text-left"><thead class="text-zinc-400 uppercase text-[9px] font-bold tracking-widest border-b border-zinc-100"><tr><th class="pb-3 pl-2">#</th><th class="pb-3">Location</th><th class="pb-3 text-right">Orders</th><th class="pb-3 text-right">Revenue</th><th class="pb-3 pl-8 hidden md:table-cell">Graph</th></tr></thead><tbody class="text-sm"><tr v-for="(branch, index) in branchStats" :key="branch.branch_name" class="group border-b border-zinc-50 hover:bg-zinc-50 transition-colors"><td class="py-4 pl-2 font-mono text-zinc-300 group-hover:text-black">0{{ index + 1 }}</td><td class="py-4 font-bold uppercase">{{ branch.branch_name }}</td><td class="py-4 text-right font-mono text-zinc-500">{{ branch.total_orders }}</td><td class="py-4 text-right font-mono font-bold">${{ Number(branch.total_revenue).toFixed(2) }}</td><td class="py-4 pl-8 hidden md:table-cell"><div class="h-1 bg-zinc-100 w-full overflow-hidden"><div class="h-full bg-black transition-all duration-500" :style="{ width: (branch.total_revenue / (branchStats[0]?.total_revenue || 1) * 100) + '%' }"></div></div></td></tr></tbody></table>
            </div>
        </div>

        <div v-if="activeTab === 'products'" class="p-6 md:p-12 max-w-7xl mx-auto space-y-8 animate-fade-in">
            <div class="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-zinc-100 pb-6">
                <div><h2 class="text-3xl font-black uppercase tracking-tighter">Inventory</h2><div class="mt-4 relative"><input v-model="searchQuery" type="text" placeholder="SEARCH ITEMS..." class="w-full md:w-64 border-b border-zinc-200 py-2 text-xs font-bold uppercase tracking-wider focus:outline-none focus:border-black transition-colors placeholder-zinc-300" /></div></div>
                <button @click="openAddModal" class="bg-black text-white px-8 py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors shadow-none rounded-none">+ Add Product</button>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div v-for="product in filteredProducts" :key="product.product_id" class="group relative border border-zinc-100 p-4 transition-colors cursor-pointer bg-white flex flex-col h-full hover:border-black">
                    <div class="aspect-square bg-zinc-50 mb-4 overflow-hidden relative">
                        <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-cover transition-all duration-500" />
                        <div v-else class="w-full h-full flex items-center justify-center text-zinc-200"><Store size="32" /></div>
                        <div class="absolute inset-0 bg-black/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                            <button @click.stop="startEdit(product)" class="text-white hover:text-zinc-300 uppercase text-[9px] font-bold tracking-widest flex flex-col items-center gap-1"><Edit size="16"/> Edit</button>
                            <button @click.stop="handleDeleteProduct(product.product_id, product.name)" class="text-white hover:text-red-500 uppercase text-[9px] font-bold tracking-widest flex flex-col items-center gap-1"><Trash2 size="16"/> Del</button>
                        </div>
                    </div>
                    <div class="flex-1 flex justify-between items-start">
                        <div>
                            <p class="text-xs font-bold uppercase mb-1">{{ product.name }}</p>
                            <p class="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">{{ product.category_name }}</p>
                        </div>
                        <div class="text-right">
                             <p class="text-xs font-mono font-bold">${{ Number(product.price).toFixed(2) }}</p>
                        </div>
                    </div>
                    <div v-if="product.options && product.options.length" class="mt-3 pt-3 border-t border-zinc-50 flex flex-wrap gap-1">
                        <span v-for="opt in product.options" :key="opt.name" class="text-[8px] bg-zinc-100 px-1.5 py-0.5 uppercase tracking-wide text-zinc-500 border border-zinc-200">{{ opt.name }}</span>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="activeTab === 'settings'" class="p-6 md:p-12 max-w-5xl mx-auto space-y-12 animate-fade-in">
            <h2 class="text-3xl font-black uppercase tracking-tighter">Branch Locations</h2>
            <div class="bg-zinc-50 p-8 border border-zinc-100"><h3 class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-6">Register New Location</h3>
                <form @submit.prevent="handleCreateBranch" class="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                    <div class="space-y-2"><label class="text-[9px] font-bold uppercase tracking-widest text-black">Branch ID</label><input v-model="newBranch.username" type="text" class="w-full bg-white border border-zinc-200 p-3 text-xs font-mono focus:border-black focus:outline-none" placeholder="st_230" /></div>
                    <div class="space-y-2"><label class="text-[9px] font-bold uppercase tracking-widest text-black">Password</label><input v-model="newBranch.password" type="text" class="w-full bg-white border border-zinc-200 p-3 text-xs font-mono focus:border-black focus:outline-none" placeholder="******" /></div>
                    <div class="space-y-2"><label class="text-[9px] font-bold uppercase tracking-widest text-black">Display Name</label><input v-model="newBranch.name" type="text" class="w-full bg-white border border-zinc-200 p-3 text-xs font-bold uppercase focus:border-black focus:outline-none" placeholder="SAYON 230" /></div>
                    <button type="submit" class="bg-black text-white h-[42px] px-6 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors">Create</button>
                </form>
            </div>
            <div>
                <div v-for="branch in branchStore.branchList" :key="branch.user_id" class="flex items-center justify-between py-6 border-b border-zinc-100 group">
                    <div class="flex items-center gap-6"><div class="w-10 h-10 bg-zinc-900 text-white flex items-center justify-center font-bold text-xs">{{ branch.name.charAt(0) }}</div><div><p class="font-bold uppercase text-sm">{{ branch.name }}</p><p class="font-mono text-xs text-zinc-400 mt-1">ID: {{ branch.username }}</p></div></div>
                    <div class="flex items-center gap-6"><span class="text-[9px] font-bold uppercase tracking-widest border border-zinc-200 px-2 py-1">{{ branch.role }}</span><button v-if="branch.role !== 'admin'" @click="branchStore.deleteBranch(branch.user_id)" class="text-zinc-300 hover:text-red-600 transition-colors"><Trash2 size="16" /></button></div>
                </div>
            </div>
        </div>
    </main>

    <div v-if="showProductModal" class="fixed inset-0 z-50 flex items-center justify-center p-6 bg-white/90 backdrop-blur-md animate-fade-in">
        <div class="w-full max-w-lg bg-white border border-black p-8 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-h-screen overflow-y-auto">
            <div class="flex justify-between items-center mb-6">
                <h3 class="font-black uppercase tracking-widest text-lg">{{ isEditing ? 'Edit Product' : 'New Product' }}</h3>
                <button @click="showProductModal = false"><X size="24" class="hover:rotate-90 transition-transform"/></button>
            </div>
            
            <form @submit.prevent="handleSubmit" class="space-y-6">
                <div class="flex items-center gap-4">
                    <div class="w-20 h-20 bg-zinc-50 border border-zinc-200 flex items-center justify-center overflow-hidden">
                        <img v-if="productForm.image_url" :src="productForm.image_url" class="w-full h-full object-cover" />
                        <Loader2 v-else-if="isUploading" class="animate-spin text-zinc-400"/>
                        <Store v-else size="24" class="text-zinc-300"/>
                    </div>
                    <div class="flex-1">
                        <label class="block text-[9px] font-bold uppercase tracking-widest mb-2">Product Image</label>
                        <input type="file" @change="handleFileUpload" class="text-xs text-zinc-500 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-[9px] file:font-bold file:uppercase file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200"/>
                    </div>
                </div>

                <div>
                    <label class="block text-[9px] font-bold uppercase tracking-widest mb-2">Name</label>
                    <input v-model="productForm.name" type="text" class="w-full border-b border-zinc-200 py-2 text-sm font-bold uppercase focus:outline-none focus:border-black transition-colors" placeholder="Ex: ICED LATTE" required />
                </div>

                <div class="grid grid-cols-2 gap-6">
                    <div>
                        <label class="block text-[9px] font-bold uppercase tracking-widest mb-2">Price ($)</label>
                        <input v-model.number="productForm.price" type="number" step="0.01" class="w-full border-b border-zinc-200 py-2 text-sm font-mono focus:outline-none focus:border-black transition-colors" required />
                    </div>
                    <div>
                        <label class="block text-[9px] font-bold uppercase tracking-widest mb-2">Category</label>
                        <select v-model.number="productForm.category_id" class="w-full border-b border-zinc-200 py-2 text-sm uppercase focus:outline-none focus:border-black transition-colors bg-white">
                            <option :value="1">Hot Coffee</option>
                            <option :value="2">Iced Coffee</option>
                            <option :value="3">Pastries</option>
                        </select>
                    </div>
                </div>

                <div class="pt-4 border-t border-zinc-50">
                    <label class="block text-[9px] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ListPlus size="14"/> Product Options (Sugar, Ice, etc.)
                    </label>

                    <div class="flex items-end gap-2 mb-4 bg-zinc-50 p-3 border border-zinc-100">
                        <div class="flex-1">
                            <label class="block text-[8px] uppercase tracking-wide text-zinc-400 mb-1">Option Name</label>
                            <input v-model="newOptionName" type="text" placeholder="e.g. Sugar Level" class="w-full bg-white border border-zinc-200 p-2 text-xs focus:border-black outline-none">
                        </div>
                        <div class="flex-[2]">
                            <label class="block text-[8px] uppercase tracking-wide text-zinc-400 mb-1">Values (Comma Separated)</label>
                            <input v-model="newOptionValues" type="text" placeholder="e.g. 0%, 50%, 100%" class="w-full bg-white border border-zinc-200 p-2 text-xs focus:border-black outline-none">
                        </div>
                        <button type="button" @click="addOptionGroup" class="bg-black text-white p-2 hover:bg-zinc-800 transition-colors">
                            <Plus size="16"/>
                        </button>
                    </div>

                    <div class="space-y-2">
                        <div v-for="(opt, idx) in productForm.options" :key="idx" class="flex justify-between items-center border border-zinc-200 p-2 bg-white">
                            <div>
                                <p class="text-[10px] font-bold uppercase">{{ opt.name }}</p>
                                <div class="flex gap-1 mt-1">
                                    <span v-for="val in opt.values" :key="val" class="text-[8px] bg-zinc-100 text-zinc-500 px-1">{{ val }}</span>
                                </div>
                            </div>
                            <button type="button" @click="removeOptionGroup(idx)" class="text-zinc-300 hover:text-red-500"><X size="14"/></button>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-3 pt-4 border-t border-zinc-50">
                    <input type="checkbox" v-model="productForm.is_available" id="avail" class="w-4 h-4 text-black border-zinc-300 rounded-none focus:ring-0 cursor-pointer accent-black">
                    <label for="avail" class="text-[10px] font-bold uppercase tracking-widest cursor-pointer select-none">Available for sale</label>
                </div>

                <button type="submit" class="w-full bg-black text-white py-4 text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors mt-8">
                    {{ isEditing ? 'Save Changes' : 'Create Product' }}
                </button>
            </form>
        </div>
    </div>

    <nav class="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 flex justify-around p-1 z-30 pb-safe">
         <button @click="activeTab = 'dashboard'" :class="activeTab === 'dashboard' ? 'text-black' : 'text-zinc-300'" class="flex flex-col items-center gap-1 p-3 w-full"><LayoutDashboard size="20" /></button>
         <button @click="activeTab = 'products'" :class="activeTab === 'products' ? 'text-black' : 'text-zinc-300'" class="flex flex-col items-center gap-1 p-3 w-full"><ShoppingBag size="20" /></button>
         <button @click="activeTab = 'settings'" :class="activeTab === 'settings' ? 'text-black' : 'text-zinc-300'" class="flex flex-col items-center gap-1 p-3 w-full"><MapPin size="20" /></button>
    </nav>
  </div>
</template>

<style scoped>
.pb-safe { padding-bottom: env(safe-area-inset-bottom); }
</style>