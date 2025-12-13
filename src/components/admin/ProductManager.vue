<template>
  <div class="max-w-7xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
    
    <div class="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
      <div class="relative w-full sm:w-72">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size="16" />
        <input v-model="searchQuery" type="text" placeholder="Search inventory..." 
               class="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm font-medium outline-none transition-all placeholder-gray-400 text-slate-800">
      </div>
      
      <button @click="openAddModal" class="w-full sm:w-auto bg-black text-white px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10">
        <Plus size="18" /> <span>Add Product</span>
      </button>
    </div>

    <div class="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
      <button @click="selectedCategory = 'all'"
        :class="['px-5 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-all', selectedCategory === 'all' ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-black']">
        All Items
      </button>
      <button v-for="cat in categoryStore.categories" :key="cat.category_id" @click="selectedCategory = cat.category_id"
        :class="['px-5 py-2 rounded-full text-xs font-medium whitespace-nowrap border transition-all', selectedCategory === cat.category_id ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-black']">
        {{ cat.name }}
      </button>
    </div>

    <div v-if="productStore.isLoading" class="flex flex-col items-center justify-center py-16 text-gray-300">
        <Loader2 class="animate-spin mb-2" size="24" />
        <p class="text-xs font-medium uppercase tracking-widest">Syncing Inventory...</p>
    </div>

    <div v-else-if="productStore.error" class="p-4 bg-red-50 text-red-600 rounded-xl text-sm text-center border border-red-100">
        {{ productStore.error }}
    </div>

    <template v-else>
        
        <div class="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50/80 text-gray-400 text-[10px] uppercase font-medium tracking-widest border-b border-gray-100">
              <tr>
                <th class="px-6 py-4 w-16">Image</th>
                <th class="px-6 py-4">Product Details</th>
                <th class="px-6 py-4">Category</th>
                <th class="px-6 py-4 text-right">Price</th>
                <th class="px-6 py-4 text-center w-24">Status</th>
                <th class="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr v-for="product in filteredProducts" :key="product.product_id" @click="startEdit(product)" class="hover:bg-gray-50/80 cursor-pointer transition-colors group">
                <td class="px-6 py-3">
                  <div class="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-100">
                    <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-cover" />
                    <Coffee v-else class="w-full h-full p-2.5 text-gray-300" />
                  </div>
                </td>
                <td class="px-6 py-3">
                    <p class="font-medium text-slate-900">{{ product.name }}</p>
                    <p class="text-xs text-gray-400" v-if="product.cost_price > 0">Cost: ${{ product.cost_price }}</p>
                </td>
                <td class="px-6 py-3">
                    <span class="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-medium">{{ product.category_name || 'Uncategorized' }}</span>
                </td>
                <td class="px-6 py-3 text-right font-medium text-slate-900">${{ Number(product.price).toFixed(2) }}</td>
                <td class="px-6 py-3 text-center">
                  <div :class="['w-2.5 h-2.5 rounded-full mx-auto', product.is_available ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-gray-300']"></div>
                </td>
                <td class="px-6 py-3 text-right text-gray-300 group-hover:text-black transition-colors"><MoreHorizontal size="18" /></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="grid grid-cols-2 gap-3 md:hidden">
          <div v-for="product in filteredProducts" :key="product.product_id" @click="startEdit(product)"
            class="bg-white p-3 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-3 relative overflow-hidden active:scale-[0.98] transition-transform">
             <div class="aspect-square bg-gray-50 rounded-xl overflow-hidden relative border border-gray-50">
                <img v-if="product.image_url" :src="product.image_url" class="w-full h-full object-cover" />
                <Coffee v-else class="w-full h-full p-8 text-gray-200" />
                
                <div v-if="!product.is_available" class="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center">
                    <span class="bg-black text-white text-[10px] font-medium px-2 py-1 rounded-lg uppercase">Hidden</span>
                </div>
             </div>
             <div>
                <h3 class="font-medium text-sm truncate text-slate-900 leading-tight">{{ product.name }}</h3>
                <div class="flex justify-between items-center mt-1.5">
                    <span class="text-[10px] text-gray-500 font-medium truncate max-w-[50%]">{{ product.category_name }}</span>
                    <span class="font-medium text-[#AA2B1D] text-sm">${{ product.price }}</span>
                </div>
             </div>
          </div>
        </div>
    </template>

    <div v-if="showModal" class="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-all">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
         <div class="flex justify-between items-center mb-6">
            <div>
                <h3 class="text-xl font-medium text-slate-900">{{ isEditing ? 'Edit Product' : 'New Product' }}</h3>
                <p class="text-xs text-gray-400 font-medium">Manage item details and pricing.</p>
            </div>
            <button @click="closeModal" class="bg-gray-50 p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-black transition-colors"><X size="20" /></button>
         </div>

         <form @submit.prevent="handleSubmit" class="space-y-5">
            <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200 hover:border-gray-400 transition-colors cursor-pointer group" @click="$refs.fileInput.click()">
                <div class="w-20 h-20 rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden relative shrink-0">
                    <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover" />
                    <UploadCloud v-else size="24" class="text-gray-300 group-hover:text-black transition-colors" />
                    <div v-if="isUploading" class="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 class="animate-spin text-[#AA2B1D]" size="20"/></div>
                </div>
                <div class="flex-1 py-1">
                     <input ref="fileInput" type="file" @change="handleFileUpload" accept="image/*" class="hidden" />
                     <p class="text-sm font-medium text-slate-900">Product Image</p>
                     <p class="text-xs text-gray-400 mt-1">Click to upload or drag and drop.</p>
                     <p v-if="form.image_url" class="text-[10px] text-red-500 font-medium mt-2 uppercase hover:underline" @click.stop="form.image_url = ''">Remove Image</p>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div class="col-span-2">
                    <label class="text-[10px] font-medium text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Item Name</label>
                    <input v-model="form.name" placeholder="e.g. Iced Latte" required class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-[#AA2B1D]/20 outline-none placeholder-gray-300 text-slate-900" />
                </div>
                
                <div class="col-span-1">
                    <label class="text-[10px] font-medium text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Category</label>
                    <div class="relative">
                        <select v-model="form.category_id" required class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-[#AA2B1D]/20 outline-none appearance-none text-slate-900 cursor-pointer">
                            <option :value="null" disabled>Select...</option>
                            <option v-for="c in categoryStore.categories" :key="c.category_id" :value="c.category_id">{{ c.name }}</option>
                        </select>
                        <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size="14"/>
                    </div>
                </div>

                <div class="col-span-1">
                    <label class="text-[10px] font-medium text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Price ($)</label>
                    <input v-model.number="form.price" type="number" step="0.01" placeholder="0.00" required class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-[#AA2B1D]/20 outline-none placeholder-gray-300 text-slate-900" />
                </div>

                <div class="col-span-2">
                    <label class="text-[10px] font-medium text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Cost Price (Optional)</label>
                    <input v-model.number="form.cost_price" type="number" step="0.01" placeholder="0.00" class="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm font-medium border-none focus:ring-2 focus:ring-[#AA2B1D]/20 outline-none placeholder-gray-300 text-slate-900" />
                </div>
            </div>

            <div class="flex items-center justify-between pt-4 border-t border-gray-100">
                <label class="flex items-center gap-3 cursor-pointer select-none group">
                    <input v-model="form.is_available" type="checkbox" class="w-5 h-5 rounded border-gray-300 text-black focus:ring-black transition-all cursor-pointer" />
                    <span class="text-sm font-medium text-gray-500 group-hover:text-black transition-colors">Available for Sale</span>
                </label>
                
                <div class="flex gap-3">
                    <button v-if="isEditing" type="button" @click="handleDeleteProduct" class="px-4 py-3 text-red-500 text-xs font-medium hover:bg-red-50 rounded-xl transition-colors">DELETE</button>
                    <button type="submit" :disabled="isSubmitting" class="px-8 py-3 bg-black text-white text-sm font-medium rounded-xl hover:bg-gray-800 disabled:opacity-50 transition-all shadow-lg shadow-black/10">
                        {{ isSubmitting ? 'Saving...' : 'Save Product' }}
                    </button>
                </div>
            </div>
         </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { Search, Plus, Coffee, X, MoreHorizontal, UploadCloud, Loader2, ChevronDown } from 'lucide-vue-next';
import { useProductStore } from '../../stores/products';
import { useCategoryStore } from '../../stores/categories';
import apiClient from '../../services/api'; 
import Swal from 'sweetalert2';
import { toast } from 'vue-sonner';

const productStore = useProductStore();
const categoryStore = useCategoryStore();

const searchQuery = ref('');
const selectedCategory = ref('all');
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const isUploading = ref(false);
const fileInput = ref(null);

const form = reactive({
  product_id: null,
  category_id: null,
  name: '',
  price: 0,
  cost_price: 0,
  image_url: '',
  is_available: true
});

onMounted(() => {
  productStore.fetchAllProducts();
  categoryStore.fetchCategories();
});

const filteredProducts = computed(() => {
  let products = productStore.productList;
  if (selectedCategory.value !== 'all') {
    products = products.filter(p => p.category_id === selectedCategory.value);
  }
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    products = products.filter(p => p.name.toLowerCase().includes(query));
  }
  return products;
});

async function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
        toast.error("File too big! Max size is 5MB.");
        event.target.value = ''; 
        return;
    }

    isUploading.value = true;
    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await apiClient.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        form.image_url = res.data.url;
        toast.success("Image uploaded!");
    } catch (err) {
        toast.error('Upload failed');
        event.target.value = ''; 
    } finally { 
        isUploading.value = false; 
    }
}

function resetForm() {
  Object.assign(form, { 
    product_id: null, category_id: null, name: '', 
    price: 0, cost_price: 0, 
    image_url: '', is_available: true 
  });
}

function openAddModal() { isEditing.value = false; resetForm(); showModal.value = true; }
function startEdit(p) { isEditing.value = true; Object.assign(form, p); showModal.value = true; }
function closeModal() { showModal.value = false; }

async function handleSubmit() {
  if (isUploading.value) return;
  isSubmitting.value = true;
  try {
    if (isEditing.value) {
        await productStore.updateProduct(form.product_id, form);
        toast.success('Product updated!');
    } else {
        await productStore.addProduct(form);
        toast.success('Product added!');
    }
    closeModal();
  } catch (err) { 
    toast.error(err.message || 'Failed to save product');
  } finally { 
    isSubmitting.value = false; 
  }
}

async function handleDeleteProduct() {
    const result = await Swal.fire({
        title: 'Delete Product?',
        text: `Delete "${form.name}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444', 
        cancelButtonColor: '#94a3b8',  
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            await productStore.deleteProduct(form.product_id);
            toast.success('Deleted');
            closeModal();
        } catch (err) {
            toast.error(err.message);
        }
    }
}
</script>