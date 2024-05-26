const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, 'data', 'tournaments.json');

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));

const loadTournaments = () => {
  if (fs.existsSync(DATA_FILE)) {
    const rawData = fs.readFileSync(DATA_FILE);
    return JSON.parse(rawData);
  }
  return [];
};

const saveTournaments = (tournaments) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(tournaments, null, 2));
};

let tournaments = loadTournaments();

app.get('/api/tournaments', (req, res) => {
  res.json(tournaments);
});

app.post('/api/tournaments', (req, res) => {
  const newTournament = req.body;
  tournaments.push(newTournament);
  saveTournaments(tournaments);
  res.status(201).json(newTournament);
});

app.put('/api/tournaments/:id', (req, res) => {
  const { id } = req.params;
  const updatedTournament = req.body;
  tournaments = tournaments.map((t) =>
    t.id === parseInt(id) ? updatedTournament : t
  );
  saveTournaments(tournaments);
  res.json(updatedTournament);
});

app.delete('/api/tournaments/:id', (req, res) => {
  const { id } = req.params;
  tournaments = tournaments.filter((t) => t.id !== parseInt(id));
  saveTournaments(tournaments);
  res.status(204).end();
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
