<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
      <div class="relative flex-1 w-full md:max-w-md ml-2">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size="18" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search inventory..."
          class="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        >
      </div>
      
      <button 
        @click="openAddModal"
        class="bg-blue-600 text-white px-6 py-3 rounded-2xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
      >
        <Plus size="18" /> New Product
      </button>
    </div>

    <div v-if="productStore.isLoading" class="text-center py-12 text-slate-400">Loading inventory...</div>
    <div v-if="productStore.error" class="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">{{ productStore.error }}</div>

    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <div 
        v-for="product in filteredProducts" 
        :key="product.product_id" 
        @click="startEdit(product)"
        class="bg-white p-4 rounded-3xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-xl hover:shadow-blue-900/5 transition-all cursor-pointer group relative border border-slate-100"
      >
        <div class="aspect-square bg-slate-50 rounded-2xl mb-4 overflow-hidden relative">
          <img 
            v-if="product.image_url" 
            :src="product.image_url" 
            class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
          />
          <div v-else class="w-full h-full flex items-center justify-center">
            <Coffee size="32" class="text-slate-300" />
          </div>
          
          <div v-if="!product.is_available" class="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
            <span class="bg-slate-800 text-white text-xs px-2 py-1 rounded-full font-bold">Unavailable</span>
          </div>
        </div>

        <div class="px-1">
          <div class="flex justify-between items-start mb-2">
            <h3 class="font-bold text-slate-900 leading-tight truncate pr-2">{{ product.name }}</h3>
            <span class="text-sm font-black text-blue-600">${{ Number(product.price).toFixed(2) }}</span>
          </div>
          <p class="text-xs text-slate-400 font-medium bg-slate-50 inline-block px-2 py-1 rounded-lg">
            {{ product.category_name || 'Uncategorized' }}
          </p>
        </div>

        <button 
          @click.stop="handleDeleteProduct(product.product_id, product.name)"
          class="absolute top-4 right-4 p-2 bg-white/80 backdrop-blur rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Trash2 size="16" />
        </button>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 animate-in zoom-in-95 duration-200">
        
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-xl font-black text-slate-800">{{ isEditing ? 'Edit Product' : 'New Product' }}</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600 transition-colors">
            <X size="24" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div class="col-span-2">
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Product Name</label>
              <input v-model="form.name" type="text" required 
                class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all"
                placeholder="e.g. Iced Latte" />
            </div>

            <div class="col-span-1">
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Category</label>
              <div class="relative">
                <select v-model="form.category_id" required 
                  class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none appearance-none cursor-pointer">
                  <option :value="null" disabled>Select Category</option>
                  <option v-for="cat in categoryStore.categories" :key="cat.category_id" :value="cat.category_id">
                    {{ cat.name }}
                  </option>
                </select>
                <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size="16" />
                </div>
              </div>
            </div>

            <div class="col-span-1">
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Price ($)</label>
              <input v-model.number="form.price" type="number" step="0.01" required 
                class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
            </div>

            <div>
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Cost ($)</label>
              <input v-model.number="form.cost_price" type="number" step="0.01" 
                class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Stock Qty</label>
              <input v-model.number="form.stock_quantity" type="number" 
                class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
            </div>

            <div class="col-span-2">
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Image URL</label>
              <div class="flex gap-3">
                <input v-model="form.image_url" type="text" placeholder="https://..." 
                  class="flex-1 px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all" />
                <button type="button" @click="form.image_url = ''" 
                  class="px-4 py-3 text-red-500 bg-red-50 hover:bg-red-100 rounded-xl font-bold text-sm transition-colors">
                  Clear
                </button>
              </div>
              <div v-if="form.image_url" class="mt-3">
                <img :src="form.image_url" class="h-20 w-20 object-cover rounded-xl border border-slate-100 shadow-sm" alt="Preview" />
              </div>
            </div>

            <div class="col-span-2">
              <label class="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Description</label>
              <textarea v-model="form.description" rows="3" 
                class="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all resize-none"></textarea>
            </div>

            <div class="col-span-2 flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
              <input v-model="form.is_available" type="checkbox" id="avail" class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" />
              <label for="avail" class="text-sm font-bold text-slate-700 cursor-pointer select-none">Available for Sale</label>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" @click="closeModal" class="px-6 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold transition-all">Cancel</button>
            <button type="submit" 
              class="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              :disabled="isSubmitting">
              {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update Product' : 'Create Product') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Search, Plus, Coffee, Trash2, X, ChevronDown } from 'lucide-vue-next';
import { useProductStore } from '../../stores/products';
import { useCategoryStore } from '../../stores/categories';

// Stores
const productStore = useProductStore();
const categoryStore = useCategoryStore();

// State
const searchQuery = ref('');
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);

const form = reactive({
  product_id: null,
  category_id: null,
  name: '',
  description: '',
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  image_url: '',
  is_available: true
});

// Load Data
onMounted(() => {
  productStore.fetchAllProducts();
  categoryStore.fetchCategories();
});

// Filter Products Logic
const filteredProducts = computed(() => {
  if (!searchQuery.value) return productStore.productList;
  const query = searchQuery.value.toLowerCase();
  return productStore.productList.filter(p => 
    p.name.toLowerCase().includes(query) || 
    (p.category_name && p.category_name.toLowerCase().includes(query))
  );
});

// --- Actions ---

function resetForm() {
  Object.assign(form, {
    product_id: null,
    category_id: null,
    name: '',
    description: '',
    price: 0,
    cost_price: 0,
    stock_quantity: 0,
    image_url: '',
    is_available: true
  });
}

function openAddModal() {
  isEditing.value = false;
  resetForm();
  showModal.value = true;
}

function startEdit(product) {
  isEditing.value = true;
  Object.assign(form, {
    product_id: product.product_id,
    category_id: product.category_id,
    name: product.name,
    description: product.description,
    price: product.price,
    cost_price: product.cost_price,
    stock_quantity: product.stock_quantity,
    image_url: product.image_url,
    is_available: product.is_available
  });
  showModal.value = true;
}

function closeModal() {
  showModal.value = false;
}

async function handleSubmit() {
  isSubmitting.value = true;
  try {
    if (isEditing.value) {
      await productStore.updateProduct(form.product_id, form);
    } else {
      await productStore.addProduct(form);
    }
    closeModal();
  } catch (err) {
    alert("Error: " + err.message);
  } finally {
    isSubmitting.value = false;
  }
}

async function handleDeleteProduct(id, name) {
  if(confirm(`Are you sure you want to delete "${name}"?`)) {
    try {
      await productStore.deleteProduct(id);
    } catch (err) {
      alert("Failed to delete: " + err.message);
    }
  }
}
</script>