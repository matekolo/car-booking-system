const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Konfiguracja folderu statycznego dla zdj��
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB URL
mongoose.connect('mongodb://127.0.0.1:27017/carBookingSystem', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log('Po��czono z baz� danych'))
    .catch(err => console.error('B��d po��czenia z baz� danych:', err));

// Schemat u�ytkownika
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'client' }, // Rola: client lub admin
});

const User = mongoose.model('User', userSchema);

// Schemat samochodu
const carSchema = new mongoose.Schema({
    brand: { type: String, required: true },
    model: { type: String, required: true },
    type: { type: String },
    year: { type: Number },
    horsepower: { type: Number },
    available: { type: Boolean, default: true },
    imagePath: { type: String }, // �cie�ka do zdj�cia
});

const Car = mongoose.model('Car', carSchema);

// Konfiguracja Multer do obs�ugi plik�w
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, 'uploads')); // �cie�ka do folderu uploads
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`); // Unikalna nazwa pliku
    },
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedFileTypes = /jpeg|jpg|png/;
        const isValidExtension = allowedFileTypes.test(path.extname(file.originalname).toLowerCase());
        const isValidMimeType = allowedFileTypes.test(file.mimetype);

        if (isValidExtension && isValidMimeType) {
            cb(null, true);
        } else {
            cb(new Error('Plik musi by� w formacie JPG, JPEG lub PNG!'));
        }
    },
});

// Endpointy u�ytkownika

// Rejestracja
app.post('/register', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'U�ytkownik ju� istnieje' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({ email, password: hashedPassword, role: role || 'client' });
        await newUser.save();

        res.status(201).json({ message: 'Rejestracja udana' });
    } catch (err) {
        res.status(500).json({ message: 'B��d serwera', error: err.message });
    }
});

// Logowanie
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Niepoprawny email lub has�o' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Niepoprawny email lub has�o' });
        }

        res.json({ message: 'Zalogowano pomy�lnie', role: user.role });
    } catch (err) {
        res.status(500).json({ message: 'B��d serwera', error: err.message });
    }
});

// Endpointy samochod�w

// Pobierz list� samochod�w
app.get('/cars', async (req, res) => {
    try {
        const cars = await Car.find();
        res.json(cars);
    } catch (err) {
        res.status(500).json({ message: 'B��d serwera', error: err.message });
    }
});

// Dodaj nowy samoch�d
app.post('/cars', upload.single('image'), async (req, res) => {
    try {
        const carData = req.body;
        if (req.file) {
            carData.imagePath = `/uploads/${req.file.filename}`;
        }

        const newCar = new Car(carData);
        const savedCar = await newCar.save();
        res.status(201).json(savedCar);
    } catch (err) {
        res.status(400).json({ message: 'B��d dodawania samochodu', error: err.message });
    }
});

// Zaktualizuj samoch�d
app.put('/cars/:id', async (req, res) => {
    try {
        const updatedCar = await Car.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updatedCar);
    } catch (err) {
        res.status(400).json({ message: 'B��d aktualizacji samochodu', error: err.message });
    }
});

// Usu� samoch�d
app.delete('/cars/:id', async (req, res) => {
    try {
        await Car.findByIdAndDelete(req.params.id);
        res.json({ message: 'Samoch�d zosta� usuni�ty' });
    } catch (err) {
        res.status(400).json({ message: 'B��d usuwania samochodu', error: err.message });
    }
});

// Uruchomienie serwera
app.listen(PORT, () => {
    console.log(`Serwer dzia�a na http://localhost:${PORT}`);
});
