<template>
  <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-3 bg-white p-3 rounded-2xl shadow-sm border border-slate-100">
      <div class="relative flex-1 w-full md:max-w-md ml-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size="16" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search categories..."
          class="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all"
        >
      </div>
      
      <button 
        @click="openAddModal"
        class="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
      >
        <Plus size="16" /> <span class="hidden sm:inline">New Category</span>
      </button>
    </div>

    <div v-if="store.error" class="p-4 bg-red-50 text-red-600 rounded-2xl border border-red-100 text-sm flex justify-between items-center">
      <span>{{ store.error }}</span>
      <button @click="store.error = null"><X size="16" /></button>
    </div>

    <div v-if="store.isLoading" class="text-center py-12 text-slate-400 text-sm">Loading categories...</div>

    <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      <div 
        v-for="category in filteredCategories" 
        :key="category.category_id" 
        @click="openEditModal(category)"
        class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group relative flex flex-col items-center justify-center text-center gap-3 min-h-[140px]"
      >
        <div class="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
          <Layers size="24" />
        </div>

        <div>
          <h3 class="font-bold text-slate-800 text-sm">{{ category.name }}</h3>
          <p class="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">ID: {{ category.category_id }}</p>
        </div>

        <button 
          @click.stop="confirmDelete(category)"
          class="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Trash2 size="14" />
        </button>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
      <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
        
        <div class="flex justify-between items-center mb-5">
          <h3 class="text-lg font-black text-slate-800">{{ isEditing ? 'Edit Category' : 'New Category' }}</h3>
          <button @click="closeModal" class="text-slate-400 hover:text-slate-600 transition-colors">
            <X size="20" />
          </button>
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label :class="labelClass">Category Name</label>
            <input 
              v-model="form.name" 
              type="text" 
              required 
              :class="inputClass" 
              placeholder="e.g. Coffee"
              ref="nameInput" 
            />
          </div>

          <div class="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" @click="closeModal" class="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-xl text-sm font-bold transition-all">Cancel</button>
            <button type="submit" 
              class="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 shadow-md shadow-blue-200 transition-all disabled:opacity-50"
              :disabled="isSubmitting">
              {{ isSubmitting ? 'Saving...' : 'Save Category' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue';
import { useCategoryStore } from '../../stores/categories'; 
import { Search, Plus, Trash2, X, Layers } from 'lucide-vue-next';
// 1. IMPORT LIBRARIES
import Swal from 'sweetalert2';
import { toast } from 'vue-sonner';

// --- Styles Constants ---
const inputClass = "w-full px-3 py-2 bg-slate-50 border-none rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-100 outline-none transition-all";
const labelClass = "block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1";

const store = useCategoryStore();

// --- State ---
const searchQuery = ref('');
const showModal = ref(false);
const isEditing = ref(false);
const isSubmitting = ref(false);
const nameInput = ref(null);

const form = reactive({
  id: null,
  name: ''
});

onMounted(() => {
  store.fetchCategories();
});

// --- Search Logic ---
const filteredCategories = computed(() => {
  if (!searchQuery.value) return store.categories;
  return store.categories.filter(c => 
    c.name.toLowerCase().includes(searchQuery.value.toLowerCase())
  );
});

// --- Actions ---

function openAddModal() {
  isEditing.value = false;
  form.id = null;
  form.name = '';
  showModal.value = true;
  nextTick(() => nameInput.value?.focus());
}

function openEditModal(category) {
  isEditing.value = true;
  form.id = category.category_id;
  form.name = category.name;
  showModal.value = true;
  nextTick(() => nameInput.value?.focus());
}

function closeModal() {
  showModal.value = false;
  store.error = null;
}

async function handleSubmit() {
  if (!form.name.trim()) return;
  
  isSubmitting.value = true;
  try {
    if (isEditing.value) {
      await store.updateCategory(form.id, form.name);
      toast.success('Category updated successfully!'); // ✅ Toast Success
    } else {
      await store.addCategory(form.name);
      toast.success('Category added successfully!'); // ✅ Toast Success
    }
    closeModal();
  } catch (err) {
    // Keep store error for UI, but also show toast
    toast.error('Failed to save category.'); 
  } finally {
    isSubmitting.value = false;
  }
}

async function confirmDelete(category) {
  // ✅ SWEETALERT CONFIRMATION
  const result = await Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${category.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444', // Red for delete
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Yes, delete it',
      customClass: {
          popup: 'rounded-2xl font-sans',
          title: 'text-slate-800 text-lg font-black',
          confirmButton: 'rounded-xl text-sm font-bold px-4 py-2',
          cancelButton: 'rounded-xl text-sm font-bold px-4 py-2'
      }
  });

  if (result.isConfirmed) {
    try {
      await store.deleteCategory(category.category_id);
      toast.success(`Category "${category.name}" deleted.`); // ✅ Toast Success
    } catch (err) {
      // ✅ Toast Error (Instead of alert)
      toast.error(store.error || 'Cannot delete category. It might contain products.');
    }
  }
}
</script>