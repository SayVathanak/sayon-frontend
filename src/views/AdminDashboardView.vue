<script setup>
import { onMounted, reactive, ref, computed, watch } from 'vue';
import { useAuthStore } from '../stores/auth';
import { useBranchStore } from '../stores/branches';
import apiClient from '../services/api';
import CategoryManager from '../components/admin/CategoryManager.vue';
import ProductManager from '../components/admin/ProductManager.vue';
import { useRouter } from 'vue-router';
import {
    LayoutDashboard, ShoppingBag, Store, LogOut, Menu, Layers,
    TrendingUp, DollarSign, ShoppingCart, Calendar, Filter, ChevronRight, Plus, Trash2
} from 'lucide-vue-next';

const auth = useAuthStore();
const branchStore = useBranchStore();
const router = useRouter();

// --- CONFIG ---
const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'category', icon: Layers, label: 'Categories' },
    { id: 'products', icon: ShoppingBag, label: 'Inventory' },
    { id: 'settings', icon: Store, label: 'Branches' }
];

// --- STATE ---
const activeTab = ref('dashboard');
const isMobileMenuOpen = ref(false);
const sidebarCollapsed = ref(false);

// Analytics
const reportPeriod = ref('today');
const reportBranch = ref('all');
const customStartDate = ref(new Date().toISOString().split('T')[0]);
const customEndDate = ref(new Date().toISOString().split('T')[0]);
const salesReport = ref([]);
const branchStats = ref([]);
const stats = reactive({ totalSales: 0, totalOrders: 0 });
const isReportLoading = ref(false);

// Branch Management
const newBranch = reactive({ username: '', password: '', name: '' });

// --- COMPUTED ---
const averageOrderValue = computed(() => {
    return stats.totalOrders > 0 ? (stats.totalSales / stats.totalOrders).toFixed(2) : '0.00';
});

// Smart Revenue Display: Switches between Global Total and Branch Specific Total
const displayedRevenue = computed(() => {
    // 1. If "All Branches" is selected, use the global stats
    if (reportBranch.value === 'all') {
        return stats.totalSales;
    }
    // 2. If a specific branch is selected, try to get the number from the Branch Stats
    if (branchStats.value.length > 0) {
        return branchStats.value.reduce((sum, b) => sum + Number(b.total_revenue || 0), 0);
    }
    // 3. Fallback
    return stats.totalSales;
});

const periodLabel = computed(() => {
    // Make sure the closing brace '}' is AFTER 'Custom Range'
    const labels = { 
        today: 'Today', 
        week: 'This Week', 
        month: 'This Month',
        custom: 'Custom Range' 
    }; 
    return labels[reportPeriod.value] || 'Today';
});

// --- WATCHERS ---
watch([reportPeriod, reportBranch, customStartDate, customEndDate], () => {
    // If custom is selected but dates are empty, don't fetch yet
    if (reportPeriod.value === 'custom' && (!customStartDate.value || !customEndDate.value)) {
        return;
    }
    fetchStats();
    fetchSalesReport();
    fetchBranchPerformance();
});

watch(activeTab, () => {
    isMobileMenuOpen.value = false;
});

// --- LIFECYCLE ---
onMounted(() => {
    if (auth.user?.role !== 'admin' && !auth.user) {
        router.push({ name: 'login' });
        return;
    }
    branchStore.fetchBranches();
    fetchStats();
    fetchSalesReport();
    fetchBranchPerformance();
});

// New helper to generate params for all 3 API calls
function getApiParams() {
    const params = {
        period: reportPeriod.value,
        branch_id: reportBranch.value
    };

    // If custom, attach specific dates
    if (reportPeriod.value === 'custom') {
        params.start_date = customStartDate.value;
        params.end_date = customEndDate.value;
    }

    return params;
}

// --- API ACTIONS ---
async function fetchStats() {
    try {
        const res = await apiClient.get('/stats', { params: getApiParams() });
        Object.assign(stats, res.data);
    } catch (err) { console.error(err); }
}

async function fetchSalesReport() {
    isReportLoading.value = true;
    try {
        const res = await apiClient.get('/stats/sales-report', { params: getApiParams() });
        salesReport.value = res.data;
    } catch (err) {
        console.error("Report error:", err);
    } finally {
        isReportLoading.value = false;
    }
}

