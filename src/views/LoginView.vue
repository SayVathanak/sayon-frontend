<script setup>
import { reactive, ref } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useRouter } from 'vue-router';
import { Loader2, Coffee, ArrowRight } from 'lucide-vue-next';

const auth = useAuthStore();
const router = useRouter();

const form = reactive({ username: '', password: '' });
const isLoading = ref(false);
const errorMsg = ref('');

async function handleLogin() {
    if (!form.username || !form.password) return;
    isLoading.value = true;
    errorMsg.value = '';

    try {
        // 💡 FIX: Pass username and password as separate arguments
        const success = await auth.login(form.username, form.password);
        
        if (success && auth.user) {
            if (auth.user.role === 'admin') {
                router.push({ name: 'admin-dashboard' });
            } else {
                router.push({ name: 'pos-main' });
            }
        } else {
            errorMsg.value = 'Invalid username or password.';
        }
    } catch (err) {
        console.error("Login Failed:", err);
        errorMsg.value = 'Invalid username or password.';
    } finally {
        isLoading.value = false;
    }
}

</script>

<template>
  <div class="min-h-screen w-full flex bg-zinc-50 font-sans selection:bg-red-100 selection:text-red-900">
    
    <div class="hidden lg:flex w-1/2 bg-red-900 relative overflow-hidden items-center justify-center">
        <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
        
        <div class="relative z-10 text-center text-white p-12">
            <div class="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl border border-white/20">
                <Coffee size="48" class="text-white" />
            </div>
            <h1 class="text-5xl font-black tracking-tighter mb-4">SAYON<span class="text-red-300">.POS</span></h1>
            <p class="text-red-200 text-lg max-w-md mx-auto leading-relaxed">
                Manage orders, track inventory, and serve customers with the speed of light.
            </p>
        </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-8 lg:p-24 relative">
        <div class="w-full max-w-md space-y-10">
            
            <div class="text-center lg:text-left">
                <h2 class="text-3xl font-black text-zinc-900 tracking-tight">Welcome Back</h2>
                <p class="text-zinc-500 mt-2 text-sm font-medium">Please enter your branch ID to continue.</p>
            </div>

            <form @submit.prevent="handleLogin" class="space-y-6">
                <div class="space-y-2 group">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-focus-within:text-red-800 transition-colors">Branch ID / Username</label>
                    <input 
                        v-model="form.username" 
                        type="text" 
                        class="w-full bg-transparent border-b-2 border-zinc-200 py-3 text-lg font-bold text-zinc-800 focus:border-red-800 focus:outline-none transition-all placeholder-zinc-300"
                        placeholder="e.g. cashier1"
                        required
                    />
                </div>

                <div class="space-y-2 group">
                    <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-focus-within:text-red-800 transition-colors">Password</label>
                    <input 
                        v-model="form.password" 
                        type="password" 
                        class="w-full bg-transparent border-b-2 border-zinc-200 py-3 text-lg font-bold text-zinc-800 focus:border-red-800 focus:outline-none transition-all placeholder-zinc-300"
                        placeholder="••••••••"
                        required
                    />
                </div>

                <div v-if="errorMsg" class="p-4 bg-red-50 border-l-4 border-red-800 text-red-900 text-xs font-bold rounded-r-md animate-in slide-in-from-left-2">
                    {{ errorMsg }}
                </div>

                <button 
                    type="submit" 
                    :disabled="isLoading"
                    class="w-full h-14 bg-zinc-900 text-white rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-red-800 transition-all duration-300 shadow-lg hover:shadow-red-200 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-3 group"
                >
                    <span v-if="isLoading">Verifying...</span>
                    <span v-else>Sign In</span>
                    <Loader2 v-if="isLoading" class="animate-spin" size="18"/>
                    <ArrowRight v-else class="group-hover:translate-x-1 transition-transform" size="18"/>
                </button>
            </form>

            <p class="text-center text-[10px] text-zinc-400 uppercase tracking-widest">
                Sayon Coffee System v2.0
            </p>
        </div>
    </div>
  </div>
</template>