const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-shhhhh';

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// আপনার দেওয়া ডাটাবেজ লিংক
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

// আপনার দেওয়া ইউজারনেম ও পাসওয়ার্ড
const ADMIN_USER = {
    username: "Mr.king",
    password: "Maka_Vosda_Aghh@#99Roni"
};

// সিকিউরিটি মিডলওয়্যার
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: "Unauthorized!" });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ success: false, message: "Invalid Token!" });
        req.user = user;
        next();
    });
};

// --- API এন্ডপয়েন্টসমূহ ---

// লগইন এপিআই
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, message: "Invalid username or password!" });
});

// স্ক্রিপ্ট তৈরি/আপডেট করার এপিআই (শুধু অ্যাডমিন)
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
        res.status(500).json({ success: false, message: "Error saving script!" });
    }
});

// স্ক্রিপ্ট ডিলিট করার এপিআই (শুধু অ্যাডমিন)
app.delete('/api/scripts/:id', authenticateToken, async (req, res) => {
    try {
        await Script.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Script deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting script!" });
    }
});

// সব স্ক্রিপ্টের লিস্ট (ড্যাশবোর্ডের জন্য)
app.get('/api/scripts/list', async (req, res) => {
    try {
        const scripts = await Script.find({}).sort({ addedAt: -1 }).select('-content');
        res.json({ success: true, scripts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching list!" });
    }
});

// --- পাবলিক ডিরেক্টরি/লিংক রাউট ---
// এই লিংকে যে কেউ ক্লিক করলে সরাসরি কোড দেখতে পারবে (কোনো এইচটিএমএল ছাড়া, পিওর টেক্সট হিসেবে)
app.get('/scripts/:filename', async (req, res) => {
    try {
        const script = await Script.findOne({ filename: req.params.filename });
        if (!script) return res.status(404).send("// 404: Script not found!");

        // ওপরে আপনার দেওয়া ইমেজ লিংকটি কমেন্ট হিসেবে থাকবে
        const banner = `// Banner Image: https://files.catbox.moe/s6quc6.png\n\n`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(banner + script.content);
    } catch (error) {
        res.status(500).send("// Server error fetching script!");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});

