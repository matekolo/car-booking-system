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
const dbURI = 'mongodb://127.0.0.1:27017/car-reservations';

mongoose.connect(dbURI)
    .then(() => console.log('Po��czono z MongoDB'))
    .catch(err => console.error('B��d po��czenia z MongoDB:', err));


// Definicja schematu i modelu dla samochod�w
const carSchema = new mongoose.Schema({
    brand: { type: String, required: true }, // Marka
    model: { type: String, required: true }, // Model
    type: { type: String, required: true },  // Typ (SUV, Sedan itp.)
    year: { type: Number, required: true },  // Rocznik
    horsepower: { type: Number, required: true }, // Ilo�� koni mechanicznych
    available: { type: Boolean, default: true },  // Czy dost�pny
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

// Uruchomienie serwera
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
