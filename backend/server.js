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
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const user = new User({ email: req.body.email, password: hashedPassword });
        await user.save();
        res.status(201).json({ message: 'Rejestracja zakoñczona sukcesem' });
    } catch (error) {
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
        const cars = await Car.find();
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

app.post('/cars/:id/reserve', async (req, res) => {
    try {
        const { date, userId } = req.body;

        if (!date || !userId) {
            return res.status(400).json({ message: 'Brakuje wymaganych danych: daty lub ID u¿ytkownika.' });
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

        // Zapisz zmiany
        await car.save();

        res.status(200).json({ message: 'Rezerwacja zakoñczona sukcesem.' });
    } catch (error) {
        res.status(500).json({ message: 'B³¹d podczas rezerwacji samochodu.', error: error.message });
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
