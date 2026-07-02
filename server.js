const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = 'super-secret-key-shhhhh';

app.use(cors());
app.use(express.json());

// আপনার দেওয়া ডাটাবেজ লিংক (Missqueenbot ডাটাবেজের ভেতরেই ScriptManager কালেকশন তৈরি হবে)
const mongoURI = "mongodb+srv://mr3173886_db_user:RoniNewPass123@cluster0.ozx9rai.mongodb.net/Missqueenbot?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(() => console.log("🟢 MongoDB Connected Successfully for Scripts!"))
    .catch(err => console.error("🔴 MongoDB Connection Error:", err));

// মঙ্গুস স্কিমা ও মডেল (স্ক্রিপ্ট ম্যানেজমেন্টের জন্য)
const scriptSchema = new mongoose.Schema({
    filename: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    addedAt: { type: Date, default: Date.now }
});
const Script = mongoose.model('Script', scriptSchema);

// আপনার দেওয়া অ্যাডমিন ইউজারনেম ও পাসওয়ার্ড
const ADMIN_USER = {
    username: "Mr.king",
    password: "Maka_Vosda_Aghh@#99Roni"
};

// সিকিউরিটি টোকেন ভ্যালিডেশন মিডলওয়্যার
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

// --- ফ্রন্টএন্ড পেজসমূহ (কোডের ভেতর বিল্ট-ইন, ফোল্ডারের ঝামেলা শেষ) ---

