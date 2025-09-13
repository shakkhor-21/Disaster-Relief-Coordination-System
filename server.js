const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static(path.join(__dirname, '../General')));
app.use(express.static(path.join(__dirname, '../user_dashboard')));
app.use(express.static(path.join(__dirname, '../volunteer_dashboard')));
app.use(express.static(path.join(__dirname, '../admin_dashboard')));

const authenticateUser = (req, res, next) => {
  try {
    const { email, password } = req.body;
    const usersFile = path.join(__dirname, 'users.json');
    
    if (!fs.existsSync(usersFile)) {
      return res.status(500).json({ message: 'Server configuration error' });
    }
    
    const users = JSON.parse(fs.readFileSync(usersFile)).users;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ message: 'Server error during authentication' });
  }
};

app.post('/login', authenticateUser, (req, res) => {
  try {
    const { role } = req.user;
    let redirectUrl;
    
    switch(role) {
      case 'user':
        redirectUrl = '/General/user_dashboard.html';
        break;
      case 'volunteer':
        redirectUrl = '/General/volunteer_dashboard.html';
        break;
      case 'admin':
        redirectUrl = '/General/dashboard_design.html';
        break;
      default:
        return res.status(400).json({ message: 'Invalid role' });
    }
    
    res.json({ 
      message: 'Login successful',
      redirectUrl,
      role,
      username: req.user.username
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

app.post('/register', (req, res) => {
  try {
    const { username, email, password, role = 'user' } = req.body;
    const usersFile = path.join(__dirname, 'users.json');
    
    let users = { users: [] };
    if (fs.existsSync(usersFile)) {
      users = JSON.parse(fs.readFileSync(usersFile));
    }
    
    if (users.users.some(user => user.username === username || user.email === email)) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    users.users.push({
      username,
      email,
      password,
      role
    });
    
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
    
    res.json({ message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

app.post('/submit_resource', (req, res) => {
  const { request_id, resource_type, quantity, location } = req.body;
  
  function generateRequestId() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
  
  const newEntry = {
    request_id: request_id ? request_id : generateRequestId(),
    resource_type,
    quantity,
    location,
    timestamp: new Date().toISOString()
  };

  const filePath = path.join(__dirname, 'aid_requests.json');

  let data = [];
  if (fs.existsSync(filePath)) {
    const existing = fs.readFileSync(filePath);
    data = JSON.parse(existing);
  }

  data.push(newEntry);

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

  res.json({ message: 'Request submitted successfully!' });
});

app.get('/aid_requests', (req, res) => {
  const filePath = path.join(__dirname, 'aid_requests.json');

  if (!fs.existsSync(filePath)) {
    return res.json([]);
  }

  const raw = fs.readFileSync(filePath);
  const requests = JSON.parse(raw);
  res.json(requests);
});

app.post('/submit_donation', (req, res) => {
  try {
    const { fullName, amount, purpose, timestamp } = req.body;
    
    if (!fullName || !amount || !purpose) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const newDonation = {
      id: Date.now().toString(),
      fullName,
      amount: parseInt(amount),
      purpose,
      timestamp,
      status: 'Received'
    };
    
    const filePath = path.join(__dirname, 'donations.json');
    let donations = [];
    
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath);
      donations = JSON.parse(existing);
    }
    
    donations.push(newDonation);
    fs.writeFileSync(filePath, JSON.stringify(donations, null, 2));
    
    res.json({ 
      message: 'Donation submitted successfully!',
      donationId: newDonation.id
    });
    
  } catch (error) {
    console.error('Error submitting donation:', error);
    res.status(500).json({ message: 'Server error during donation submission' });
  }
});

app.get('/donations', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'donations.json');
    
    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }
    
    const donations = fs.readFileSync(filePath);
    res.json(JSON.parse(donations));
    
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({ message: 'Server error while fetching donations' });
  }
});

app.post('/submit_lost_item', (req, res) => {
  try {
    const { itemName, description, location, contactInfo, timestamp } = req.body;
    
    if (!itemName || !description || !location || !contactInfo) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const newLostItem = {
      id: Date.now().toString(),
      itemName,
      description,
      location,
      contactInfo,
      timestamp: timestamp || new Date().toISOString(),
      status: 'Lost',
      type: 'lost'
    };
    
    const filePath = path.join(__dirname, 'lost_found.json');
    let items = [];
    
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath);
      items = JSON.parse(existing);
    }
    
    items.push(newLostItem);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    
    res.json({ 
      message: 'Lost item reported successfully!',
      itemId: newLostItem.id
    });
    
  } catch (error) {
    console.error('Error submitting lost item:', error);
    res.status(500).json({ message: 'Server error during lost item submission' });
  }
});

app.post('/submit_found_item', (req, res) => {
  try {
    const { itemName, description, location, foundBy, timestamp } = req.body;
    
    if (!itemName || !description || !location || !foundBy) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const newFoundItem = {
      id: Date.now().toString(),
      itemName,
      description,
      location,
      foundBy,
      timestamp: timestamp || new Date().toISOString(),
      status: 'Found',
      type: 'found'
    };
    
    const filePath = path.join(__dirname, 'lost_found.json');
    let items = [];
    
    if (fs.existsSync(filePath)) {
      const existing = fs.readFileSync(filePath);
      items = JSON.parse(existing);
    }
    
    items.push(newFoundItem);
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
    
    res.json({ 
      message: 'Found item reported successfully!',
      itemId: newFoundItem.id
    });
    
  } catch (error) {
    console.error('Error submitting found item:', error);
    res.status(500).json({ message: 'Server error during found item submission' });
  }
});

app.get('/lost_found_items', (req, res) => {
  try {
    const filePath = path.join(__dirname, 'lost_found.json');
    
    if (!fs.existsSync(filePath)) {
      return res.json([]);
    }
    
    const items = fs.readFileSync(filePath);
    res.json(JSON.parse(items));
    
  } catch (error) {
    console.error('Error fetching lost and found items:', error);
    res.status(500).json({ message: 'Server error while fetching lost and found items' });
  }
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});