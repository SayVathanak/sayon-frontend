<template>
  <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
      <div class="relative flex-1 w-full md:max-w-md ml-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="16" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        >
      </div>
      
      <button 
        @click="openAddModal"
        class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
      >
        <Plus size="16" /> <span class="hidden sm:inline">New Product</span>
      </button>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-2">
      <button 
        @click="selectedCategory = 'all'"
        :class="[
          'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border',
          selectedCategory === 'all' 
            ? 'bg-slate-800 text-white border-slate-800 shadow-md' 
            : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
        ]"
      >
        All Items
      </button>

      <button 
        v-for="cat in categoryStore.categories" 
        :key="cat.category_id"
        @click="selectedCategory = cat.category_id"
        :class="[
          'px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all border',
          selectedCategory === cat.category_id 
            ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
            : 'bg-white text-slate-500 border-slate-100 hover:bg-slate-50'
        ]"
      >
        {{ cat.name }}
      </button>
    </div>

    <div v-if="productStore.isLoading" class="text-center py-12 text-slate-400 text-sm">Loading inventory...</div>
    <div v-if="productStore.error" class="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm">{{ productStore.error }}</div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div 
        v-for="product in filteredProducts" 
        :key="product.product_id" 
        @click="startEdit(product)"
        class="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative flex flex-col"
      >
        <div class="aspect-3/4 bg-slate-50 rounded-xl mb-3 overflow-hidden relative">
          <img 
            v-if="product.image_url" 
            :src="product.image_url" 
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <Coffee size="24" class="text-slate-300" />
          </div>
          <div v-if="!product.is_available" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
            <span class="bg-slate-800 text-white text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Hidden</span>
          </div>
        </div>

        <div class="flex-1 flex flex-col justify-between">
          <div>
            <h3 class="font-bold text-slate-800 text-sm leading-tight line-clamp-2 mb-1">{{ product.name }}</h3>
            <p class="text-[10px] text-slate-400 font-medium bg-slate-50 inline-block px-1.5 py-0.5 rounded">
              {{ product.category_name || 'No Cat' }}
            </p>
          </div>
          
          <div class="mt-2 flex items-end justify-between">
            <span class="text-sm font-black text-blue-600">${{ Number(product.price).toFixed(2) }}</span>
            <span class="text-[10px] text-slate-400 font-medium">Qty: {{ product.stock_quantity }}</span>
          </div>
        </div>

        <button 
          @click.stop="handleDeleteProduct(product.product_id, product.name)"
          class="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Trash2 size="14" />
        </button>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 animate-in zoom-in-95 duration-200">
        
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-lg font-black text-slate-800">{{ isEditing ? 'Edit Product' : 'New Product' }}</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600 transition-colors">
            <X size="20" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            
            <div class="col-span-2">
              <label :class="labelClass">Product Name</label>
              <input v-model="form.name" type="text" required :class="inputClass" placeholder="e.g. Iced Latte" />
            </div>

            <div class="col-span-1">
              <label :class="labelClass">Category</label>
              <div class="relative">
                <select v-model="form.category_id" required :class="inputClass + ' appearance-none cursor-pointer'">
                  <option :value="null" disabled>Select...</option>
                  <option v-for="cat in categoryStore.categories" :key="cat.category_id" :value="cat.category_id">
                    {{ cat.name }}
                  </option>
                </select>
                <ChevronDown size="14" class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            <div class="col-span-1">
              <label :class="labelClass">Price ($)</label>
              <input v-model.number="form.price" type="number" step="0.01" required :class="inputClass" />
            </div>

            <div>
              <label :class="labelClass">Cost ($)</label>
              <input v-model.number="form.cost_price" type="number" step="0.01" :class="inputClass" />
            </div>
            <div>
              <label :class="labelClass">Stock</label>
              <input v-model.number="form.stock_quantity" type="number" :class="inputClass" />
            </div>

            <div class="col-span-2">
              <label :class="labelClass">Product Image</label>
              <div class="flex items-center gap-3">
                <div class="w-16 h-16 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                   <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover" />
                   <div v-else-if="isUploading" class="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                   <UploadCloud v-else size="20" class="text-slate-300" />
                </div>
                <div class="flex-1">
                   <input 
                      type="file" @change="handleFileUpload" accept="image/*"
                      class="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                   />
                   <button v-if="form.image_url" type="button" @click="form.image_url = ''" class="text-red-500 text-[10px] font-bold mt-1 hover:underline">
                      Remove Image
                   </button>
                </div>
              </div>
            </div>

            <div class="col-span-2 flex items-center gap-2 pt-2">
              <input v-model="form.is_available" type="checkbox" id="avail" class="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
              <label for="avail" class="text-sm font-bold text-slate-700 cursor-pointer select-none">Available for Sale</label>
            </div>
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" @click="closeModal" class="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all">Cancel</button>
            <button type="submit" 
              class="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all disabled:opacity-50"
              :disabled="isSubmitting || isUploading">
              {{ isSubmitting ? 'Saving...' : 'Save Product' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Search, Plus, Coffee, Trash2, X, ChevronDown, UploadCloud } from 'lucide-vue-next';
import { useProductStore } from '../../stores/products';
import { useCategoryStore } from '../../stores/categories';
import apiClient from '../../services/api'; 

// --- Compact Styles (Defined as JS to avoid Tailwind v4 Errors) ---
const inputClass = "w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all";
const labelClass = "block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1"; // 👈 Defined here!

const productStore = useProductStore();
const categoryStore = useCategoryStore();

// --- State ---
const searchQuery = ref('');
const selectedCategory = ref('all');
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const isUploading = ref(false);

const form = reactive({
  product_id: null,
  category_id: null,
  name: '',
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  image_url: '',
  is_available: true
});

onMounted(() => {
  productStore.fetchAllProducts();
  categoryStore.fetchCategories();
});

// --- Filter Logic ---
const filteredProducts = computed(() => {
  let products = productStore.productList;
  if (selectedCategory.value !== 'all') {
    products = products.filter(p => p.category_id === selectedCategory.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    products = products.filter(p => 
      p.name.toLowerCase().includes(query)
    );
  }
  return products;
});

// --- Actions ---
async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
        alert("File too big (Max 5MB)");
        event.target.value = ''; return;
    }

    isUploading.value = true;
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await apiClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        form.image_url = res.data.url;
    } catch (err) {
        alert('Upload failed: ' + (err.response?.data?.error || "Error"));
        event.target.value = ''; 
    } finally { isUploading.value = false; }
}

function resetForm() {
  Object.assign(form, { product_id: null, category_id: null, name: '', price: 0, cost_price: 0, stock_quantity: 0, image_url: '', is_available: true });
}

function openAddModal() { isEditing.value = false; resetForm(); showModal.value = true; }
function startEdit(p) { isEditing.value = true; Object.assign(form, p); showModal.value = true; }
function closeModal() { showModal.value = false; }

async function handleSubmit() {
  if (isUploading.value) return;
  isSubmitting.value = true;
  try {
    if (isEditing.value) await productStore.updateProduct(form.product_id, form);
    else await productStore.addProduct(form);
    closeModal();
  } catch (err) { alert(err.message); } 
  finally { isSubmitting.value = false; }
}

async function handleDeleteProduct(id, name) {
  if(confirm(`Delete "${name}"?`)) {
    try { await productStore.deleteProduct(id); } catch (err) { alert(err.message); }
  }
}
</script>