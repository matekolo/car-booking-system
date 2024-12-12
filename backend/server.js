// Import wymaganych modu��w
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Konfiguracja aplikacji
const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// Po��czenie z MongoDB
const dbURI = 'mongodb://127.0.0.1:27017/car-reservations'; // Lokalna baza danych
// const dbURI = 'mongodb+srv://<username>:<password>@cluster.mongodb.net/car-reservations'; // MongoDB Atlas

mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Po��czono z MongoDB'))
    .catch(err => console.error('B��d po��czenia z MongoDB:', err));

// Definicja schematu i modelu dla samochod�w
const carSchema = new mongoose.Schema({
    model: { type: String, required: true },
    available: { type: Boolean, default: true },
});

const Car = mongoose.model('Car', carSchema);

// Endpoint g��wny
app.get('/', (req, res) => {
    res.send('Backend is running with MongoDB!');
});

// Pobierz list� samochod�w
app.get('/cars', async (req, res) => {
    try {
        const cars = await Car.find();
        res.json(cars);
    } catch (err) {
        res.status(500).json({ message: 'B��d pobierania samochod�w', error: err });
    }
});

// Dodaj nowy samoch�d
app.post('/cars', async (req, res) => {
    try {
        const newCar = new Car(req.body);
        const savedCar = await newCar.save();
        res.status(201).json(savedCar);
    } catch (err) {
        res.status(400).json({ message: 'B��d dodawania samochodu', error: err });
    }
});

// Edytuj samoch�d
app.put('/cars/:id', async (req, res) => {
    try {
        const updatedCar = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (updatedCar) {
            res.json(updatedCar);
        } else {
            res.status(404).json({ message: 'Samoch�d nie znaleziony' });
        }
    } catch (err) {
        res.status(400).json({ message: 'B��d edycji samochodu', error: err });
    }
});

// Usu� samoch�d
app.delete('/cars/:id', async (req, res) => {
    try {
        const deletedCar = await Car.findByIdAndDelete(req.params.id);
        if (deletedCar) {
            res.status(204).end();
        } else {
            res.status(404).json({ message: 'Samoch�d nie znaleziony' });
        }
    } catch (err) {
        res.status(500).json({ message: 'B��d usuwania samochodu', error: err });
    }
});

// Rezerwacja samochodu
app.post('/cars/:id/reserve', async (req, res) => {
    try {
        const car = await Car.findById(req.params.id);
        if (car && car.available) {
            car.available = false;
            await car.save();
            res.json(car);
        } else {
            res.status(400).json({ message: 'Samoch�d nie dost�pny lub nie znaleziony' });
        }
    } catch (err) {
        res.status(400).json({ message: 'B��d rezerwacji samochodu', error: err });
    }
});

// Uruchomienie serwera
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
