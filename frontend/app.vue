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
                    <span>{{ car.model }}</span>
                    <!-- Jeœli auto dostêpne, poka¿ przycisk Rezerwacji -->
                    <button v-if="car.available"
                            class="btn btn-success"
                            @click="reserveCar(car)">
                        Rezerwuj
                    </button>
                    <!-- Jeœli auto zarezerwowane, poka¿ komunikat -->
                    <span v-else class="text-gray-500">Zarezerwowane</span>
                </li>
            </ul>
        </div>

        <!-- Widok Administratora -->
        <div v-if="currentView === 'admin'">
            <h1 class="text-2xl font-bold mb-3">Panel Administracyjny</h1>

            <!-- Formularz dodawania samochodu -->
            <form @submit.prevent="addCar" class="mb-5">
                <input v-model="newCarModel" placeholder="Model samochodu" class="border p-2 mr-2" />
                <button type="submit" class="btn btn-success">Dodaj samochód</button>
            </form>

            <!-- Lista samochodów z opcjami administracyjnymi -->
            <div v-for="car in cars" :key="car.id" class="border p-3 my-2 rounded shadow flex items-center justify-between">
                <!-- Tryb Edycji -->
                <div v-if="car.isEditing" class="flex items-center">
                    <input v-model="car.editModel"
                           class="border p-1 mr-2"
                           @input="formatModelInput(car)" />
                    <button class="btn btn-success mr-2" @click="saveEdit(car)">Zapisz</button>
                    <button class="btn btn-danger" @click="cancelEdit(car)">Anuluj</button>
                    <p v-if="car.error" class="text-red-500 ml-2">{{ car.error }}</p>
                </div>

                <!-- Tryb Wyœwietlania -->
                <div v-else class="flex items-center">
                    <p class="mr-2">{{ car.model }}</p>
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
                newCarModel: '',
                currentView: 'user', // Domyœlnie widok u¿ytkownika
            };
        },
        async mounted() {
            this.fetchCars();
        },
        methods: {
            // Pobierz listê samochodów
            async fetchCars() {
                try {
                    const response = await axios.get('http://localhost:3000/cars');
                    this.cars = response.data.map(car => ({
                        ...car,
                        isEditing: false,
                        editModel: car.model,
                        error: null,
                    }));
                } catch (error) {
                    console.error('B³¹d podczas pobierania samochodów:', error);
                }
            },
            // Rozpocznij edycjê
            startEdit(car) {
                car.isEditing = true;
                car.error = null;
            },
            // Formatowanie (wielka litera na pocz¹tku)
            formatModelInput(car) {
                if (car.editModel) {
                    car.editModel = car.editModel.charAt(0).toUpperCase() + car.editModel.slice(1);
                }
            },
            // Zapisz zmiany
            async saveEdit(car) {
                if (!car.editModel.trim()) {
                    car.error = 'Pole nie mo¿e byæ puste!';
                    return;
                }
                car.error = null;

                try {
                    await axios.put(`http://localhost:3000/cars/${car._id}`, { model: car.editModel });
                    car.model = car.editModel; // Aktualizuj model na liœcie
                    car.isEditing = false;
                } catch (error) {
                    console.error('B³¹d podczas zapisywania edycji:', error);
                }
            },
            // Anuluj edycjê
            cancelEdit(car) {
                car.isEditing = false;
                car.error = null;
                car.editModel = car.model; // Przywróæ oryginaln¹ wartoœæ
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
            // Usuwanie samochodu
            async deleteCar(id) {
                try {
                    await axios.delete(`http://localhost:3000/cars/${id}`);
                    this.fetchCars();
                } catch (error) {
                    console.error('B³¹d podczas usuwania samochodu:', error);
                }
            },
            // Rezerwacja samochodu
            async reserveCar(car) {
                try {
                    await axios.put(`http://localhost:3000/cars/${car._id}`, { available: false });
                    car.available = false; // Aktualizacja lokalna
                } catch (error) {
                    console.error('B³¹d podczas rezerwacji samochodu:', error);
                }
            },
        },
    };
</script>
