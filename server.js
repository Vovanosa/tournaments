const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = 5000;
const TOURNAMENTS_FILE = path.join(__dirname, 'data', 'tournaments.json');
const USERS_FILE = path.join(__dirname, 'data', 'users.json');

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const loadData = (file) => {
  if (fs.existsSync(file)) {
    const rawData = fs.readFileSync(file);
    return JSON.parse(rawData);
  }
  return [];
};

const saveData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

let tournaments = loadData(TOURNAMENTS_FILE);
let users = loadData(USERS_FILE);

app.get('/api/tournaments', (req, res) => {
  res.json(tournaments);
});

app.post('/api/tournaments', (req, res) => {
  const newTournament = req.body;
  tournaments.push(newTournament);
  saveData(TOURNAMENTS_FILE, tournaments);
  res.status(201).json(newTournament);
});

app.put('/api/tournaments/:id', (req, res) => {
  const { id } = req.params;
  const updatedTournament = req.body;
  tournaments = tournaments.map((t) =>
    t.id === parseInt(id) ? updatedTournament : t
  );
  saveData(TOURNAMENTS_FILE, tournaments);
  res.json(updatedTournament);
});

app.delete('/api/tournaments/:id', (req, res) => {
  const { id } = req.params;
  tournaments = tournaments.filter((t) => t.id !== parseInt(id));
  saveData(TOURNAMENTS_FILE, tournaments);
  res.status(204).end();
});

app.get('/api/users', (req, res) => {
  res.json(users);
});

app.post('/api/users', (req, res) => {
  const newUser = req.body;
  users.push(newUser);
  saveData(USERS_FILE, users);
  res.status(201).json(newUser);
});

app.put('/api/users/:id', (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body;
  users = users.map((u) => (u.id === parseInt(id) ? updatedUser : u));
  saveData(USERS_FILE, users);
  res.json(updatedUser);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
