<template>
  <div class="container mx-auto py-5">
    <h1 class="text-2xl font-bold">Lista samochodów</h1>
    <div v-for="car in cars" :key="car.id" class="border p-3 my-2 rounded shadow">
      <p class="text-lg font-semibold">{{ car.model }}</p>
      <p>Status: 
        <span :class="car.available ? 'text-green-500' : 'text-red-500'">
          {{ car.available ? 'Dostêpny' : 'Niedostêpny' }}
        </span>
      </p>
      <button v-if="car.available" class="btn btn-primary" @click="reserveCar(car.id)">
        Zarezerwuj
      </button>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  data() {
    return {
      cars: [],
    };
  },
  async mounted() {
    this.fetchCars();
  },
  methods: {
    async fetchCars() {
      const response = await axios.get('http://localhost:3000/cars');
      this.cars = response.data;
    },
    async reserveCar(id) {
      await axios.post(`http://localhost:3000/cars/${id}/reserve`);
      this.fetchCars();
    },
  },
};
</script>

<style>
@import 'bootstrap/dist/css/bootstrap.css';
</style>
