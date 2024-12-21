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

// Polaczenie z MongoDB
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

// Rejestracja użytkownika
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Walidacja e-maila
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Podany adres email jest niepoprawny.' });
        }

        // Walidacja hasla
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,}$/;
        const isPasswordValid = passwordRegex.test(password);

        if (!isPasswordValid) {
            return res.status(400).json({
                message: 'Hasło musi zawieraæ co najmniej 8 znaków, w tym jedną dużą literę, jedną małą literę, jedną cyfrę i jeden znak specjalny.',
            });
        }

        // Sprawdzenie czy email istnieje
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email jest już używany.' });
        }

        // Zapis użytkownika
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Rejestracja zakończona sukcesem' });
    } catch (error) {
        console.error('Błąd podczas rejestracji:', error);
        res.status(500).json({ message: 'Błąd podczas rejestracji.', error: error.message });
    }
});


// Logowanie uzytkownika
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && (await bcrypt.compare(req.body.password, user.password))) {
            res.json({ userId: user._id, role: user.role });
        } else {
            res.status(400).json({ message: 'Nieprawidłowy email lub hasło' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas logowania.', error: error.message });
    }
});

// Pobranie listy samochodów
app.get('/cars', async (req, res) => {
    try {
        const { brand, model, year, sort } = req.query;

        let query = {};
        if (brand) {
            query.brand = new RegExp(brand, 'i'); // Case-insensitive wyszukiwanie
        }
        if (model) {
            query.model = new RegExp(model, 'i');
        }
        if (year) {
            query.year = parseInt(year);
        }

        let cars = await Car.find(query);

        // Sortowanie
        if (sort) {
            const [field, order] = sort.split('-');
            cars = cars.sort((a, b) =>
                order === 'asc' ? a[field] - b[field] : b[field] - a[field]
            );
        }

        res.json(cars);
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas pobierania listy samochodów.', error: error.message });
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
        res.status(500).json({ message: 'Błąd podczas dodawania samochodu.', error: error.message });
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
            return res.status(404).json({ message: 'Samochód nie został znaleziony.' });
        }
        res.json({ message: 'Samochód zaktualizowany pomyślnie.', car: updatedCar });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas edycji samochodu.', error: error.message });
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
            return res.status(404).json({ message: 'Samochód nie został znaleziony.' });
        }
        if (car.availableDates.includes(date)) {
            return res.status(400).json({ message: 'Ten termin już istnieje.' });
        }
        car.availableDates.push(date);
        await car.save();
        res.status(200).json({ message: 'Termin dodany pomyślnie.', car });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas dodawania terminu.', error: error.message });
    }
});

// Usuniecie terminu wynajmu
app.post('/cars/:id/remove-date', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ message: 'Data jest wymagana.' });
        }
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samochód nie został znaleziony.' });
        }
        const updatedDates = car.availableDates.filter(d => d !== date);
        if (updatedDates.length === car.availableDates.length) {
            return res.status(400).json({ message: 'Nie znaleziono tego terminu na liście.' });
        }
        car.availableDates = updatedDates;
        await car.save();
        res.status(200).json({ message: 'Termin usunięty pomyślnie.', car });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas usuwania terminu.', error: error.message });
    }
});

// Rezerwacja samochodu
app.post('/cars/:id/reserve', async (req, res) => {
    try {
        const { date, userId } = req.body;

        if (!date || !userId) {
            return res.status(400).json({ message: 'Brakuje wymaganych danych: daty lub ID użytkownika.' });
        }

        // Sprawdzenie rezerwacji uzytkownika
        const existingReservation = await Reservation.findOne({
            userId: userId,
            date: { $gte: new Date().toISOString().split('T')[0] } // Rezerwacje z przyszłymi datami
        }).populate('carId');

        if (existingReservation) {
            return res.status(200).json({
                message: 'Masz już aktywną rezerwację.',
                activeReservation: {
                    car: existingReservation.carId,
                    date: existingReservation.date
                }
            });
        }

        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samochód nie został znaleziony.' });
        }

        // Sprawdz, czy termin jest dostepny
        if (!car.availableDates.includes(date)) {
            return res.status(400).json({ message: 'Wybrany termin jest niedostêpny.' });
        }

        // Usun termin z dostepnych dat
        car.availableDates = car.availableDates.filter(d => d !== date);
        await car.save();

        // Zapisz rezerwacjê
        const reservation = new Reservation({ carId: car._id, userId, date });
        await reservation.save();

        res.status(200).json({ message: 'Rezerwacja zakoñczona sukcesem.' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas rezerwacji samochodu.', error: error.message });
    }
});



// Pobranie listy rezerwacji
app.get('/reservations', async (req, res) => {
    try {
        const reservations = await Reservation.find().populate('carId').populate('userId');
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas pobierania rezerwacji.', error: error.message });
    }
});

// Usuniêcie rezerwacji
app.delete('/reservations/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndDelete(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Rezerwacja nie została znaleziona.' });
        }

        // Przywróc date dostyepnych samochodow
        const car = await Car.findById(reservation.carId);
        if (car && !car.availableDates.includes(reservation.date)) {
            car.availableDates.push(reservation.date);
            car.availableDates.sort(); // Sortowanie dat
            await car.save();
        }

        res.status(200).json({ message: 'Rezerwacja została usunięta.' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas usuwania rezerwacji.', error: error.message });
    }
});


// Usunięcie samochodu
app.delete('/cars/:id', async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Samochód został usunięty.' });
    } catch (error) {
        res.status(500).json({ message: 'Błąd podczas usuwania samochodu.', error: error.message });
    }
});

// Uruchomienie serwera
app.listen(3000, () => {
    console.log('Serwer działa na http://localhost:3000');
});
