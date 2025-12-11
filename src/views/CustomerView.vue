<script setup>
import { ref, onMounted } from 'vue';
import { listenForCustomer } from '../services/dualScreen';
import { ShoppingBag, CheckCircle, QrCode, Coffee } from 'lucide-vue-next';
import QRCode from 'qrcode'; 

const currentView = ref('summary'); 
const cartItems = ref([]);
const total = ref(0);
const qrUrl = ref('');

const generateQR = async (amount) => {
    try { qrUrl.value = await QRCode.toDataURL(`KHQR|SAYON|${amount}|USD`); } 
    catch (err) { console.error(err); }
};

onMounted(() => {
    listenForCustomer(async (msg) => {
        if (msg.type === 'UPDATE_CART') {
            cartItems.value = msg.data.items;
            total.value = msg.data.total;
            currentView.value = 'summary';
        } else if (msg.type === 'SHOW_PAYMENT') {
            await generateQR(msg.data.total);
            currentView.value = 'payment';
        } else if (msg.type === 'PAYMENT_SUCCESS') {
            currentView.value = 'success';
            setTimeout(() => { cartItems.value = []; total.value = 0; currentView.value = 'summary'; }, 5000);
        }
    });
});
</script>

<template>
  <div class="h-screen w-screen bg-zinc-50 text-zinc-900 flex flex-col overflow-hidden font-sans selection:bg-red-100">
    
    <header class="p-8 border-b border-zinc-100 bg-white flex justify-between items-center shadow-sm z-10">
        <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-red-800 text-white rounded-xl flex items-center justify-center shadow-lg shadow-red-200">
                <Coffee size="24" />
            </div>
            <div>
                <h1 class="text-2xl font-black tracking-tight text-red-950 uppercase">Sayon Coffee</h1>
                <p class="text-xs font-bold text-zinc-400 uppercase tracking-widest">Customer Display</p>
            </div>
        </div>
        <div class="text-right">
            <p class="text-zinc-400 text-xs font-bold uppercase tracking-widest mb-1">Total Due</p>
            <p class="text-5xl font-black text-red-800 tracking-tighter">${{ Number(total).toFixed(2) }}</p>
        </div>
    </header>

    <div class="flex-1 p-8 flex gap-8 relative overflow-hidden">
        
        <div v-if="currentView === 'summary'" class="flex-1 flex gap-8 animate-in fade-in duration-500">
            <div class="flex-1 bg-white rounded-3xl p-8 shadow-sm border border-zinc-100 overflow-y-auto">
                <div v-if="cartItems.length === 0" class="h-full flex flex-col items-center justify-center text-zinc-300 gap-4">
                    <div class="w-32 h-32 bg-zinc-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                        <ShoppingBag size="64" class="text-zinc-200"/>
                    </div>
                    <h2 class="text-3xl font-black text-zinc-300 uppercase tracking-tight">Welcome</h2>
                    <p class="text-sm font-bold uppercase tracking-widest">Ready to take your order</p>
                </div>
                
                <div v-else class="space-y-4">
                    <div v-for="item in cartItems" :key="item.product_id" class="flex justify-between items-start text-xl border-b border-dashed border-zinc-100 pb-4 last:border-0">
                        <div class="flex gap-4">
                            <div class="bg-red-50 text-red-800 font-bold px-3 py-1 rounded-lg text-lg h-fit">{{ item.quantity }}x</div>
                            <div>
                                <p class="font-bold text-zinc-900">{{ item.name }}</p>
                                <p class="text-zinc-400 text-sm font-mono mt-1">${{ item.price }}</p>
                            </div>
                        </div>
                        <p class="font-mono font-bold text-zinc-900">${{ (item.price * item.quantity).toFixed(2) }}</p>
                    </div>
                </div>
            </div>

            <div class="w-1/3 bg-red-800 rounded-3xl flex items-center justify-center relative overflow-hidden shadow-2xl shadow-red-900/20">
                 <div class="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                 <div class="text-center text-white relative z-10 p-8">
                    <h3 class="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">Fresh<br/>Brewed<br/>Daily</h3>
                    <p class="text-red-200 text-sm font-bold uppercase tracking-widest">Taste the difference</p>
                 </div>
            </div>
        </div>

        <div v-else-if="currentView === 'payment'" class="flex-1 flex flex-col items-center justify-center animate-in zoom-in-95 duration-300">
            <div class="bg-white p-10 rounded-[3rem] shadow-2xl border border-zinc-100 text-center max-w-lg w-full relative overflow-hidden">
                <div class="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-red-600 to-red-900"></div>
                <p class="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-8">Scan to Pay</p>
                <div class="bg-zinc-50 p-4 rounded-3xl inline-block mb-8 border border-zinc-100">
                    <img :src="qrUrl" class="w-64 h-64 object-contain mix-blend-multiply" />
                </div>
                <div class="flex items-center justify-center gap-3 text-red-800 animate-pulse">
                    <QrCode size="24"/> <span class="font-bold uppercase tracking-wide">Waiting for payment...</span>
                </div>
            </div>
        </div>

        <div v-else-if="currentView === 'success'" class="flex-1 flex flex-col items-center justify-center bg-green-500 text-white rounded-3xl animate-in zoom-in-90 duration-500 shadow-inner">
            <div class="bg-white text-green-500 w-32 h-32 rounded-full flex items-center justify-center mb-8 shadow-2xl">
                <CheckCircle size="64" stroke-width="4" />
            </div>
            <h2 class="text-6xl font-black uppercase tracking-tighter mb-4">Thank You!</h2>
            <p class="text-xl font-bold uppercase tracking-widest opacity-90">Please collect your receipt</p>
        </div>

    </div>
  </div>
</template>