const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-shhhhh'; // টোকেন সিক্রেট

// মিডলওয়্যার
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ১. আপনার দেওয়া নতুন MongoDB কানেকশন
const mongoURI = "mongodb+srv://putkidibosh_db_user:nGoqOx6bNb11X08E@cluster0.rcnrw9d.mongodb.net/ScriptManager?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(mongoURI)
    .then(() => console.log("🟢 Database Connected Successfully!"))
    .catch(err => console.log("🔴 Database Connection Error:", err));

// মঙ্গুস স্কিমা (Schema)
const scriptSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true }, // যেমন: test.js
    content: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});
const Script = mongoose.model('Script', scriptSchema);

// সুরক্ষিত অ্যাডমিন ক্রেডেনশিয়াল (যা বাইরে থেকে কেউ দেখতে পারবে না)
const ADMIN_USER = {
    username: "Mr.king",
    password: "Maka_Vosda_Aghh@#99Roni"
};

// অ্যাডমিন অথেন্টিকেশন মিডলওয়্যার (সিকিউরিটির জন্য)
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

// --- API Endpoints ---

// ক) সিকিউর লগইন API (পাসওয়ার্ড সুরক্ষিত রাখার জন্য)
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, message: "Invalid username or password!" });
});

// খ) নতুন স্ক্রিপ্ট সেভ বা আপডেট করার API (শুধুমাত্র লগইন করা অ্যাডমিন পারবে)
app.post('/api/scripts/save', authenticateToken, async (req, res) => {
    try {
        let { filename, content } = req.body;
        if (!filename || !content) return res.status(400).json({ success: false, message: "All fields are required!" });
        
        // ফাইলের নামের শেষে এক্সটেনশন চেক করা (.js বা .txt)
        if (!filename.includes('.')) filename += '.js';

        // রিকোয়েস্ট করা স্ক্রিপ্ট ডাটাবেজে আপডেট বা নতুন তৈরি করা
        const updatedScript = await Script.findOneAndUpdate(
            { filename },
            { content },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: `Script '${filename}' saved successfully!` });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error saving script!" });
    }
});

// গ) ডিলিট করার API (শুধুমাত্র অ্যাডমিন পারবে)
app.delete('/api/scripts/:id', authenticateToken, async (req, res) => {
    try {
        await Script.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Script deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});

// ঘ) সব স্ক্রিপ্টের লিস্ট পাওয়ার API (অ্যাডমিন ড্যাশবোর্ডের জন্য)
app.get('/api/scripts/list', authenticateToken, async (req, res) => {
    try {
        const scripts = await Script.find({}).sort({ addedAt: -1 }).select('-content');
        res.json({ success: true, scripts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error!" });
    }
});


// --- ডাইনামিক পাবলিক স্ক্রিপ্ট ভিউ রাউট ---
// এটি আপনার রিকোয়ারমেন্ট অনুযায়ী website.com/scripts/test.js লিংকে কোড দেখাবে এবং সবার ওপরে ইমেজ লিংক কমেন্ট আকারে থাকবে।
app.get('/scripts/:filename', async (req, res) => {
    try {
        const script = await Script.findOne({ filename: req.params.filename });
        if (!script) return res.status(404).send("// 404: Script not found!");

        // আপনার দেওয়া ইমেজ লিংক সবার ওপরে যুক্ত করা হচ্ছে
        const bannerImage = `// Banner Image: https://files.catbox.moe/s6quc6.png\n\n`;
        const finalContent = bannerImage + script.content;

        // ব্রাউজারকে টেক্সট বা জাভাস্ক্রিপ্ট ফরম্যাটে কোড দেখানোর জন্য হেডার সেট করা
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(finalContent);
    } catch (error) {
        res.status(500).send("// Server error fetching script!");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});

