<template>
    <div class="container mx-auto py-5">
        <!-- Nawigacja -->
        <nav class="flex justify-between mb-5">
            <button @click="currentView = 'user'" class="btn" :class="{'btn-primary': currentView === 'user'}">
                U¿ytkownik
            </button>
            <button @click="currentView = 'admin'" class="btn" :class="{'btn-primary': currentView === 'admin'}">
                Administrator
            </button>
        </nav>

        <!-- Widok U¿ytkownika -->
        <div v-if="currentView === 'user'">
            <h1 class="text-2xl font-bold mb-3">Dostêpne Samochody</h1>
            <ul>
                <li v-for="car in cars"
                    :key="car.id"
                    class="border p-3 my-2 rounded shadow flex items-center justify-between">
                    <div class="flex items-center">
                        <img v-if="car.imagePath" :src="`http://localhost:3000${car.imagePath}`" alt="Zdjêcie auta" class="w-24 h-16 object-cover mr-3" />
                        <span>{{ car.brand }} {{ car.model }} ({{ car.type }}, {{ car.year }}, {{ car.horsepower }} KM)</span>
                    </div>
                    <button v-if="car.available"
                            class="btn btn-success"
                            @click="reserveCar(car)">
                        Rezerwuj
                    </button>
                    <span v-else class="text-gray-500">Zarezerwowane</span>
                </li>
            </ul>
        </div>

        <!-- Widok Administratora -->
        <div v-if="currentView === 'admin'">
            <h1 class="text-2xl font-bold mb-3">Panel Administracyjny</h1>

            <!-- Formularz dodawania samochodu -->
            <form @submit.prevent="addCar" class="mb-5" enctype="multipart/form-data">
                <input v-model="newCar.brand" placeholder="Marka" class="border p-2 mr-2" />
                <input v-model="newCar.model" placeholder="Model" class="border p-2 mr-2" />
                <input v-model="newCar.type" placeholder="Typ" class="border p-2 mr-2" />
                <input v-model="newCar.year" placeholder="Rocznik" type="number" class="border p-2 mr-2" />
                <input v-model="newCar.horsepower" placeholder="KM" type="number" class="border p-2 mr-2" />
                <input type="file" ref="imageFile" class="border p-2 mr-2" />
                <button type="submit" class="btn btn-success">Dodaj samochód</button>
            </form>

            <!-- Lista samochodów -->
            <div v-for="car in cars" :key="car.id" class="border p-3 my-2 rounded shadow">
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
                cars: [],
                newCar: { brand: '', model: '', type: '', year: '', horsepower: '' },
                currentView: 'user',
            };
        },
        async mounted() {
            this.fetchCars();
        },
        methods: {
            async fetchCars() {
                const response = await axios.get('http://localhost:3000/cars');
                this.cars = response.data.map(car => ({
                    ...car,
                    isEditing: false,
                    edit: { ...car },
                }));
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

                await axios.post('http://localhost:3000/cars', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                this.newCar = { brand: '', model: '', type: '', year: '', horsepower: '' };
                this.fetchCars();
            },
            startEdit(car) {
                car.isEditing = true;
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
            async reserveCar(car) {
                car.available = false;
                await axios.put(`http://localhost:3000/cars/${car._id}`, { available: false });
            },
        },
    };
</script>