async function fetchBranchPerformance() {
    try {
        const res = await apiClient.get('/stats/branches', { params: getApiParams() });
        branchStats.value = res.data;
    } catch (err) { console.error(err); }
}

async function handleCreateBranch() {
    if (!newBranch.username || !newBranch.password || !newBranch.name) return alert("Fill all fields.");
    try {
        await branchStore.addBranch(newBranch);
        Object.assign(newBranch, { username: '', password: '', name: '' });
    } catch (err) {
        alert(err.message);
    }
}

function handleLogout() {
    auth.logout();
    router.push({ name: 'login' });
}
</script>

<template>
    <div
        class="flex h-screen bg-[#FAFAFA] text-slate-900 font-sans overflow-hidden selection:bg-[#AA2B1D] selection:text-white">

        <div
            class="md:hidden fixed top-0 w-full bg-white border-b border-gray-100 z-30 px-4 py-3 flex justify-between items-center">
            <h1 class="font-medium text-xl tracking-tight font-preahvihear">សាយ័ណ្ហកាហ្វេ</h1>
            <button @click="isMobileMenuOpen = true" class="p-2 text-gray-600 active:bg-gray-100 rounded-lg">
                <Menu size="20" />
            </button>
        </div>

        <div v-if="isMobileMenuOpen" @click="isMobileMenuOpen = false"
            class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden animate-in fade-in"></div>

        <aside :class="[
            'bg-white border-r border-gray-100 flex flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1.0)]',
            'fixed top-0 bottom-0 left-0 h-full md:relative shadow-xl md:shadow-none',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            sidebarCollapsed ? 'w-64 md:w-20' : 'w-64'
        ]">
            <div class="h-20 flex items-center justify-between px-6 border-b border-gray-50/50">
                <div v-if="!sidebarCollapsed" class="flex flex-col animate-in fade-in duration-300 origin-left">
                    <span class="font-medium text-xl leading-none font-preahvihear text-slate-800">សាយ័ណ្ហ<span
                            class="text-[#AA2B1D]">កាហ្វេ</span></span>
                    <span class="text-[10px] font-semibold text-gray-400 uppercase tracking-[0.2em] mt-1.5">Admin
                        Console</span>
                </div>

                <div v-else class="w-full flex justify-center">
                    <div
                        class="w-10 h-10 bg-[#AA2B1D] rounded-xl flex items-center justify-center text-white shadow-lg ">
                        <span class="font-preahvihear text-lg">ស</span>
                    </div>
                </div>

                <button @click="sidebarCollapsed = !sidebarCollapsed"
                    class="hidden md:flex text-gray-400 hover:text-slate-800 transition-colors absolute -right-3 top-8 bg-white border border-gray-100 rounded-full p-1 shadow-sm z-50">
                    <ChevronRight size="14" :class="{ 'rotate-180': !sidebarCollapsed }"
                        class="transition-transform duration-300" />
                </button>
            </div>

            <nav class="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
                <template v-for="item in menuItems" :key="item.id">
                    <button @click="activeTab = item.id" :class="[
                        'w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative',
                        activeTab === item.id
                            ? 'bg-[#AA2B1D] text-white shadow-lg '
                            : 'text-slate-500 hover:bg-gray-50 hover:text-slate-900',
                        sidebarCollapsed ? 'justify-center' : ''
                    ]">
                        <component :is="item.icon" :size="20" :stroke-width="2"
                            :class="activeTab === item.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-700'" />
                        <span v-if="!sidebarCollapsed" class="animate-in fade-in duration-200">{{ item.label }}</span>

                        <div v-if="sidebarCollapsed"
                            class="absolute left-full ml-4 bg-slate-800 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 pointer-events-none whitespace-nowrap z-50 shadow-xl">
                            {{ item.label }}
                            <div
                                class="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 border-4 border-transparent border-r-slate-800">
                            </div>
                        </div>
                    </button>
                </template>
            </nav>

            <div class="p-4 border-t border-gray-50">
                <div v-if="!sidebarCollapsed"
                    class="bg-gray-50 rounded-xl p-3 mb-3 flex items-center gap-3 border border-gray-100">
                    <div
                        class="w-9 h-9 rounded-full bg-white border border-gray-200 text-[#AA2B1D] flex items-center justify-center font-medium text-sm shadow-sm">
                        {{ auth.userName?.charAt(0).toUpperCase() || 'A' }}
                    </div>
                    <div class="overflow-hidden flex-1">
                        <p class="text-sm font-semibold text-slate-800 truncate">{{ auth.userName || 'Admin' }}</p>
                        <p class="text-[10px] text-gray-500 font-medium">Super User</p>
                    </div>
                </div>

                <button @click="handleLogout"
                    :class="['w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:bg-red-50 hover:text-[#AA2B1D] transition-colors text-sm font-medium group', sidebarCollapsed ? 'justify-center' : '']">
                    <LogOut size="20" class="group-hover:stroke-[#AA2B1D] transition-colors" />
                    <span v-if="!sidebarCollapsed">Sign Out</span>
                </button>
            </div>
        </aside>

        <main class="flex-1 flex flex-col h-full overflow-hidden relative w-full">
            <div class="flex-1 overflow-y-auto p-4 md:p-8 pt-20 md:pt-8 space-y-6 scrollbar-hide">

                <div v-if="activeTab === 'dashboard'"
                    class="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">

                    <div class="flex flex-col xl:flex-row justify-between items-end xl:items-center gap-4">
                        <div>
                            <h2 class="text-2xl font-medium text-slate-900">Dashboard</h2>
                            <p class="text-gray-500 text-sm mt-1">
                                Overview for <span class="font-medium text-[#AA2B1D] capitalize">{{ periodLabel
                                    }}</span>
                            </p>
                        </div>

                        <div class="flex flex-col sm:flex-row gap-3 items-end sm:items-center">

                            <div v-if="reportPeriod === 'custom'"
                                class="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
                                <input type="date" v-model="customStartDate"
                                    class="text-xs font-semibold bg-transparent outline-none px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg text-slate-700 transition-colors border-none" />
                                <span class="flex items-center text-gray-400 px-1">to</span>
                                <input type="date" v-model="customEndDate"
                                    class="text-xs font-semibold bg-transparent outline-none px-3 py-2 cursor-pointer hover:bg-gray-50 rounded-lg text-slate-700 transition-colors border-none" />
                            </div>

                            <div class="flex bg-white rounded-xl border border-gray-200 p-1 gap-1 shadow-sm">
                                <div class="relative">
                                    <select v-model="reportPeriod"
                                        class="text-xs font-semibold bg-transparent outline-none pl-3 pr-8 py-2 cursor-pointer hover:bg-gray-50 rounded-lg text-slate-700 appearance-none transition-colors">
                                        <option value="today">Today</option>
                                        <option value="week">This Week</option>
                                        <option value="month">This Month</option>
                                        <option value="custom">Custom Range</option>
                                    </select>
                                    <Calendar
                                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                        size="12" />
                                </div>
                                <div class="w-px bg-gray-200 my-1"></div>
                                <div class="relative">
                                    <select v-model="reportBranch"
                                        class="text-xs font-semibold bg-transparent outline-none pl-3 pr-8 py-2 cursor-pointer hover:bg-gray-50 rounded-lg text-slate-700 appearance-none transition-colors">
                                        <option value="all">All Branches</option>
                                        <option v-for="b in branchStore.branchList" :key="b.user_id" :value="b.user_id">
                                            {{
                                            b.name }}
                                        </option>
                                    </select>
                                    <Filter
                                        class="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                                        size="12" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div
                            class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group h-32 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Revenue
                                    </p>
                                    <h3 class="text-3xl font-medium mt-2 text-slate-900 tracking-tight">${{
                                        Number(displayedRevenue).toFixed(2) }}</h3>
                                </div>
                                <div
                                    class="p-2.5 bg-[#AA2B1D]/10 text-[#AA2B1D] rounded-xl group-hover:bg-[#AA2B1D] group-hover:text-white transition-colors">
                                    <DollarSign size="20" />
                                </div>
                            </div>
                            <div class="w-full h-1.5 bg-gray-100 rounded-full mt-auto overflow-hidden">
                                <div class="h-full bg-[#AA2B1D] rounded-full" style="width: 100%"></div>
                            </div>
                        </div>

                        <div
                            class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group h-32 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Total
                                        Orders</p>
                                    <h3 class="text-3xl font-medium mt-2 text-slate-900 tracking-tight">{{
                                        stats.totalOrders }}
                                    </h3>
                                </div>
                                <div
                                    class="p-2.5 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                    <ShoppingCart size="20" />
                                </div>
                            </div>
                            <div class="mt-auto text-xs text-gray-400 flex items-center gap-1">
                                Completed transactions
                            </div>
                        </div>

                        <div
                            class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between group h-32 hover:shadow-md transition-shadow">
                            <div class="flex justify-between items-start">
                                <div>
                                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-widest">Avg.
                                        Order Value
                                    </p>
                                    <h3 class="text-3xl font-medium mt-2 text-slate-900 tracking-tight">${{
                                        averageOrderValue }}
                                    </h3>
                                </div>
                                <div
                                    class="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                                    <TrendingUp size="20" />
                                </div>
                            </div>
                            <div class="mt-auto text-xs text-gray-400">
                                Per customer average
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full min-h-0">

                        <div
                            class="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
                            <div class="p-5 border-b border-gray-50 flex justify-between items-center bg-white z-10">
                                <div>
                                    <h3 class="font-medium text-slate-800">Sale Report</h3>
                                    <p class="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">Manifest for
                                        Period</p>
                                </div>
                                <span v-if="isReportLoading"
                                    class="text-xs text-[#AA2B1D] font-medium animate-pulse">Syncing...</span>
                            </div>

                            <div class="overflow-y-auto flex-1 p-0 scrollbar-thin scrollbar-thumb-gray-200">
                                <table class="w-full text-sm text-left whitespace-nowrap">
                                    <thead
                                        class="bg-gray-50/50 text-gray-400 font-medium text-[10px] uppercase tracking-wider border-b border-gray-100 sticky top-0 z-10 backdrop-blur-sm">
                                        <tr>
                                            <th class="px-6 py-4 bg-gray-50/95">Item Name</th>
                                            <th class="px-6 py-4 text-center bg-gray-50/95">Qty</th>
                                            <th class="px-6 py-4 text-right bg-gray-50/95">Revenue</th>
                                            <th class="px-6 py-4 text-right w-24 bg-gray-50/95">Contrib.</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-50">
                                        <tr v-if="salesReport.length === 0" class="text-center text-gray-400">
                                            <td colspan="4" class="p-12">No sales data found.</td>
                                        </tr>
                                        <tr v-else v-for="(item, idx) in salesReport" :key="idx"
                                            class="group hover:bg-gray-50/50 transition-colors">
                                            <td class="px-6 py-3 font-medium text-slate-800">{{ item.product_name }}
                                            </td>
                                            <td class="px-6 py-3 text-center">
                                                <span
                                                    class="bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-xs font-medium">{{
                                                        item.total_quantity }}</span>
                                            </td>
                                            <td class="px-6 py-3 text-right font-medium text-slate-600">${{
                                                Number(item.total_revenue).toFixed(2) }}</td>
                                            <td class="px-6 py-3 text-right">
                                                <div
                                                    class="w-16 ml-auto h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div class="h-full bg-[#AA2B1D]"
                                                        :style="{ width: `${displayedRevenue > 0 ? (item.total_revenue / displayedRevenue) * 100 : 0}%` }">
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <div
                                class="p-4 bg-gray-50 border-t border-gray-100 flex justify-end items-center gap-4 z-20">
                                <div class="text-right">
                                    <p class="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                                        {{ reportBranch === 'all' ? 'Total Period Revenue' : 'Branch Total' }}
                                    </p>
                                    <div class="flex items-baseline justify-end gap-1">
                                        <span class="text-sm font-medium text-gray-500">USD</span>
                                        <span class="text-3xl font-medium text-slate-900 tracking-tight">
                                            ${{ Number(displayedRevenue).toFixed(2) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div
                            class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[500px]">
                            <div class="p-5 border-b border-gray-50">
                                <h3 class="font-medium text-slate-800">
                                    {{ reportBranch === 'all' ? 'Branch Performance' : 'Branch Summary' }}
                                </h3>
                                <p class="text-xs text-gray-400 mt-1">
                                    {{ reportBranch === 'all' ? 'Revenue Ranking' : 'Selected Location Data' }}
                                </p>
                            </div>

                            <div class="divide-y divide-gray-50 overflow-y-auto">
                                <div v-if="branchStats.length === 0" class="p-8 text-center text-gray-400 text-sm">
                                    No active branches found.
                                </div>

                                <div v-else v-for="(branch, index) in branchStats" :key="index"
                                    class="p-4 flex items-center justify-between group hover:bg-gray-50 transition-colors">
                                    <div class="flex items-center gap-3">
                                        <div
                                            :class="['w-8 h-8 rounded-full flex items-center justify-center font-medium text-xs',
                                                index === 0 ? 'bg-yellow-100 text-yellow-700' :
                                                    index === 1 ? 'bg-gray-100 text-gray-600' :
                                                        index === 2 ? 'bg-orange-50 text-orange-700' : 'bg-white text-gray-400 border border-gray-100']">
                                            #{{ index + 1 }}
                                        </div>
                                        <div>
                                            <p class="font-medium text-slate-800 text-sm">{{ branch.branch_name }}</p>
                                            <p class="text-[10px] text-gray-400">{{ branch.total_orders }} orders</p>
                                        </div>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-medium text-[#AA2B1D] text-sm">${{
                                            Number(branch.total_revenue).toFixed(2) }}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <KeepAlive>
                    <div v-if="activeTab === 'category'">
                        <CategoryManager />
                    </div>
                </KeepAlive>

                <KeepAlive>
                    <div v-if="activeTab === 'products'">
                        <ProductManager />
                    </div>
                </KeepAlive>

                <div v-if="activeTab === 'settings'"
                    class="mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h2 class="text-2xl font-medium text-slate-900">Branch Management</h2>
                            <p class="text-gray-400 text-sm mt-1">Manage access for your POS locations.</p>
                        </div>
                    </div>

                    <div class="bg-black text-white p-6 rounded-2xl shadow-lg shadow-black/10">
                        <h3 class="text-xs font-medium uppercase tracking-widest text-gray-400 mb-4">Register New Branch
                        </h3>
                        <form @submit.prevent="handleCreateBranch"
                            class="flex flex-col md:flex-row gap-4 items-start md:items-end">
                            <div class="w-full">
                                <label class="text-xs font-medium text-gray-400 mb-2 block">Branch Name</label>
                                <input v-model="newBranch.name" type="text" placeholder="e.g. Riverside"
                                    class="w-full bg-white/10 border border-white/10 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#AA2B1D] outline-none transition-all text-white placeholder-gray-500" />
                            </div>
                            <div class="w-full">
                                <label class="text-xs font-medium text-gray-400 mb-2 block">Login ID</label>
                                <input v-model="newBranch.username" type="text" placeholder="user_01"
                                    class="w-full bg-white/10 border border-white/10 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#AA2B1D] outline-none transition-all text-white placeholder-gray-500" />
                            </div>
                            <div class="w-full">
                                <label class="text-xs font-medium text-gray-400 mb-2 block">Password</label>
                                <input v-model="newBranch.password" type="text" placeholder="******"
                                    class="w-full bg-white/10 border border-white/10 px-4 py-2.5 text-sm focus:ring-2 focus:ring-[#AA2B1D] outline-none transition-all text-white placeholder-gray-500" />
                            </div>
                            <button type="submit"
                                class="w-full md:w-auto px-6 py-2.5 bg-[#AA2B1D] hover:bg-[#922216] text-white rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center justify-center gap-2">
                                <Plus size="16" /> Add
                            </button>
                        </form>
                    </div>

                    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div v-for="branch in branchStore.branchList" :key="branch.user_id"
                            class="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between group hover:border-gray-200 transition-colors">
                            <div class="flex items-center gap-4">
                                <div
                                    class="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center font-black text-xl text-gray-300 group-hover:bg-[#AA2B1D] group-hover:text-white transition-colors">
                                    {{ branch.name.charAt(0) }}
                                </div>
                                <div>
                                    <h4 class="font-medium text-slate-900 leading-tight">{{ branch.name }}</h4>
                                    <p class="text-xs text-gray-400 mt-1">ID: {{ branch.username }}</p>
                                </div>
                            </div>
                            <button v-if="branch.role !== 'admin'" @click="branchStore.deleteBranch(branch.user_id)"
                                class="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                                <Trash2 size="18" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </main>
    </div>
</template>