<template>
    <div class="container mx-auto py-5">
        <!-- Logowanie -->
        <div v-if="currentView === 'login'" class="border p-5 rounded shadow mx-auto max-w-sm">
            <h2 class="text-xl font-bold mb-3">Logowanie</h2>
            <form @submit.prevent="loginUser">
                <input v-model="loginData.email" placeholder="Email" class="border p-2 mb-2 w-full" type="email" />
                <input v-model="loginData.password" placeholder="Has³o" class="border p-2 mb-2 w-full" type="password" />
                <button type="submit" class="btn btn-primary w-full">Zaloguj</button>
            </form>
            <button @click="currentView = 'register'" class="btn btn-primary w-full mt-2">Zarejestruj siê</button>
        </div>

        <!-- Rejestracja -->
        <div v-else-if="currentView === 'register'" class="border p-5 rounded shadow mx-auto max-w-sm">
            <h2 class="text-xl font-bold mb-3">Rejestracja</h2>
            <form @submit.prevent="registerUser">
                <input v-model="registerData.email" placeholder="Email" class="border p-2 mb-2 w-full" type="email" />
                <input v-model="registerData.password" placeholder="Has³o" class="border p-2 mb-2 w-full" type="password" />
                <button type="submit" class="btn btn-primary w-full">Zarejestruj</button>
                <button @click="currentView = 'login'" class="btn btn-primary w-full mt-2">Powrót do logowania</button>
            </form>
        </div>

        <!-- Widok u¿ytkownika -->
        <div v-else-if="currentView === 'user'" class="container">
            <h1 class="text-2xl font-bold mb-3">Dostêpne samochody</h1>
            <button @click="logout" class="btn btn-danger mb-5">Wyloguj</button>
            <div v-for="car in cars" :key="car._id" class="border p-3 mb-2 rounded shadow">
                <p>{{ car.brand }} {{ car.model }} ({{ car.year }}, {{ car.horsepower }} KM)</p>
                <img :src="`http://localhost:3000${car.imagePath}`" alt="Zdjêcie auta" class="w-32 h-32 object-cover" />
                <h3 class="font-bold mt-2">Dostêpne terminy:</h3>
                <ul v-if="car.availableDates.length">
                    <li v-for="date in car.availableDates" :key="date">
                        {{ date }}
                        <button @click="reserveCar(car._id, date)" class="btn btn-primary btn-sm ml-2">Zarezerwuj</button>
                    </li>
                </ul>
                <p v-else class="text-red-500 font-bold">Samochód chwilowo niedostêpny.</p>
            </div>
        </div>

        <!-- Widok admina -->
        <div v-else-if="currentView === 'admin'" class="container">
            <h1 class="text-2xl font-bold mb-3">Panel Administracyjny</h1>
            <button @click="logout" class="btn btn-danger mb-5">Wyloguj</button>
            <button @click="currentView = 'reservations'" class="btn btn-secondary mb-5">Zobacz rezerwacje</button>

            <!-- Dodanie nowego pojazdu -->
            <form @submit.prevent="addCar" enctype="multipart/form-data" class="mb-5">
                <input v-model="newCar.brand" placeholder="Marka" class="border p-2 mr-2" />
                <input v-model="newCar.model" placeholder="Model" class="border p-2 mr-2" />
                <input v-model="newCar.year" placeholder="Rok" type="number" class="border p-2 mr-2" />
                <input v-model="newCar.horsepower" placeholder="KM" type="number" class="border p-2 mr-2" />
                <input type="file" ref="imageFile" class="border p-2" />
                <button type="submit" class="btn btn-success">Dodaj pojazd</button>
            </form>

            <div v-for="car in cars" :key="car._id" class="border p-3 my-2 rounded shadow">
                <p>{{ car.brand }} {{ car.model }} ({{ car.year }}, {{ car.horsepower }} KM)</p>
                <img v-if="car.imagePath" :src="`http://localhost:3000${car.imagePath}`" alt="Zdjêcie auta" class="w-32 h-32 object-cover mb-2" />
                <div>
                    <button @click="startEdit(car)" class="btn btn-primary mr-2">Edytuj</button>
                    <button @click="deleteCar(car._id)" class="btn btn-danger">Usuñ</button>
                </div>
                <h3 class="font-bold mt-3">Dostêpne terminy:</h3>
                <ul v-if="car.availableDates.length">
                    <li v-for="date in car.availableDates" :key="date">
                        {{ date }}
                        <button @click="removeDateFromCar(car._id, date)" class="btn btn-warning btn-sm ml-2">Usuñ</button>
                    </li>
                </ul>
                <button @click="openAddDatePanel(car._id)" class="btn btn-secondary mt-2">Dodaj termin</button>
            </div>
        </div>

        <!-- Panel edycji samochodu -->
        <div v-if="editingCar !== null" class="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div class="bg-white p-5 rounded shadow-lg">
                <h3 class="text-lg font-bold mb-3">Edytuj pojazd</h3>
                <form @submit.prevent="saveEdit">
                    <input v-model="editingCar.brand" placeholder="Marka" class="border p-2 mb-2 w-full" />
                    <input v-model="editingCar.model" placeholder="Model" class="border p-2 mb-2 w-full" />
                    <input v-model="editingCar.year" placeholder="Rok" type="number" class="border p-2 mb-2 w-full" />
                    <input v-model="editingCar.horsepower" placeholder="KM" type="number" class="border p-2 mb-2 w-full" />
                    <input type="file" ref="editImageFile" class="border p-2 mb-2 w-full" />
                    <button type="submit" class="btn btn-success w-full">Zapisz zmiany</button>
                    <button @click="cancelEdit" class="btn btn-danger w-full mt-2">Anuluj</button>
                </form>
            </div>
        </div>

        <!-- Panel dodawania terminu -->
        <div v-if="addingDateCarId !== null" class="fixed inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div class="bg-white p-5 rounded shadow-lg">
                <h3 class="text-lg font-bold mb-3">Dodaj termin wynajmu</h3>
                <input v-model="newDate" placeholder="RRRR-MM-DD" class="border p-2 w-full mb-2" />
                <button @click="addDateToCar" class="btn btn-success w-full">Dodaj</button>
                <button @click="closeAddDatePanel" class="btn btn-danger w-full mt-2">Anuluj</button>
            </div>
        </div>

        <!-- Widok rezerwacji -->
        <div v-else-if="currentView === 'reservations'" class="container">
            <h1 class="text-2xl font-bold mb-3">Lista Rezerwacji</h1>
            <button @click="currentView = 'admin'" class="btn btn-primary mb-5">Powrót</button>
            <div v-for="reservation in reservations" :key="reservation._id" class="border p-3 mb-2 rounded shadow">
                <p>Samochód: {{ reservation.carId.brand }} {{ reservation.carId.model }}</p>
                <p>Data rezerwacji: {{ reservation.date }}</p>
                <p>U¿ytkownik: {{ reservation.userId.email }}</p>
                <button @click="deleteReservation(reservation._id)" class="btn btn-danger">Usuñ rezerwacjê</button>
            </div>
        </div>
    </div>
