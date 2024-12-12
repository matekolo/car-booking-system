<template>
    <div class="container mx-auto py-5">
        <h1 class="text-2xl font-bold">Lista samochodów</h1>
        <div v-for="car in cars" :key="car.id" class="border p-3 my-2 rounded shadow">
            <p class="text-lg font-semibold">{{ car.model }}</p>
            <p>
                Status:
                <span :class="car.available ? 'text-green-500' : 'text-red-500'">
                    {{ car.available ? 'Dostêpny' : 'Niedostêpny' }}
                </span>
            </p>
            <button v-if="car.available" class="btn btn-primary" @click="reserveCar(car._id)">
                Zarezerwuj
            </button>
        </div>

        <!-- Panel administracyjny -->
        <div class="mt-10">
            <h2 class="text-xl font-bold">Panel administracyjny</h2>
            <form @submit.prevent="addCar">
                <input v-model="newCarModel" placeholder="Model samochodu" class="border p-2 mr-2" />
                <button type="submit" class="btn btn-success">Dodaj samochód</button>
            </form>
            <div v-for="car in cars" :key="'admin-' + car.id" class="border p-3 my-2 rounded shadow">
                <p class="text-lg font-semibold">{{ car.model }}</p>
                <input v-model="car.model" class="border p-1 mr-2" />
                <button class="btn btn-warning" @click="editCar(car._id, car.model)">Edytuj</button>
                <button class="btn btn-danger" @click="deleteCar(car._id)">Usuñ</button>
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
                newCarModel: '', // Do dodawania nowych samochodów
            };
        },
        async mounted() {
            this.fetchCars();
        },
        methods: {
            // Pobieranie listy samochodów
            async fetchCars() {
                try {
                    const response = await axios.get('http://localhost:3000/cars');
                    this.cars = response.data;
                } catch (error) {
                    console.error('B³¹d podczas pobierania samochodów:', error);
                }
            },
            // Rezerwacja samochodu
            async reserveCar(id) {
                try {
                    await axios.post(`http://localhost:3000/cars/${id}/reserve`);
                    this.fetchCars();
                } catch (error) {
                    console.error('B³¹d podczas rezerwacji samochodu:', error);
                }
            },
            // Dodawanie nowego samochodu
            async addCar() {
                if (!this.newCarModel.trim()) return;
                try {
                    await axios.post('http://localhost:3000/cars', { model: this.newCarModel, available: true });
                    this.newCarModel = '';
                    this.fetchCars();
                } catch (error) {
                    console.error('B³¹d podczas dodawania samochodu:', error);
                }
            },
            // Edytowanie samochodu
            async editCar(id, updatedModel) {
                if (!updatedModel.trim()) return;
                try {
                    await axios.put(`http://localhost:3000/cars/${id}`, { model: updatedModel });
                    this.fetchCars();
                } catch (error) {
                    console.error('B³¹d podczas edytowania samochodu:', error);
                }
            },
            // Usuwanie samochodu
            async deleteCar(id) {
                try {
                    await axios.delete(`http://localhost:3000/cars/${id}`);
                    this.fetchCars();
                } catch (error) {
                    console.error('B³¹d podczas usuwania samochodu:', error);
                }
            },
        },
    };
</script>

<style>
    @import 'bootstrap/dist/css/bootstrap.css';
</style>
