<template>
  <div class="mx-auto flex flex-col-reverse md:flex-row gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
    
    <div class="flex-1 space-y-4">
       <div class="flex items-center gap-3 bg-white p-2 pl-4 rounded-xl border border-gray-100 shadow-sm">
           <Search size="16" class="text-gray-400 shrink-0"/>
           <input v-model="searchQuery" placeholder="Filter categories..." class="w-full bg-transparent text-sm font-medium outline-none placeholder-gray-400 py-2" />
       </div>

       <div class="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
           <div v-if="store.isLoading" class="p-8 text-center flex flex-col items-center text-gray-400">
               <Loader2 class="animate-spin mb-2" size="20"/>
               <span class="text-xs font-medium uppercase tracking-widest">Loading...</span>
           </div>
           
           <div v-else-if="filteredCategories.length === 0" class="p-8 text-center text-gray-400 text-sm">
               No categories found.
           </div>

           <ul v-else class="divide-y divide-gray-50">
               <li v-for="cat in filteredCategories" :key="cat.category_id" 
                   @click="selectCategory(cat)"
                   :class="['flex items-center justify-between p-4 cursor-pointer transition-all hover:bg-gray-50', form.id === cat.category_id ? 'bg-gray-50 ring-1 ring-inset ring-gray-200' : '']">
                   <div class="flex items-center gap-4">
                       <div :class="['w-10 h-10 rounded-xl flex items-center justify-center transition-colors', form.id === cat.category_id ? 'bg-black text-white' : 'bg-[#AA2B1D]/5 text-[#AA2B1D]']">
                           <Layers size="18" />
                       </div>
                       <div>
                           <p class="text-sm font-medium text-slate-900">{{ cat.name }}</p>
                           <p class="text-[10px] text-gray-400 font-mono mt-0.5">ID: {{ cat.category_id }}</p>
                       </div>
                   </div>
                   <ChevronRight size="16" class="text-gray-300" />
               </li>
           </ul>
       </div>
    </div>

    <div class="w-full md:w-80 shrink-0">
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm sticky top-4">
            <div class="flex items-center justify-between mb-6">
                <h3 class="text-lg font-medium text-slate-900">
                    {{ isEditing ? 'Edit Category' : 'New Category' }}
                </h3>
                <button v-if="isEditing" @click="resetForm" class="text-xs font-medium text-gray-400 hover:text-black uppercase tracking-wider">Cancel</button>
            </div>
            
            <form @submit.prevent="handleSubmit" class="space-y-4">
                <div>
                    <label class="text-[10px] font-medium text-gray-400 uppercase tracking-wider ml-1 mb-1 block">Category Name</label>
                    <input v-model="form.name" class="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#AA2B1D]/20 outline-none placeholder-gray-300 text-slate-900" placeholder="e.g. Coffee" required />
                </div>
                
                <div class="flex gap-3 pt-2">
                    <button v-if="isEditing" type="button" @click="confirmDelete" class="flex-1 bg-red-50 text-red-500 py-3 rounded-xl text-xs font-medium hover:bg-red-100 transition-colors uppercase tracking-widest">
                        Delete
                    </button>
                    <button type="submit" :disabled="isSubmitting" class="flex-2 bg-black text-white py-3 rounded-xl text-xs font-medium hover:bg-gray-800 transition-colors uppercase tracking-widest shadow-lg shadow-black/10">
                        {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                    </button>
                </div>
            </form>
            
            <div class="mt-6 p-4 bg-gray-50 rounded-xl">
                <p class="text-[10px] text-gray-500 leading-relaxed">
                    <strong>Tip:</strong> Categories help organize your menu. Deleting a category may hide associated products from the menu filter.
                </p>
            </div>
        </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useCategoryStore } from '../../stores/categories'; 
import { Search, Layers, ChevronRight, Loader2 } from 'lucide-vue-next';
import { toast } from 'vue-sonner';
import Swal from 'sweetalert2';

const store = useCategoryStore();
const searchQuery = ref('');
const isEditing = ref(false);
const isSubmitting = ref(false);

const form = reactive({ id: null, name: '' });

onMounted(() => store.fetchCategories());

const filteredCategories = computed(() => {
  if (!searchQuery.value) return store.categories;
  return store.categories.filter(c => c.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
});

function selectCategory(cat) {
    isEditing.value = true;
    form.id = cat.category_id;
    form.name = cat.name;
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Helpful for mobile
}

function resetForm() {
    isEditing.value = false;
    form.id = null;
    form.name = '';
}

async function handleSubmit() {
  if (!form.name.trim()) return;
  isSubmitting.value = true;
  try {
    if (isEditing.value) {
        await store.updateCategory(form.id, form.name);
        toast.success('Category updated!');
    } else {
        await store.addCategory(form.name);
        toast.success('Category created!');
    }
    resetForm();
  } catch (err) { 
    toast.error('Failed to save category.'); 
  } finally { 
    isSubmitting.value = false; 
  }
}

async function confirmDelete() {
  if(!isEditing.value) return;

  const result = await Swal.fire({
      title: 'Delete Category?',
      text: `Delete "${form.name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#AA2B1D',
      confirmButtonText: 'Yes, delete it'
  });

  if (result.isConfirmed) {
    try {
      await store.deleteCategory(form.id);
      toast.success(`Deleted.`);
      resetForm();
    } catch (err) {
      toast.error(store.error || 'Cannot delete category.');
    }
  }
}
</script>