</template>

<script>
    import axios from "axios";

    export default {
        data() {
            return {
                currentView: "login",
                loginData: { email: "", password: "" },
                registerData: { email: "", password: "" },
                cars: [],
                loggedInUserId: null,
                userRole: null,
                newCar: { brand: "", model: "", year: "", horsepower: "" },
                editingCar: null,
                newDate: "",
                addingDateCarId: null,
                reservations: [],
            };
        },
        methods: {
            // Rejestracja u¿ytkownika
            async registerUser() {
                try {
                    if (!this.registerData.email || !this.registerData.password) {
                        alert("Proszê wprowadziæ email i has³o.");
                        return;
                    }

                    const response = await axios.post("http://localhost:3000/register", this.registerData);
                    alert(response.data.message);
                    this.currentView = "login"; // Prze³¹cz na ekran logowania
                } catch (error) {
                    alert(error.response?.data?.message || "B³¹d podczas rejestracji.");
                }
            },

            // Logowanie u¿ytkownika
            async loginUser() {
                try {
                    if (!this.loginData.email || !this.loginData.password) {
                        alert("Proszê wprowadziæ email i has³o.");
                        return;
                    }

                    const response = await axios.post("http://localhost:3000/login", this.loginData);
                    this.loggedInUserId = response.data.userId;
                    this.userRole = response.data.role;
                    this.currentView = this.userRole === "admin" ? "admin" : "user";
                    this.fetchCars(); // Pobierz listê samochodów po zalogowaniu
                } catch (error) {
                    alert(error.response?.data?.message || "B³¹d podczas logowania.");
                }
            },

            // Pobieranie listy samochodów
            async fetchCars() {
                try {
                    const response = await axios.get("http://localhost:3000/cars");
                    this.cars = response.data;
                } catch (error) {
                    alert("B³¹d podczas pobierania listy samochodów.");
                }
            },

            // Rezerwacja samochodu
            async reserveCar(carId, date) {
                try {
                    await axios.post(`http://localhost:3000/cars/${carId}/reserve`, {
                        date,
                        userId: this.loggedInUserId,
                    });
                    alert("Rezerwacja zakoñczona sukcesem.");
                    this.fetchCars();
                } catch (error) {
                    alert("B³¹d podczas rezerwacji.");
                }
            },

            // Pobieranie listy rezerwacji dla admina
            async fetchReservations() {
                try {
                    const response = await axios.get("http://localhost:3000/reservations");
                    this.reservations = response.data;
                } catch (error) {
                    alert("B³¹d podczas pobierania rezerwacji.");
                }
            },

            // Usuwanie rezerwacji
            async deleteReservation(reservationId) {
                try {
                    await axios.delete(`http://localhost:3000/reservations/${reservationId}`);
                    alert("Rezerwacja zosta³a usuniêta.");
                    this.fetchReservations(); // Odœwie¿ listê rezerwacji
                } catch (error) {
                    alert("B³¹d podczas usuwania rezerwacji.");
                }
            },

            // Dodawanie samochodu
            async addCar() {
                try {
                    const formData = new FormData();
                    formData.append("brand", this.newCar.brand);
                    formData.append("model", this.newCar.model);
                    formData.append("year", this.newCar.year);
                    formData.append("horsepower", this.newCar.horsepower);

                    if (this.$refs.imageFile.files[0]) {
                        formData.append("image", this.$refs.imageFile.files[0]);
                    }

                    await axios.post("http://localhost:3000/cars", formData);
                    alert("Samochód zosta³ dodany.");
                    this.fetchCars(); // Odœwie¿ listê samochodów
                    this.newCar = { brand: "", model: "", year: "", horsepower: "" }; // Wyczyœæ formularz
                } catch (error) {
                    alert("B³¹d podczas dodawania samochodu.");
                }
            },

            // Edycja samochodu
            async saveEdit() {
                try {
                    const formData = new FormData();
                    formData.append("brand", this.editingCar.brand);
                    formData.append("model", this.editingCar.model);
                    formData.append("year", this.editingCar.year);
                    formData.append("horsepower", this.editingCar.horsepower);

                    if (this.$refs.editImageFile && this.$refs.editImageFile.files[0]) {
                        formData.append("image", this.$refs.editImageFile.files[0]);
                    }

                    await axios.put(`http://localhost:3000/cars/${this.editingCar._id}`, formData);
                    alert("Samochód zosta³ zaktualizowany.");
                    this.fetchCars(); // Odœwie¿ listê samochodów
                    this.editingCar = null; // Zamknij panel edycji
                } catch (error) {
                    alert("B³¹d podczas edycji samochodu.");
                }
            },

            // Usuwanie samochodu
            async deleteCar(carId) {
                try {
                    await axios.delete(`http://localhost:3000/cars/${carId}`);
                    alert("Samochód zosta³ usuniêty.");
                    this.fetchCars();
                } catch (error) {
                    alert("B³¹d podczas usuwania samochodu.");
                }
            },

            // Dodawanie terminu rezerwacji
            async addDateToCar() {
                if (!this.newDate) {
                    alert("Proszê wprowadziæ datê.");
                    return;
                }
                try {
                    await axios.post(`http://localhost:3000/cars/${this.addingDateCarId}/add-date`, {
                        date: this.newDate,
                    });
                    alert("Termin dodany pomyœlnie.");
                    this.newDate = "";
                    this.addingDateCarId = null;
                    this.fetchCars();
                } catch (error) {
                    alert("B³¹d podczas dodawania terminu.");
                }
            },

            // Usuwanie terminu rezerwacji
            async removeDateFromCar(carId, date) {
                try {
                    await axios.post(`http://localhost:3000/cars/${carId}/remove-date`, { date });
                    alert("Termin zosta³ usuniêty.");
                    this.fetchCars();
                } catch (error) {
                    alert("B³¹d podczas usuwania terminu.");
                }
            },

            // Rozpoczêcie edycji samochodu
            startEdit(car) {
                this.editingCar = { ...car };
            },

            // Anulowanie edycji samochodu
            cancelEdit() {
                this.editingCar = null;
            },

            // Otwieranie panelu dodawania terminu
            openAddDatePanel(carId) {
                this.addingDateCarId = carId;
            },

            closeAddDatePanel() {
                this.addingDateCarId = null;
                this.newDate = "";
            },

            // Wylogowanie u¿ytkownika
            logout() {
                this.currentView = "login";
                this.loggedInUserId = null;
                this.userRole = null;
            },
        },
        watch: {
            currentView(newView) {
                if (newView === "reservations") {
                    this.fetchReservations();
                }
            },
        },
    };
</script>
