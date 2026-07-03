require('dotenv').config(); // এনভায়রনমেন্ট ভ্যারিয়েবল লোড করার জন্য (npm i dotenv)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// সিক্রেটগুলো .env ফাইল থেকে আসবে, না থাকলে এগুলো ডিফল্ট হিসেবে কাজ করবে
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-shhhhh';
const mongoURI = process.env.MONGO_URI || "mongodb+srv://putkidibosh_db_user:nGoqOx6bNb11X08E@cluster0.rcnrw9d.mongodb.net/ScriptManager?retryWrites=true&w=majority&appName=Cluster0";

// মিডলওয়্যার
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB কানেকশন
mongoose.connect(mongoURI)
    .then(() => console.log("🟢 Database Connected Successfully!"))
    .catch(err => console.error("🔴 Database Connection Error:", err));

// মঙ্গুস স্কিমা
const scriptSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});
const Script = mongoose.model('Script', scriptSchema);

// সুরক্ষিত ক্রেডেনশিয়াল (.env থেকে রিড করা ভালো)
const ADMIN_USER = {
    username: process.env.ADMIN_USER || "Mr.king",
    password: process.env.ADMIN_PASSWORD || "Maka_Vosda_Aghh@#99Roni"
};

// JWT ভেরিফিকেশন মিডলওয়্যার
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Forbidden/Invalid Token!" });
        req.user = user;
        next();
    });
};

// --- HTML পেজ রাউটস ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/scripts.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scripts.html'));
});

// --- API Endpoints ---

// লগইন রাউট
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, message: "Invalid username or password!" });
});

// স্ক্রিপ্ট সেভ/আপডেট রাউট
app.post('/api/scripts/save', authenticateToken, async (req, res) => {
    try {
        let { filename, content } = req.body;
        if (!filename || !content) return res.status(400).json({ success: false, message: "All fields are required!" });
        
        // এক্সটেনশন চেক
        if (!filename.includes('.')) filename += '.js';

        await Script.findOneAndUpdate(
            { filename },
            { content },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: `Script '${filename}' saved successfully!` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error saving script!" });
    }
});

// স্ক্রিপ্ট ডিলিট রাউট
app.delete('/api/scripts/:id', authenticateToken, async (req, res) => {
    try {
        await Script.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Script deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// স্ক্রিপ্ট লিস্ট রাউট (content ছাড়া)
app.get('/api/scripts/list', async (req, res) => {
    try {
        const scripts = await Script.find({}).sort({ addedAt: -1 }).select('-content');
        res.json({ success: true, scripts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// --- ডাইনামিক পাবলিক স্ক্রিপ্ট ভিউ রাউট ---
app.get('/scripts/:filename', async (req, res) => {
    try {
        const script = await Script.findOne({ filename: req.params.filename });
        if (!script) return res.status(404).send("// 404: Script not found!");

        // ব্যানার ইমেজ কমেন্ট হিসেবে অ্যাড করা
        const bannerImage = `// Banner Image: https://ibb.co/6JtX4yg6.png\n\n`;
        const finalContent = bannerImage + script.content;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(finalContent);
    } catch (error) {
        res.status(500).send("// Server error fetching script!");
    }
});

// সার্ভার স্টার্ট
app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
