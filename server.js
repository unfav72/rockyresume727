const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Data storage files
const USERS_FILE = path.join(__dirname, 'data', 'users.json');
const RESUMES_FILE = path.join(__dirname, 'data', 'resumes.json');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
}

// Initialize data files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(RESUMES_FILE)) {
    fs.writeFileSync(RESUMES_FILE, JSON.stringify({}));
}

// Helper functions
function readUsers() {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
}

function writeUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readResumes() {
    const data = fs.readFileSync(RESUMES_FILE, 'utf8');
    return JSON.parse(data);
}

function writeResumes(resumes) {
    fs.writeFileSync(RESUMES_FILE, JSON.stringify(resumes, null, 2));
}

// Routes

// Register endpoint
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.json({ success: false, message: 'All fields are required' });
        }

        const users = readUsers();

        // Check if user already exists
        const existingUser = users.find(u => u.username === username || u.email === email);
        if (existingUser) {
            return res.json({ success: false, message: 'Username or email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Add new user
        users.push({
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString()
        });

        writeUsers(users);

        res.json({ success: true, message: 'Registration successful' });
    } catch (error) {
        console.error('Registration error:', error);
        res.json({ success: false, message: 'Registration failed' });
    }
});

// Login endpoint
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.json({ success: false, message: 'Username and password are required' });
        }

        const users = readUsers();
        const user = users.find(u => u.username === username);

        if (!user) {
            return res.json({ success: false, message: 'Invalid username or password' });
        }

        // Compare password
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.json({ success: false, message: 'Invalid username or password' });
        }

        res.json({ success: true, message: 'Login successful', username: user.username });
    } catch (error) {
        console.error('Login error:', error);
        res.json({ success: false, message: 'Login failed' });
    }
});

// Save resume endpoint
app.post('/api/save-resume', (req, res) => {
    try {
        const { username, resume } = req.body;

        if (!username || !resume) {
            return res.json({ success: false, message: 'Invalid data' });
        }

        const resumes = readResumes();
        resumes[username] = {
            ...resume,
            lastUpdated: new Date().toISOString()
        };

        writeResumes(resumes);

        res.json({ success: true, message: 'Resume saved successfully' });
    } catch (error) {
        console.error('Save resume error:', error);
        res.json({ success: false, message: 'Failed to save resume' });
    }
});

// Get resume endpoint
app.get('/api/get-resume', (req, res) => {
    try {
        const { username } = req.query;

        if (!username) {
            return res.json({ success: false, message: 'Username required' });
        }

        const resumes = readResumes();
        const resume = resumes[username];

        if (!resume) {
            return res.json({ success: false, message: 'No resume found' });
        }

        res.json({ success: true, resume });
    } catch (error) {
        console.error('Get resume error:', error);
        res.json({ success: false, message: 'Failed to load resume' });
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`✅ Resume Builder Server running on http://localhost:${PORT}`);
    console.log(`📁 Data directory: ${path.join(__dirname, 'data')}`);
});