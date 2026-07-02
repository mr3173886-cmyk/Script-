const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-shhhhh';

// মিডলওয়্যার
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ১. আপনার দেওয়া নতুন MongoDB কানেকশন
const mongoURI = "mongodb+srv://putkidibosh_db_user:nGoqOx6bNb11X08E@cluster0.rcnrw9d.mongodb.net/ScriptManager?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("🟢 Database Connected Successfully!"))
    .catch(err => console.log("🔴 Database Connection Error:", err));

// মঙ্গুস স্কিমা
const scriptSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});
const Script = mongoose.model('Script', scriptSchema);

// সুরক্ষিত ক্রেডেনশিয়াল (যা বাইরে থেকে কেউ দেখতে পারবে না)
const ADMIN_USER = {
    username: "Mr.king",
    password: "Maka_Vosda_Aghh@#99Roni"
};

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

// --- HTML পেজ সার্ভ করার রাউট (Render এবং লোকাল হোস্টিংয়ের জন্য ফিক্স) ---

// মূল ইনডেক্স পেজ
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// এই রাউটটি যুক্ত করার কারণে এখন /scripts.html পেজটি ১০০% ওপেন হবে
app.get('/scripts.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'scripts.html'));
});


// --- API Endpoints ---

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, message: "Invalid username or password!" });
});

app.post('/api/scripts/save', authenticateToken, async (req, res) => {
    try {
        let { filename, content } = req.body;
        if (!filename || !content) return res.status(400).json({ success: false, message: "All fields are required!" });
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

app.delete('/api/scripts/:id', authenticateToken, async (req, res) => {
    try {
        await Script.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Script deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

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

        // ওপরে ব্যানার ইমেজ কমেন্ট হিসেবে থাকবে
        const bannerImage = `// Banner Image: https://files.catbox.moe/s6quc6.png\n\n`;
        const finalContent = bannerImage + script.content;

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(finalContent);
    } catch (error) {
        res.status(500).send("// Server error fetching script!");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