// ১. মূল হোম পেজ (লগইন এবং কোড এডিটর)
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Script Dashboard</title>
    <style>
        body { background-color: #0d1117; color: #c9d1d9; font-family: sans-serif; margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .banner { width: 100%; max-width: 800px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #30363d; background: #161b22; }
        .container { width: 100%; max-width: 800px; background: #161b22; padding: 20px; border-radius: 6px; border: 1px solid #30363d; box-sizing: border-box; }
        input, textarea, button { width: 100%; background: #0d1117; color: #c9d1d9; border: 1px solid #30363d; padding: 12px; margin: 8px 0; border-radius: 4px; box-sizing: border-box; font-size: 14px; }
        textarea { height: 300px; font-family: 'Courier New', Courier, monospace; resize: vertical; }
        button { background: #238636; color: white; border: none; cursor: pointer; font-weight: bold; }
        button:hover { background: #2ea043; }
        .hidden { display: none; }
        .nav-links { display: flex; justify-content: space-between; margin-top: 15px; }
        .nav-links a { color: #58a6ff; text-decoration: none; font-size: 14px; }
    </style>
</head>
<body>
    <img src="https://files.catbox.moe/s6quc6.png" alt="Banner" class="banner">
    <div class="container">
        <div id="login-box">
            <h2>Admin Login</h2>
            <input type="text" id="username" placeholder="Username">
            <input type="password" id="password" placeholder="Password">
            <button onclick="login()">Login</button>
        </div>
        <div id="editor-box" class="hidden">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h2>Create & Save Script</h2>
                <button onclick="logout()" style="width: auto; background: #da3637; padding: 6px 12px; margin: 0;">Logout</button>
            </div>
            <input type="text" id="filename" placeholder="e.g., test.js">
            <textarea id="content" placeholder="Write or paste your script code here..."></textarea>
            <button onclick="saveScript()">Commit & Save Changes</button>
            <div class="nav-links">
                <a href="/scripts.html">📂 View All Saved Scripts List</a>
            </div>
        </div>
    </div>
    <script>
        if (localStorage.getItem('admin_token')) {
            document.getElementById('login-box').classList.add('hidden');
            document.getElementById('editor-box').classList.remove('hidden');
        }
        async function login() {
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                localStorage.setItem('admin_token', data.token);
                location.reload();
            } else {
                alert(data.message);
            }
        }
        async function saveScript() {
            const filename = document.getElementById('filename').value;
            const content = document.getElementById('content').value;
            const token = localStorage.getItem('admin_token');
            const res = await fetch('/api/scripts/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify({ filename, content })
            });
            const data = await res.json();
            alert(data.message);
            if(data.success) {
                document.getElementById('filename').value = '';
                document.getElementById('content').value = '';
            }
        }
        function logout() {
            localStorage.removeItem('admin_token');
            location.reload();
        }
    </script>
</body>
</html>
    `);
});

// ২. আপনার দেওয়া scripts.html পেজটি সরাসরি ব্যাকএন্ড রাউটে সেট করা হলো
app.get('/scripts.html', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>All Scripts</title>
    <style>
        body { background-color: #0d1117; color: #c9d1d9; font-family: sans-serif; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .banner { width: 100%; max-width: 800px; margin-bottom: 20px; border-radius: 8px; border: 1px solid #30363d; background: #161b22; }
        .container { width: 100%; max-width: 800px; background: #161b22; padding: 20px; border-radius: 6px; border: 1px solid #30363d; box-sizing: border-box; }
        .script-item { display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #30363d; }
        .script-item a { color: #58a6ff; text-decoration: none; font-weight: bold; font-family: monospace; }
        .del-btn { background: #da3637; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; }
    </style>
</head>
<body>
    <img src="https://files.catbox.moe/s6quc6.png" alt="Banner" class="banner">
    <div class="container">
        <h2>Hosted Scripts List (Public View)</h2>
        <div id="list">Loading...</div>
        <br>
        <a href="/" style="color: #58a6ff; text-decoration: none; font-size: 14px;">⬅️ Back to Editor</a>
    </div>
    <script>
        const token = localStorage.getItem('admin_token');
        loadScripts();
        async function loadScripts() {
            const res = await fetch('/api/scripts/list');
            const data = await res.json();
            const listDiv = document.getElementById('list');
            listDiv.innerHTML = '';
            if (!data.scripts || data.scripts.length === 0) {
                listDiv.innerHTML = '<p>No scripts found.</p>';
                return;
            }
            data.scripts.forEach(script => {
                const deleteButton = token ? '<button class="del-btn" onclick="deleteScript(\''+script._id+'\')">Delete</button>' : '';
                listDiv.innerHTML += '\\n<div class="script-item">\\n<a href="/scripts/'+script.filename+'" target="_blank">/scripts/'+script.filename+'</a>\\n'+deleteButton+'\\n</div>';
            });
        }
        async function deleteScript(id) {
            if (!confirm("Are you sure?")) return;
            await fetch('/api/scripts/' + id, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer ' + token }
            });
            loadScripts();
        }
    </script>
</body>
</html>
    `);
});

// --- API Endpoints ---

// লগইন এপিআই
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, message: "Invalid username or password!" });
});

// স্ক্রিপ্ট সেভ করার এপিআই
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

// স্ক্রিপ্ট ডিলিট করার এপিআই
app.delete('/api/scripts/:id', authenticateToken, async (req, res) => {
    try {
        await Script.findByIdAndDelete(req.params.id);
        res.json({ success: true, message: "Script deleted successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error deleting script!" });
    }
});

// সব স্ক্রিপ্টের নামের লিস্ট পাওয়ার এপিআই (scripts.html এর জন্য)
app.get('/api/scripts/list', async (req, res) => {
    try {
        const scripts = await Script.find({}).sort({ addedAt: -1 }).select('-content');
        res.json({ success: true, scripts });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching list!" });
    }
});

// --- ডাইনামিক পাবলিক স্ক্রিপ্ট কোড ভিউ রাউট ---
app.get('/scripts/:filename', async (req, res) => {
    try {
        const script = await Script.findOne({ filename: req.params.filename });
        if (!script) return res.status(404).send("// 404: Script not found!");

        // ওপরে আপনার ব্যানার ইমেজ লিংকটি কমেন্ট হিসেবে থাকবে
        const banner = `// Banner Image: https://files.catbox.moe/s6quc6.png\n\n`;
        
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(banner + script.content);
    } catch (error) {
        res.status(500).send("// Server error fetching script!");
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
