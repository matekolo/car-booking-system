const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Po��czenie z MongoDB
mongoose.connect('mongodb://127.0.0.1:27017/carBookingSystem', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

// Schematy Mongoose
const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    role: { type: String, default: 'client' },
});

const carSchema = new mongoose.Schema({
    brand: String,
    model: String,
    year: Number,
    horsepower: Number,
    imagePath: String,
    availableDates: [String],
});

const reservationSchema = new mongoose.Schema({
    carId: { type: mongoose.Schema.Types.ObjectId, ref: 'Car', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Reservation = mongoose.model('Reservation', reservationSchema);
const User = mongoose.model('User', userSchema);
const Car = mongoose.model('Car', carSchema);

// Konfiguracja Multer
const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Endpointy

// Rejestracja u�ytkownika
app.post('/register', async (req, res) => {
    try {
        const existingUser = await User.findOne({ email: req.body.email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email jest ju� u�ywany.' });
        }

        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ email: req.body.email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Rejestracja zako�czona sukcesem' });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas rejestracji.', error: error.message });
    }
});

// Logowanie u�ytkownika
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && (await bcrypt.compare(req.body.password, user.password))) {
            res.json({ userId: user._id, role: user.role });
        } else {
            res.status(400).json({ message: 'Nieprawid�owy email lub has�o' });
        }
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas logowania.', error: error.message });
    }
});

// Pobranie listy samochod�w
app.get('/cars', async (req, res) => {
    try {
        const cars = await Car.find();
        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas pobierania listy samochod�w.', error: error.message });
    }
});

// Dodanie samochodu
app.post('/cars', upload.single('image'), async (req, res) => {
    try {
        const carData = req.body;
        if (req.file) {
            carData.imagePath = `/uploads/${req.file.filename}`;
        }
        const newCar = new Car(carData);
        await newCar.save();
        res.status(201).json(newCar);
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas dodawania samochodu.', error: error.message });
    }
});

// Edycja samochodu
app.put('/cars/:id', upload.single('image'), async (req, res) => {
    try {
        const updatedCarData = req.body;
        if (req.file) {
            updatedCarData.imagePath = `/uploads/${req.file.filename}`;
        }
        const updatedCar = await Car.findByIdAndUpdate(req.params.id, updatedCarData, { new: true });
        if (!updatedCar) {
            return res.status(404).json({ message: 'Samoch�d nie zosta� znaleziony.' });
        }
        res.json({ message: 'Samoch�d zaktualizowany pomy�lnie.', car: updatedCar });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas edycji samochodu.', error: error.message });
    }
});

// Dodanie terminu wynajmu
app.post('/cars/:id/add-date', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ message: 'Data jest wymagana.' });
        }
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samoch�d nie zosta� znaleziony.' });
        }
        if (car.availableDates.includes(date)) {
            return res.status(400).json({ message: 'Ten termin ju� istnieje.' });
        }
        car.availableDates.push(date);
        await car.save();
        res.status(200).json({ message: 'Termin dodany pomy�lnie.', car });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas dodawania terminu.', error: error.message });
    }
});

// Usuni�cie terminu wynajmu
app.post('/cars/:id/remove-date', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ message: 'Data jest wymagana.' });
        }
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samoch�d nie zosta� znaleziony.' });
        }
        const updatedDates = car.availableDates.filter(d => d !== date);
        if (updatedDates.length === car.availableDates.length) {
            return res.status(400).json({ message: 'Nie znaleziono tego terminu na li�cie.' });
        }
        car.availableDates = updatedDates;
        await car.save();
        res.status(200).json({ message: 'Termin usuni�ty pomy�lnie.', car });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas usuwania terminu.', error: error.message });
    }
});

// Rezerwacja samochodu
app.post('/cars/:id/reserve', async (req, res) => {
    try {
        const { date, userId } = req.body;

        if (!date || !userId) {
            return res.status(400).json({ message: 'Brakuje wymaganych danych: daty lub ID u�ytkownika.' });
        }

        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samoch�d nie zosta� znaleziony.' });
        }

        // Sprawd�, czy termin jest dost�pny
        if (!car.availableDates.includes(date)) {
            return res.status(400).json({ message: 'Wybrany termin jest niedost�pny.' });
        }

        // Usu� termin z dost�pnych dat
        car.availableDates = car.availableDates.filter(d => d !== date);
        await car.save();

        // Zapisz rezerwacj�
        const reservation = new Reservation({ carId: car._id, userId, date });
        await reservation.save();

        res.status(200).json({ message: 'Rezerwacja zako�czona sukcesem.' });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas rezerwacji samochodu.', error: error.message });
    }
});

// Pobranie listy rezerwacji
app.get('/reservations', async (req, res) => {
    try {
        const reservations = await Reservation.find().populate('carId').populate('userId');
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas pobierania rezerwacji.', error: error.message });
    }
});

// Usuni�cie rezerwacji
app.delete('/reservations/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndDelete(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Rezerwacja nie zosta�a znaleziona.' });
        }
        res.status(200).json({ message: 'Rezerwacja zosta�a usuni�ta.' });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas usuwania rezerwacji.', error: error.message });
    }
});

// Usuni�cie samochodu
app.delete('/cars/:id', async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Samoch�d zosta� usuni�ty.' });
    } catch (error) {
        res.status(500).json({ message: 'B��d podczas usuwania samochodu.', error: error.message });
    }
});

// Uruchomienie serwera
app.listen(3000, () => {
    console.log('Serwer dzia�a na http://localhost:3000');
});
