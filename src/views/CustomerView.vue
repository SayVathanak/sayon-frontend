<script setup>
import { ref, onMounted, computed } from 'vue';
import { listenForCustomer } from '../services/dualScreen';
import { ShoppingBag, CheckCircle, QrCode } from 'lucide-vue-next';
import QRCode from 'qrcode'; // You might need to run: npm install qrcode

const currentView = ref('summary'); // 'summary', 'payment', 'success'
const cartItems = ref([]);
const total = ref(0);
const qrUrl = ref('');

// Generate a QR code for the specific amount
const generateQR = async (amount) => {
    try {
        // In a real app, this string would come from Bakong (KHQR)
        // For now, we encode a text string
        const text = `KHQR|SAYON|${amount}|USD`;
        qrUrl.value = await QRCode.toDataURL(text);
    } catch (err) {
        console.error(err);
    }
};

onMounted(() => {
    listenForCustomer(async (msg) => {
        if (msg.type === 'UPDATE_CART') {
            cartItems.value = msg.data.items;
            total.value = msg.data.total;
            currentView.value = 'summary';
        } 
        else if (msg.type === 'SHOW_PAYMENT') {
            await generateQR(msg.data.total);
            currentView.value = 'payment';
        } 
        else if (msg.type === 'PAYMENT_SUCCESS') {
            currentView.value = 'success';
            // Auto-reset after 5 seconds
            setTimeout(() => {
                cartItems.value = [];
                total.value = 0;
                currentView.value = 'summary';
            }, 5000);
        }
    });
});
</script>

<template>
  <div class="h-screen w-screen bg-black text-white flex flex-col overflow-hidden font-sans">
    
    <header class="p-8 border-b border-zinc-800 flex justify-between items-center">
        <h1 class="text-3xl font-black tracking-tighter uppercase">Sayon Coffee</h1>
        <div class="text-right">
            <p class="text-zinc-500 text-xs font-bold uppercase tracking-widest">Total Due</p>
            <p class="text-4xl font-mono font-bold">${{ Number(total).toFixed(2) }}</p>
        </div>
    </header>

    <div v-if="currentView === 'summary'" class="flex-1 p-8 flex gap-8">
        <div class="flex-1 bg-zinc-900 rounded-lg p-6 overflow-y-auto">
            <div v-if="cartItems.length === 0" class="h-full flex flex-col items-center justify-center text-zinc-600">
                <ShoppingBag size="64" class="mb-4 opacity-50"/>
                <p class="text-xl font-bold uppercase tracking-widest">Ready to Order</p>
            </div>
            <div v-else class="space-y-4">
                <div v-for="item in cartItems" :key="item.product_id" class="flex justify-between items-center text-xl border-b border-zinc-800 pb-4">
                    <div>
                        <p class="font-bold">{{ item.name }}</p>
                        <p class="text-zinc-500 text-sm font-mono">${{ item.price }} x {{ item.quantity }}</p>
                    </div>
                    <p class="font-mono font-bold">${{ (item.price * item.quantity).toFixed(2) }}</p>
                </div>
            </div>
        </div>
        <div class="w-1/3 bg-zinc-800 rounded-lg flex items-center justify-center">
             <div class="text-center">
                <div class="w-24 h-24 bg-white text-black rounded-full flex items-center justify-center mx-auto mb-4 font-black text-2xl">S</div>
                <p class="font-bold uppercase tracking-widest text-zinc-400">Scan & Pay Available</p>
             </div>
        </div>
    </div>

    <div v-else-if="currentView === 'payment'" class="flex-1 flex flex-col items-center justify-center bg-zinc-900">
        <p class="text-zinc-400 text-sm font-bold uppercase tracking-widest mb-6">Scan with ABA / ACLEDA / Bakong</p>
        <div class="bg-white p-4 rounded-xl">
            <img :src="qrUrl" class="w-64 h-64 object-contain" />
        </div>
        <p class="text-4xl font-mono font-bold mt-8 text-white">${{ Number(total).toFixed(2) }}</p>
        <div class="flex items-center gap-2 mt-4 text-green-500 animate-pulse">
            <QrCode /> <span class="font-bold uppercase">Waiting for payment...</span>
        </div>
    </div>

    <div v-else-if="currentView === 'success'" class="flex-1 flex flex-col items-center justify-center bg-green-600 text-white">
        <CheckCircle size="120" class="mb-8" />
        <h2 class="text-6xl font-black uppercase tracking-tighter mb-4">Thank You!</h2>
        <p class="text-xl font-bold uppercase tracking-widest">Please collect your receipt</p>
    </div>

  </div>
</template>