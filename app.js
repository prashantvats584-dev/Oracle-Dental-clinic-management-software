/**
 * Oracle Dental Clinic - Management System
 * Vanilla JavaScript Version for GitHub Pages Compatibility
 */

(function() {
    'use strict';

    console.log("Oracle Dental: Initializing application...");

    // --- Configuration & State ---
    const firebaseConfig = {
        projectId: "project-2e7e1bb9-587f-4b84-adf",
        appId: "1:321553103578:web:5b423b8efcbc3cb73403e3",
        apiKey: "AIzaSyD21R4ENu6yHhlxbs96ndGVtbMYLll4AoM",
        authDomain: "project-2e7e1bb9-587f-4b84-adf.firebaseapp.com",
        storageBucket: "project-2e7e1bb9-587f-4b84-adf.firebasestorage.app",
        messagingSenderId: "321553103578"
    };

    const state = {
        currentPage: 'dashboard',
        currentId: null,
        patients: [],
        appointments: [],
        prescriptions: [],
        invoices: [],
        expenses: [],
        loading: true,
        firebaseReady: false
    };

    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: 'layout-dashboard' },
        { id: 'patients', name: 'Patients', icon: 'users' },
        { id: 'appointments', name: 'Appointments', icon: 'calendar' },
        { id: 'prescriptions', name: 'Prescriptions', icon: 'file-text' },
        { id: 'invoices', name: 'Invoices', icon: 'receipt' },
        { id: 'expenses', name: 'Expenses', icon: 'wallet' }
    ];

    // --- Initialization ---
    document.addEventListener('DOMContentLoaded', () => {
        console.log("Oracle Dental: DOM Content Loaded");
        initFirebase();
        initRouter();
        initUI();
        
        // Hide loading screen after a short delay to ensure rendering
        setTimeout(() => {
            const loadingScreen = document.getElementById('loading-screen');
            const appRoot = document.getElementById('app-root');
            if (loadingScreen) loadingScreen.classList.add('hidden');
            if (appRoot) appRoot.classList.remove('hidden');
            console.log("Oracle Dental: App ready");
        }, 800);
    });

    function initFirebase() {
        try {
            if (typeof firebase === 'undefined') {
                throw new Error("Firebase SDK not loaded");
            }
            firebase.initializeApp(firebaseConfig);
            state.db = firebase.firestore();
            state.firebaseReady = true;
            console.log("Oracle Dental: Firebase initialized successfully");
            
            // Start listening to data
            listenToData();
        } catch (error) {
            console.error("Oracle Dental: Firebase initialization failed", error);
            loadMockData();
        }
    }

    function initRouter() {
        const handleRoute = () => {
            const hash = window.location.hash.replace('#/', '') || 'dashboard';
            const parts = hash.split('/');
            state.currentPage = parts[0];
            state.currentId = parts[1] || null;
            
            renderPage();
            updateNavActiveState();
        };

        window.addEventListener('hashchange', handleRoute);
        handleRoute(); // Initial route
    }

    function initUI() {
        renderNav();
        renderMobileNav();
        
        // Mobile menu listeners
        const mobileBtn = document.getElementById('mobile-menu-btn');
        const closeBtn = document.getElementById('close-mobile-menu');
        const overlay = document.getElementById('mobile-overlay');
        const sidebar = document.getElementById('mobile-sidebar');

        const toggleMenu = (open) => {
            if (open) {
                sidebar.classList.remove('-translate-x-full');
                overlay.classList.remove('hidden');
            } else {
                sidebar.classList.add('-translate-x-full');
                overlay.classList.add('hidden');
            }
        };

        if (mobileBtn) mobileBtn.addEventListener('click', () => toggleMenu(true));
        if (closeBtn) closeBtn.addEventListener('click', () => toggleMenu(false));
        if (overlay) overlay.addEventListener('click', () => toggleMenu(false));
        
        // Close menu on nav click
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', () => toggleMenu(false));
        });

        lucide.createIcons();
    }

    // --- Data Management ---
    function listenToData() {
        if (!state.firebaseReady) return;
        
        // Listen to Patients
        state.db.collection('patients').onSnapshot((snapshot) => {
            state.patients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshCurrentPage();
        }, (error) => console.error("Error loading patients:", error));

        // Listen to Appointments
        state.db.collection('appointments').onSnapshot((snapshot) => {
            state.appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshCurrentPage();
        }, (error) => console.error("Error loading appointments:", error));

        // Listen to Prescriptions
        state.db.collection('prescriptions').onSnapshot((snapshot) => {
            state.prescriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshCurrentPage();
        }, (error) => console.error("Error loading prescriptions:", error));

        // Listen to Invoices
        state.db.collection('invoices').onSnapshot((snapshot) => {
            state.invoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshCurrentPage();
        }, (error) => console.error("Error loading invoices:", error));

        // Listen to Expenses
        state.db.collection('expenses').onSnapshot((snapshot) => {
            state.expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            refreshCurrentPage();
        }, (error) => console.error("Error loading expenses:", error));
    }

    function refreshCurrentPage() {
        const pagesToRefresh = ['dashboard', 'patients', 'appointments', 'prescriptions', 'invoices', 'expenses', 'patient-profile'];
        if (pagesToRefresh.includes(state.currentPage)) {
            renderPage();
        }
    }

    function loadMockData() {
        console.log("Oracle Dental: Loading mock data as fallback");
        state.patients = [
            { id: '1', name: 'John Doe', phone: '9876543210', age: 34, gender: 'Male', totalAmount: 5000, paidAmount: 3000, pendingAmount: 2000, address: '123 Main St' },
            { id: '2', name: 'Jane Smith', phone: '9123456789', age: 28, gender: 'Female', totalAmount: 12000, paidAmount: 12000, pendingAmount: 0, address: '456 Oak Ave' },
            { id: '3', name: 'Robert Brown', phone: '9988776655', age: 45, gender: 'Male', totalAmount: 8500, paidAmount: 4000, pendingAmount: 4500, address: '789 Pine Rd' }
        ];
        renderPage();
    }

    // --- Rendering ---
    function renderNav() {
        const container = document.getElementById('nav-links');
        if (!container) return;
        container.innerHTML = navItems.map(item => `
            <a href="#/${item.id}" data-page="${item.id}" class="nav-item flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all hover:bg-gray-50 text-gray-600">
                <i data-lucide="${item.icon}" class="w-5 h-5 mr-3 opacity-70"></i>
                ${item.name}
            </a>
        `).join('');
    }

    function renderMobileNav() {
        const container = document.getElementById('mobile-nav-links');
        if (!container) return;
        container.innerHTML = navItems.map(item => `
            <a href="#/${item.id}" data-page="${item.id}" class="nav-item flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all hover:bg-gray-50 text-gray-600">
                <i data-lucide="${item.icon}" class="w-5 h-5 mr-3 opacity-70"></i>
                ${item.name}
            </a>
        `).join('');
    }

    function updateNavActiveState() {
        document.querySelectorAll('.nav-item').forEach(link => {
            const page = link.getAttribute('data-page');
            if (page === state.currentPage) {
                link.classList.add('bg-blue-50', 'text-blue-700');
                link.classList.remove('text-gray-600', 'hover:bg-gray-50');
            } else {
                link.classList.remove('bg-blue-50', 'text-blue-700');
                link.classList.add('text-gray-600', 'hover:bg-gray-50');
            }
        });
    }

    function renderPage() {
        const container = document.getElementById('page-content');
        if (!container) return;
        container.innerHTML = '';
        
        const pageWrapper = document.createElement('div');
        pageWrapper.className = 'fade-in max-w-7xl mx-auto';
        
        switch (state.currentPage) {
            case 'dashboard':
                renderDashboard(pageWrapper);
                break;
            case 'patients':
                renderPatients(pageWrapper);
                break;
            case 'patient-profile':
                renderPatientProfile(pageWrapper, state.currentId);
                break;
            case 'dental-chart':
                renderDentalChart(pageWrapper, state.currentId);
                break;
            case 'appointments':
                renderAppointments(pageWrapper);
                break;
            case 'prescriptions':
                renderPrescriptions(pageWrapper);
                break;
            case 'invoices':
                renderInvoices(pageWrapper);
                break;
            case 'expenses':
                renderExpenses(pageWrapper);
                break;
            default:
                pageWrapper.innerHTML = `
                    <div class="flex flex-col items-center justify-center py-20">
                        <h2 class="text-3xl font-display text-gray-900">Coming Soon</h2>
                        <p class="mt-2 text-gray-500">The ${state.currentPage} module is currently under development.</p>
                        <a href="#/dashboard" class="mt-6 px-6 py-2 bg-clinic-primary text-white rounded-lg shadow-lg shadow-blue-100">Back to Dashboard</a>
                    </div>
                `;
        }
        
        container.appendChild(pageWrapper);
        lucide.createIcons();
    }

    function renderDashboard(container) {
        const stats = [
            { name: 'Total Patients', value: state.patients.length, icon: 'users', color: 'text-blue-600', bg: 'bg-blue-50' },
            { name: 'Today\'s Appointments', value: state.appointments.filter(a => a.date === new Date().toISOString().split('T')[0]).length, icon: 'calendar', color: 'text-purple-600', bg: 'bg-purple-50' },
            { name: 'Pending Payments', value: '₹' + state.patients.reduce((acc, p) => acc + (p.pendingAmount || 0), 0), icon: 'wallet', color: 'text-orange-600', bg: 'bg-orange-50' }
        ];

        container.innerHTML = `
            <div class="mb-8">
                <h1 class="text-4xl font-display text-gray-900">Good Morning, Dr. Oracle</h1>
                <p class="mt-2 text-gray-500 font-light">Here is what's happening at your clinic today.</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                ${stats.map(stat => `
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div class="flex items-center">
                            <div class="p-3 rounded-xl ${stat.bg} ${stat.color}">
                                <i data-lucide="${stat.icon}" class="w-6 h-6"></i>
                            </div>
                            <div class="ml-4">
                                <p class="text-xs font-bold text-gray-400 uppercase tracking-widest">${stat.name}</p>
                                <p class="text-2xl font-semibold text-gray-900 mt-0.5">${stat.value}</p>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                    <h3 class="text-lg font-semibold text-gray-900">Recent Patients</h3>
                    <a href="#/patients" class="text-sm font-medium text-clinic-primary hover:underline">View All</a>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50/50">
                            <tr>
                                <th class="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                <th class="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                                <th class="px-6 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${state.patients.slice(0, 5).map(p => `
                                <tr class="hover:bg-gray-50/50 transition-colors cursor-pointer" onclick="window.location.hash = '#/patient-profile/${p.id}'">
                                    <td class="px-6 py-4 text-sm font-medium text-gray-900">${p.name}</td>
                                    <td class="px-6 py-4 text-sm text-gray-500">${p.phone}</td>
                                    <td class="px-6 py-4 text-sm font-semibold ${p.pendingAmount > 0 ? 'text-orange-600' : 'text-green-600'}">
                                        ₹${p.pendingAmount || 0}
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderPatients(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-display text-gray-900">Patients</h1>
                <button class="px-6 py-2 bg-clinic-primary text-white rounded-lg shadow-lg shadow-blue-100 flex items-center">
                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i> Add Patient
                </button>
            </div>

            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-gray-50/50">
                            <tr>
                                <th class="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Age/Gender</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contact</th>
                                <th class="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pending Balance</th>
                                <th class="px-6 py-4 text-right text-[10px] font-bold text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-50">
                            ${state.patients.map(p => `
                                <tr class="hover:bg-gray-50/50 transition-colors cursor-pointer" onclick="window.location.hash = '#/patient-profile/${p.id}'">
                                    <td class="px-6 py-4">
                                        <div class="text-sm font-semibold text-gray-900">${p.name}</div>
                                        <div class="text-[10px] text-gray-400 uppercase tracking-tighter">ID: ${p.id.slice(0, 8)}</div>
                                    </td>
                                    <td class="px-6 py-4 text-sm text-gray-500">${p.age}y / ${p.gender}</td>
                                    <td class="px-6 py-4 text-sm text-gray-500">${p.phone}</td>
                                    <td class="px-6 py-4">
                                        <span class="px-3 py-1 rounded-full text-xs font-bold ${p.pendingAmount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-green-50 text-green-700'}">
                                            ₹${p.pendingAmount || 0}
                                        </span>
                                    </td>
                                    <td class="px-6 py-4 text-right">
                                        <button class="p-2 text-gray-400 hover:text-clinic-primary transition-colors">
                                            <i data-lucide="external-link" class="w-4 h-4"></i>
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderPatientProfile(container, id) {
        const patient = state.patients.find(p => p.id === id);
        if (!patient) {
            container.innerHTML = `<div class="py-20 text-center">Patient not found. <a href="#/patients" class="text-blue-600">Back to list</a></div>`;
            return;
        }

        container.innerHTML = `
            <div class="flex items-center mb-8">
                <a href="#/patients" class="p-2 mr-4 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-100">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </a>
                <h1 class="text-4xl font-display text-gray-900">${patient.name}</h1>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <!-- Info Card -->
                <div class="lg:col-span-1 space-y-6">
                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 class="text-lg font-semibold mb-4">Patient Information</h3>
                        <div class="space-y-4">
                            <div>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</p>
                                <p class="text-gray-900">${patient.phone}</p>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Age / Gender</p>
                                <p class="text-gray-900">${patient.age}y / ${patient.gender}</p>
                            </div>
                            <div>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Address</p>
                                <p class="text-gray-900">${patient.address || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <h3 class="text-lg font-semibold mb-4">Quick Actions</h3>
                        <div class="grid grid-cols-1 gap-3">
                            <button onclick="window.location.hash = '#/dental-chart/${patient.id}'" class="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium flex items-center justify-center hover:bg-blue-100 transition-colors">
                                <i data-lucide="activity" class="w-5 h-5 mr-2"></i> Dental Chart
                            </button>
                            <button class="w-full px-4 py-3 bg-purple-50 text-purple-700 rounded-xl font-medium flex items-center justify-center hover:bg-purple-100 transition-colors">
                                <i data-lucide="file-text" class="w-5 h-5 mr-2"></i> New Prescription
                            </button>
                            <button class="w-full px-4 py-3 bg-green-50 text-green-700 rounded-xl font-medium flex items-center justify-center hover:bg-green-100 transition-colors">
                                <i data-lucide="receipt" class="w-5 h-5 mr-2"></i> Create Invoice
                            </button>
                        </div>
                    </div>
                </div>

                <!-- History -->
                <div class="lg:col-span-2 space-y-6">
                    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                        <div class="px-6 py-4 border-b border-gray-50">
                            <h3 class="text-lg font-semibold">Treatment History</h3>
                        </div>
                        <div class="p-6 text-center text-gray-400">
                            <i data-lucide="history" class="w-12 h-12 mx-auto mb-4 opacity-20"></i>
                            <p>No treatment history recorded yet.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    function renderDentalChart(container, id) {
        const patient = state.patients.find(p => p.id === id);
        if (!patient) {
            container.innerHTML = `<div class="py-20 text-center">Patient not found.</div>`;
            return;
        }

        container.innerHTML = `
            <div class="flex items-center mb-8">
                <a href="#/patient-profile/${patient.id}" class="p-2 mr-4 text-gray-400 hover:text-gray-600 bg-white rounded-lg border border-gray-100">
                    <i data-lucide="arrow-left" class="w-5 h-5"></i>
                </a>
                <h1 class="text-4xl font-display text-gray-900">Dental Chart: ${patient.name}</h1>
            </div>

            <div class="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm">
                <div class="grid grid-cols-8 md:grid-cols-16 gap-3 mb-8">
                    ${Array.from({ length: 32 }, (_, i) => {
                        const toothNum = i + 1;
                        return `
                            <div class="flex flex-col items-center">
                                <span class="text-[10px] text-gray-400 mb-1 font-bold">${toothNum}</span>
                                <button class="tooth-btn w-full">
                                    <div class="tooth-icon"></div>
                                </button>
                            </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="p-8 bg-blue-50/50 rounded-2xl border border-dashed border-blue-100 text-center text-blue-600">
                    <i data-lucide="info" class="w-6 h-6 mx-auto mb-2"></i>
                    <p class="font-medium">Click on a tooth to record findings or treatments.</p>
                </div>
            </div>
        `;
    }

    function renderAppointments(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-display text-gray-900">Appointments</h1>
                <button class="px-6 py-2 bg-clinic-primary text-white rounded-lg shadow-lg shadow-blue-100 flex items-center">
                    <i data-lucide="plus" class="w-4 h-4 mr-2"></i> New Appointment
                </button>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <i data-lucide="calendar" class="w-16 h-16 mx-auto mb-4 text-gray-200"></i>
                <p class="text-gray-500">No appointments scheduled for today.</p>
            </div>
        `;
    }

    function renderPrescriptions(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-display text-gray-900">Prescriptions</h1>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <i data-lucide="file-text" class="w-16 h-16 mx-auto mb-4 text-gray-200"></i>
                <p class="text-gray-500">No prescriptions found.</p>
            </div>
        `;
    }

    function renderInvoices(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-display text-gray-900">Invoices</h1>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <i data-lucide="receipt" class="w-16 h-16 mx-auto mb-4 text-gray-200"></i>
                <p class="text-gray-500">No invoices generated yet.</p>
            </div>
        `;
    }

    function renderExpenses(container) {
        container.innerHTML = `
            <div class="flex justify-between items-center mb-8">
                <h1 class="text-4xl font-display text-gray-900">Expenses</h1>
            </div>
            <div class="bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                <i data-lucide="wallet" class="w-16 h-16 mx-auto mb-4 text-gray-200"></i>
                <p class="text-gray-500">No expenses recorded.</p>
            </div>
        `;
    }

})();
