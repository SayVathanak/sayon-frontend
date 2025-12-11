<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { User, Lock, Loader2, ArrowRight, Coffee } from 'lucide-vue-next';

const router = useRouter();
const auth = useAuthStore();

const username = ref('cashier1'); 
const password = ref('pos-secure-password'); 

async function handleLogin() {
  const success = await auth.login(username.value, password.value);
  if (success) {
    const destination = auth.user.role === 'admin' ? 'admin-dashboard' : 'pos-main';
    router.push({ name: destination }); 
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-white font-sans">
    
    <div class="hidden lg:flex lg:w-1/2 bg-zinc-900 relative overflow-hidden items-center justify-center">
        <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
        
        <div class="relative z-10 text-center text-white p-12">
            <div class="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 border-white/20 mb-6 bg-white/5 backdrop-blur-sm">
                <Coffee size="40" />
            </div>
            <h1 class="text-6xl font-black tracking-tighter mb-4">SAYON</h1>
            <p class="text-zinc-400 text-lg uppercase tracking-widest">Premium Coffee & Pastry</p>
        </div>
    </div>

    <div class="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative bg-white">
        <div class="w-full max-w-md space-y-10">
            
            <div class="text-center lg:text-left">
                <h2 class="text-3xl font-bold text-zinc-900">Branch Login</h2>
                <p class="mt-2 text-zinc-500">Access the Point of Sale system.</p>
            </div>

            <div v-if="auth.authError" class="p-4 rounded-none border-l-4 border-red-900 bg-red-50 text-red-900 text-sm flex items-center gap-2">
                <span class="font-bold">Error:</span> {{ auth.authError }}
            </div>

            <form @submit.prevent="handleLogin" class="space-y-6">
                <div class="space-y-6">
                    <div class="relative group">
                        <label class="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Username</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                                <User size="18" />
                            </div>
                            <input 
                                id="username"
                                v-model="username"
                                type="text"
                                required
                                class="block w-full pl-10 pr-3 py-3 border-b-2 border-zinc-200 text-zinc-900 placeholder-zinc-300 focus:outline-none focus:border-zinc-900 transition-colors bg-transparent rounded-none"
                            />
                        </div>
                    </div>

                    <div class="relative group">
                        <label class="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Password</label>
                        <div class="relative">
                            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-400">
                                <Lock size="18" />
                            </div>
                            <input
                                id="password"
                                v-model="password"
                                type="password"
                                required
                                class="block w-full pl-10 pr-3 py-3 border-b-2 border-zinc-200 text-zinc-900 placeholder-zinc-300 focus:outline-none focus:border-zinc-900 transition-colors bg-transparent rounded-none"
                            />
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    :disabled="auth.isLoading"
                    class="w-full flex items-center justify-center py-4 px-4 bg-zinc-900 text-white font-bold tracking-wide hover:bg-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zinc-900 transition-all duration-300 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    <Loader2 v-if="auth.isLoading" class="animate-spin mr-2" size="20" />
                    <span v-else class="flex items-center uppercase text-sm">
                        Enter System <ArrowRight size="16" class="ml-2"/>
                    </span>
                </button>
            </form>
        </div>
    </div>
  </div>
</template>