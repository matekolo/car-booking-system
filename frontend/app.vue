<template>
    <div class="container mx-auto py-5">
        <!-- Nawigacja -->
        <div v-if="currentView === 'home'" class="text-center">
            <h1 class="text-3xl font-bold mb-5">Witaj w systemie rezerwacji samochodów!</h1>
            <button @click="currentView = 'login'" class="btn btn-primary">Zaloguj siê / Zarejestruj</button>
        </div>

        <!-- Logowanie -->
        <div v-else-if="currentView === 'login'" class="border p-5 rounded shadow mx-auto max-w-sm">
            <h2 class="text-xl font-bold mb-3">Logowanie</h2>
            <form @submit.prevent="loginUser">
                <input v-model="loginData.email" placeholder="Email" class="border p-2 mb-2 w-full" type="email" />
                <input v-model="loginData.password" placeholder="Has³o" class="border p-2 mb-2 w-full" type="password" />
                <button type="submit" class="btn btn-primary w-full">Zaloguj</button>
                <button @click="currentView = 'register'" class="btn btn-secondary w-full mt-2">Zarejestruj siê</button>
            </form>
        </div>

        <!-- Rejestracja -->
        <div v-else-if="currentView === 'register'" class="border p-5 rounded shadow mx-auto max-w-sm">
            <h2 class="text-xl font-bold mb-3">Rejestracja</h2>
            <form @submit.prevent="registerUser">
                <input v-model="registerData.email" placeholder="Email" class="border p-2 mb-2 w-full" type="email" />
                <input v-model="registerData.password" placeholder="Has³o" class="border p-2 mb-2 w-full" type="password" />
                <select v-model="registerData.role" class="border p-2 mb-2 w-full">
                    <option value="client">Klient</option>
                    <option value="admin">Administrator</option>
                </select>
                <button type="submit" class="btn btn-primary w-full">Zarejestruj</button>
                <button @click="currentView = 'login'" class="btn btn-secondary w-full mt-2">Wróæ do logowania</button>
            </form>
        </div>

        <!-- Widok u¿ytkownika -->
        <div v-else-if="currentView === 'user'" class="container">
            <nav class="flex justify-between mb-5">
                <button @click="logout" class="btn btn-danger">Wyloguj</button>
            </nav>
            <h1 class="text-2xl font-bold mb-3">Dostêpne Samochody</h1>
            <ul>
                <li v-for="car in cars" :key="car._id" class="border p-3 my-2 rounded shadow flex items-center justify-between">
                    <div class="flex items-center">
                        <img v-if="car.imagePath" :src="`http://localhost:3000${car.imagePath}`" alt="Zdjêcie auta" class="w-24 h-16 object-cover mr-3" />
                        <span>{{ car.brand }} {{ car.model }} ({{ car.type }}, {{ car.year }}, {{ car.horsepower }} KM)</span>
                    </div>
                    <button v-if="car.available" class="btn btn-success" @click="reserveCar(car)">Rezerwuj</button>
                    <span v-else class="text-gray-500">Zarezerwowane</span>
                </li>
            </ul>
        </div>

        <!-- Widok administratora -->
        <div v-else-if="currentView === 'admin'" class="container">
            <nav class="flex justify-between mb-5">
                <button @click="logout" class="btn btn-danger">Wyloguj</button>
            </nav>
            <h1 class="text-2xl font-bold mb-3">Panel Administracyjny</h1>
            <form @submit.prevent="addCar" class="mb-5" enctype="multipart/form-data">
                <input v-model="newCar.brand" placeholder="Marka" class="border p-2 mr-2" />
                <input v-model="newCar.model" placeholder="Model" class="border p-2 mr-2" />
                <input v-model="newCar.type" placeholder="Typ" class="border p-2 mr-2" />
                <input v-model="newCar.year" placeholder="Rocznik" type="number" class="border p-2 mr-2" />
                <input v-model="newCar.horsepower" placeholder="KM" type="number" class="border p-2 mr-2" />
                <input type="file" ref="imageFile" class="border p-2 mr-2" />
                <button type="submit" class="btn btn-success">Dodaj samochód</button>
            </form>
            <div v-for="car in cars" :key="car._id" class="border p-3 my-2 rounded shadow">
                <div v-if="car.isEditing">
                    <input v-model="car.edit.brand" placeholder="Marka" class="border p-1 mr-2" />
                    <input v-model="car.edit.model" placeholder="Model" class="border p-1 mr-2" />
                    <input v-model="car.edit.type" placeholder="Typ" class="border p-1 mr-2" />
                    <input v-model="car.edit.year" placeholder="Rocznik" type="number" class="border p-1 mr-2" />
                    <input v-model="car.edit.horsepower" placeholder="KM" type="number" class="border p-1 mr-2" />
                    <button class="btn btn-success mr-2" @click="saveEdit(car)">Zapisz</button>
                    <button class="btn btn-danger" @click="cancelEdit(car)">Anuluj</button>
                </div>
                <div v-else>
                    <p>{{ car.brand }} {{ car.model }} ({{ car.type }}, {{ car.year }}, {{ car.horsepower }} KM)</p>
                    <button class="btn btn-warning mr-2" @click="startEdit(car)">Edytuj</button>
                    <button class="btn btn-danger" @click="deleteCar(car._id)">Usuñ</button>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    import axios from 'axios';

    export default {
        data() {
            return {
                currentView: 'home',
                loginData: { email: '', password: '' },
                registerData: { email: '', password: '', role: 'client' },
                userRole: null,
                cars: [],
                newCar: { brand: '', model: '', type: '', year: '', horsepower: '' },
            };
        },
        methods: {
            async loginUser() {
                try {
                    const response = await axios.post('http://localhost:3000/login', this.loginData);
                    this.userRole = response.data.role;
                    this.currentView = this.userRole === 'admin' ? 'admin' : 'user';
                    this.fetchCars();
                } catch {
                    alert('Niepoprawny email lub has³o');
                }
            },
            async registerUser() {
                try {
                    await axios.post('http://localhost:3000/register', this.registerData);
                    alert('Rejestracja udana');
                    this.currentView = 'login';
                } catch {
                    alert('B³¹d rejestracji');
                }
            },
            async fetchCars() {
                const response = await axios.get('http://localhost:3000/cars');
                this.cars = response.data.map(car => ({
                    ...car,
                    isEditing: false,
                    edit: { ...car },
                }));
            },
            logout() {
                this.currentView = 'home';
                this.userRole = null;
            },
            async addCar() {
                const formData = new FormData();
                formData.append('brand', this.newCar.brand);
                formData.append('model', this.newCar.model);
                formData.append('type', this.newCar.type);
                formData.append('year', this.newCar.year);
                formData.append('horsepower', this.newCar.horsepower);
                if (this.$refs.imageFile.files[0]) {
                    formData.append('image', this.$refs.imageFile.files[0]);
                }
                await axios.post('http://localhost:3000/cars', formData);
                this.newCar = { brand: '', model: '', type: '', year: '', horsepower: '' };
                this.fetchCars();
            },
            async reserveCar(car) {
                car.available = false;
                await axios.put(`http://localhost:3000/cars/${car._id}`, { available: false });
                this.fetchCars();
            },

            async startEdit(car) {
                car.isEditing = true;
                car.edit = { ...car }; // Kopiowanie danych samochodu do obiektu edycji
            },

            async saveEdit(car) {
                await axios.put(`http://localhost:3000/cars/${car._id}`, car.edit);
                car.isEditing = false;
                this.fetchCars();
            },
            cancelEdit(car) {
                car.isEditing = false;
            },
            async deleteCar(id) {
                await axios.delete(`http://localhost:3000/cars/${id}`);
                this.fetchCars();
            },
        },
        mounted() {
            if (this.userRole) this.fetchCars();
        },
    };
</script>

<style>
    /* Twój styl CSS */
</style>
