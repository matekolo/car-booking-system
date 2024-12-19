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

// Po³¹czenie z MongoDB
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

// Rejestracja u¿ytkownika
app.post('/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Walidacja e-maila
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ message: 'Podany adres email jest niepoprawny.' });
        }

        // Walidacja has³a
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,}$/;
        const isPasswordValid = passwordRegex.test(password);

        if (!isPasswordValid) {
            return res.status(400).json({
                message: 'Has³o musi zawieraæ co najmniej 8 znaków, w tym jedn¹ du¿¹ literê, jedn¹ ma³¹ literê, jedn¹ cyfrê i jeden znak specjalny.',
            });
        }

        // Sprawdzenie czy email istnieje
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'Email jest ju¿ u¿ywany.' });
        }

        // Zapis u¿ytkownika
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Rejestracja zakoñczona sukcesem' });
    } catch (error) {
        console.error('B³¹d podczas rejestracji:', error);
        res.status(500).json({ message: 'B³¹d podczas rejestracji.', error: error.message });
    }
});


// Logowanie u¿ytkownika
app.post('/login', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.body.email });
        if (user && (await bcrypt.compare(req.body.password, user.password))) {
            res.json({ userId: user._id, role: user.role });
        } else {
            res.status(400).json({ message: 'Nieprawid³owy email lub has³o' });
        }
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas logowania.', error: error.message });
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
        res.status(500).json({ message: 'B³¹d podczas pobierania listy samochodów.', error: error.message });
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
        res.status(500).json({ message: 'B³¹d podczas dodawania samochodu.', error: error.message });
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
            return res.status(404).json({ message: 'Samochód nie zosta³ znaleziony.' });
        }
        res.json({ message: 'Samochód zaktualizowany pomyœlnie.', car: updatedCar });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas edycji samochodu.', error: error.message });
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
            return res.status(404).json({ message: 'Samochód nie zosta³ znaleziony.' });
        }
        if (car.availableDates.includes(date)) {
            return res.status(400).json({ message: 'Ten termin ju¿ istnieje.' });
        }
        car.availableDates.push(date);
        await car.save();
        res.status(200).json({ message: 'Termin dodany pomyœlnie.', car });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas dodawania terminu.', error: error.message });
    }
});

// Usuniêcie terminu wynajmu
app.post('/cars/:id/remove-date', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) {
            return res.status(400).json({ message: 'Data jest wymagana.' });
        }
        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samochód nie zosta³ znaleziony.' });
        }
        const updatedDates = car.availableDates.filter(d => d !== date);
        if (updatedDates.length === car.availableDates.length) {
            return res.status(400).json({ message: 'Nie znaleziono tego terminu na liœcie.' });
        }
        car.availableDates = updatedDates;
        await car.save();
        res.status(200).json({ message: 'Termin usuniêty pomyœlnie.', car });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas usuwania terminu.', error: error.message });
    }
});

// Rezerwacja samochodu
app.post('/cars/:id/reserve', async (req, res) => {
    try {
        const { date, userId } = req.body;

        if (!date || !userId) {
            return res.status(400).json({ message: 'Brakuje wymaganych danych: daty lub ID u¿ytkownika.' });
        }

        // Sprawdzenie, czy u¿ytkownik ma ju¿ aktywn¹ rezerwacjê
        const existingReservation = await Reservation.findOne({
            userId: userId,
            date: { $gte: new Date().toISOString().split('T')[0] } // Rezerwacje z przysz³ymi datami
        }).populate('carId');

        if (existingReservation) {
            return res.status(200).json({
                message: 'Masz ju¿ aktywn¹ rezerwacjê.',
                activeReservation: {
                    car: existingReservation.carId,
                    date: existingReservation.date
                }
            });
        }

        const car = await Car.findById(req.params.id);
        if (!car) {
            return res.status(404).json({ message: 'Samochód nie zosta³ znaleziony.' });
        }

        // SprawdŸ, czy termin jest dostêpny
        if (!car.availableDates.includes(date)) {
            return res.status(400).json({ message: 'Wybrany termin jest niedostêpny.' });
        }

        // Usuñ termin z dostêpnych dat
        car.availableDates = car.availableDates.filter(d => d !== date);
        await car.save();

        // Zapisz rezerwacjê
        const reservation = new Reservation({ carId: car._id, userId, date });
        await reservation.save();

        res.status(200).json({ message: 'Rezerwacja zakoñczona sukcesem.' });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas rezerwacji samochodu.', error: error.message });
    }
});



// Pobranie listy rezerwacji
app.get('/reservations', async (req, res) => {
    try {
        const reservations = await Reservation.find().populate('carId').populate('userId');
        res.json(reservations);
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas pobierania rezerwacji.', error: error.message });
    }
});

// Usuniêcie rezerwacji
app.delete('/reservations/:id', async (req, res) => {
    try {
        const reservation = await Reservation.findByIdAndDelete(req.params.id);
        if (!reservation) {
            return res.status(404).json({ message: 'Rezerwacja nie zosta³a znaleziona.' });
        }

        // Przywróæ datê do dostêpnych terminów samochodu
        const car = await Car.findById(reservation.carId);
        if (car && !car.availableDates.includes(reservation.date)) {
            car.availableDates.push(reservation.date);
            car.availableDates.sort(); // Sortowanie dat
            await car.save();
        }

        res.status(200).json({ message: 'Rezerwacja zosta³a usuniêta.' });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas usuwania rezerwacji.', error: error.message });
    }
});


// Usuniêcie samochodu
app.delete('/cars/:id', async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Samochód zosta³ usuniêty.' });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas usuwania samochodu.', error: error.message });
    }
});

// Uruchomienie serwera
app.listen(3000, () => {
    console.log('Serwer dzia³a na http://localhost:3000');
});
