import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Button from './components/ui-kit/button';
import Selector from './components/ui-kit/selector';
import InputText from './components/ui-kit/inputText';
import Checkbox from './components/ui-kit/checkbox';
import Modal from 'react-modal';
import {
  SingleEliminationBracket,
  Match,
} from '@g-loot/react-tournament-brackets';

Modal.setAppElement('#root');
axios.defaults.baseURL = 'http://localhost:5000';
const bcrypt = require('bcryptjs');

type Participant = {
  id: number;
  name: string;
  picture: string;
  resultText: string;
  isWinner: boolean;
  status: string | null;
};

type TournamentMatch = {
  id: number;
  nextMatchId: number | null;
  tournamentRoundText: string;
  startTime: string;
  state: string;
  participants: Participant[];
};

type Tournament = {
  id: number;
  name: string;
  creator: string;
  privacy: string;
  matches: TournamentMatch[];
};

type User = {
  id: number;
  name: string;
  role: string;
  password: string;
  isLoggedIn: boolean;
};

const App = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [updateModalIsOpen, setUpdateModalIsOpen] = useState(false);
  const [openModalIsOpen, setOpenModalIsOpen] = useState(false);
  const [userModalIsOpen, setUserModalIsOpen] = useState(false);
  const [createUserModalIsOpen, setCreateUserModalIsOpen] = useState(false);
  const [numTeams, setNumTeams] = useState(2);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [randomizeTeams, setRandomizeTeams] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(
    null
  );
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [isPrivate, setIsPrivate] = useState('private');
  useEffect(() => {
    axios
      .get('/api/tournaments')
      .then((response) => setTournaments(response.data))
      .catch((error) => console.error('Error fetching tournaments:', error));

    axios
      .get('/api/users')
      .then((response) => {
        setUsers(response.data);
        const loggedInUser = response.data.find(
          (user: User) => user.isLoggedIn
        );
        if (loggedInUser) {
          setCurrentUser(loggedInUser);
        }
      })

      .catch((error) => console.error('Error fetching users:', error));
  }, []);

  const toggleUpdateModal = () => {
    setUpdateModalIsOpen(!updateModalIsOpen);
  };

  const toggleOpenModal = () => {
    setOpenModalIsOpen(!openModalIsOpen);
  };

  const generateMatches = (
    teamNames: string[],
    randomizeTeams: boolean
  ): TournamentMatch[] => {
    let participants: Participant[] = teamNames.map((name, index) => ({
      id: 1 + index,
      name,
      picture: '',
      resultText: '',
      isWinner: false,
      status: null,
    }));

    if (randomizeTeams) {
      for (let i = participants.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [participants[i], participants[j]] = [participants[j], participants[i]];
      }
    }

    const matches: TournamentMatch[] = [];
    let matchId = 1;
    const currentTime = new Date().toISOString().split('T')[0];

    for (
      let round = 1, numMatches = teamNames.length / 2;
      numMatches > 0 && matchId < numTeams;
      round++, numMatches /= 2
    ) {
      const roundMatches: TournamentMatch[] = [];
      for (let i = 0; i < numMatches; i++) {
        const match: TournamentMatch = {
          id: matchId++,
          nextMatchId: null,
          tournamentRoundText: round.toString(),
          startTime: currentTime,
          state: 'SCHEDULED',
          participants: [],
        };
        roundMatches.push(match);
        matches.push(match);
      }
    }

    for (let i = 0; i < participants.length / 2; i++) {
      matches[i].participants.push(participants[i * 2]);
      matches[i].participants.push(participants[i * 2 + 1]);
    }

    let offset = 0;
    for (
      let round = 1, numMatches = teamNames.length / 2;
      numMatches > 1;
      round++, numMatches /= 2
    ) {
      for (let i = 0; i < numMatches; i++) {
        matches[offset + i].nextMatchId =
          matches[offset + numMatches + Math.floor(i / 2)].id;
      }
      offset += numMatches;
    }

    return matches;
  };

  const toggleModal = () => {
    toggleOpenModal();
    if (!modalIsOpen) {
      setNumTeams(2);
      setTeamNames([]);
      setRandomizeTeams(false);
      setTournamentName('');
    }
    setModalIsOpen(!modalIsOpen);
  };

  const toggleUserModal = () => {
    setUserModalIsOpen(!userModalIsOpen);
    setLoginUsername('');
    setLoginPassword('');
  };

  const toggleCreateUserModal = () => {
    setCreateUserModalIsOpen(!createUserModalIsOpen);
    setNewUserName('');
    setNewUserPassword('');
  };

  const handleTeamNameChange = (index: number, value: string) => {
    const newTeamNames = [...teamNames];
    newTeamNames[index] = value;
    setTeamNames(newTeamNames);
  };

  const handleRandomizeChange = () => {
    setRandomizeTeams(!randomizeTeams);
  };

  const handleNumTeamsChange = (value: string) => {
    setNumTeams(parseInt(value));
    setTeamNames(
      Array.from(
        { length: parseInt(value) },
        (_, index) => `Команда ${index + 1}`
      )
    );
  };

  const handleCreateTournament = () => {
    if (!currentUser) return;
    if (!tournaments.some((tournament) => tournament.name === tournamentName)) {
      const newMatches = generateMatches(teamNames, randomizeTeams);
      const newTournament = {
        id: Date.now(),
        name: tournamentName,
        creator: currentUser.name,
        privacy: isPrivate,
        matches: newMatches,
      };
      axios
        .post('/api/tournaments', newTournament)
        .then((response) => {
          setTournaments([...tournaments, response.data]);
          setCurrentTournament(response.data);
          toggleModal();
          setIsPrivate('private');
        })
        .catch((error) => console.error('Error creating tournament:', error));
    } else {
      alert('Турнір з такою назвою вже існує');
      setTournamentName('');
    }
  };

  const handleDeleteTournament = () => {
    if (currentTournament) {
      if (window.confirm('Ви дійсно хочете видалити цей турнір?')) {
        axios
          .delete(`/api/tournaments/${currentTournament.id}`)
          .then(() => {
            setTournaments(
              tournaments.filter((t) => t.id !== currentTournament.id)
            );
            setCurrentTournament(null);
          })
          .catch((error) => console.error('Error deleting tournament:', error));
      }
    }
  };

  const handleWinnerChange = (
    roundIndex: number,
    matchIndex: number,
    participantIndex: number
  ) => {
    if (!currentTournament) return;
    const newMatches = [...currentTournament.matches];
    const currentMatch = newMatches.filter(
      (m) => parseInt(m.tournamentRoundText) === roundIndex + 1
    )[matchIndex];

    const clickedParticipant = currentMatch.participants[participantIndex];
    const otherParticipantIndex = participantIndex === 0 ? 1 : 0;
    const otherParticipant = currentMatch.participants[otherParticipantIndex];
    const wasWinner = clickedParticipant.isWinner;

    currentMatch.participants.forEach((participant) => {
      participant.isWinner = false;
      participant.resultText = '';
    });

    if (!wasWinner) {
      clickedParticipant.isWinner = true;
      clickedParticipant.resultText = 'Перемога';
      otherParticipant.resultText = 'Програш';
    }

    let nextMatchId = currentMatch.nextMatchId;
    while (nextMatchId !== null) {
      const nextMatch = newMatches.find((match) => match.id === nextMatchId);
      if (nextMatch) {
        nextMatch.participants = [];
        nextMatch.state = 'SCHEDULED';

        nextMatchId = nextMatch.nextMatchId;
      } else {
        nextMatchId = null;
      }
    }

    if (currentMatch.startTime === 'Дата невідома') {
      currentMatch.startTime = new Date().toISOString().split('T')[0];
    }

    const updatedTournament = { ...currentTournament, matches: newMatches };
    setCurrentTournament(updatedTournament);
    setTournaments(
      tournaments.map((t) =>
        t.id === currentTournament.id ? updatedTournament : t
      )
    );

    axios
      .put(`/api/tournaments/${currentTournament.id}`, updatedTournament)
      .catch((error) => console.error('Error updating tournament:', error));
  };

  const handleApplyChanges = () => {
    if (!currentTournament) return;
    const newMatches = [...currentTournament.matches];

    newMatches.forEach((match) => {
      if (match.participants.some((participant) => participant.isWinner)) {
        match.state = 'SCORE_DONE';
        match.participants.forEach((participant) => {
          participant.status = 'PLAYED';
        });

        const winner = match.participants.find(
          (participant) => participant.isWinner
        );
        if (winner && match.nextMatchId !== null) {
          const nextMatch = newMatches.find(
            (nextMatch) => nextMatch.id === match.nextMatchId
          );
          if (nextMatch) {
            if (nextMatch.participants.length < 2) {
              nextMatch.participants.push({
                ...winner,
                resultText: '',
                isWinner: false,
                status: null,
              });
            } else {
              nextMatch.participants[
                nextMatch.participants.findIndex((p) => !p)
              ] = {
                ...winner,
                resultText: '',
                isWinner: false,
                status: null,
              };
            }
          }
        }
      }
    });

    const updatedTournament = { ...currentTournament, matches: newMatches };
    setCurrentTournament(updatedTournament);
    setTournaments(
      tournaments.map((t) =>
        t.id === currentTournament.id ? updatedTournament : t
      )
    );

    axios
      .put(`/api/tournaments/${currentTournament.id}`, updatedTournament)
      .catch((error) => console.error('Error updating tournament:', error));
  };

  const handleDateChange = (matchId: number, date: string) => {
    if (!currentTournament) return;
    const newMatches = [...currentTournament.matches];
    const match = newMatches.find((match) => match.id === matchId);
    if (match) {
      match.startTime = date;
    }
    const updatedTournament = { ...currentTournament, matches: newMatches };
    setCurrentTournament(updatedTournament);
    setTournaments(
      tournaments.map((t) =>
        t.id === currentTournament.id ? updatedTournament : t
      )
    );

    axios
      .put(`/api/tournaments/${currentTournament.id}`, updatedTournament)
      .catch((error) => console.error('Error updating tournament:', error));
  };

  const isMatchValid = (match: TournamentMatch) => {
    if (match.participants.length !== 2) {
      return false;
    }
    const [p1, p2] = match.participants;
    return p1.id !== p2.id;
  };

  const handleParticipantNameChange = (
    roundIndex: number,
    matchIndex: number,
    participantIndex: number,
    newValue: string
  ) => {
    if (!currentTournament) return;
    const newMatches = [...currentTournament.matches];
    const filteredMatch = newMatches.filter(
      (m) => parseInt(m.tournamentRoundText) === roundIndex + 1
    )[matchIndex];
    filteredMatch.participants[participantIndex].name = newValue;
    const updatedTournament = { ...currentTournament, matches: newMatches };
    setCurrentTournament(updatedTournament);
    setTournaments(
      tournaments.map((t) =>
        t.id === currentTournament.id ? updatedTournament : t
      )
    );

    axios
      .put(`/api/tournaments/${currentTournament.id}`, updatedTournament)
      .catch((error) => console.error('Error updating tournament:', error));
  };

  const handleOpenTournament = (tournament: Tournament) => {
    let filteredTournaments: Tournament[] = [];

    if (currentUser) {
      if (currentUser.role === 'admin') {
        filteredTournaments = tournaments;
      } else if (currentUser.role === 'user') {
        filteredTournaments = tournaments.filter(
          (t) => t.privacy === 'public' || t.creator === currentUser.name
        );
      } else if (currentUser.role === 'guest') {
        filteredTournaments = tournaments.filter((t) => t.privacy === 'public');
      }
    }

    setTournaments(filteredTournaments);
    setCurrentTournament(tournament);
    toggleOpenModal();
  };

  const handleCreateUser = async () => {
    if (users.some((user) => user.name === newUserName)) {
      alert('Користувач з таким іменем вже існує');
      setNewUserName('');
      setNewUserPassword('');
    } else {
      try {
        const hashedPassword = await bcrypt.hash(newUserPassword, 10);

        if (currentUser) {
          const endpoint = `/api/users/${currentUser.id}`;
          const updatedCurrentUser = { ...currentUser, isLoggedIn: false };
          setCurrentUser(updatedCurrentUser);
          await axios.put(endpoint, updatedCurrentUser);
        }

        const newUser = {
          id: Date.now(),
          name: newUserName,
          password: hashedPassword,
          role: 'user',
          isLoggedIn: true,
        };

        const response = await axios.post('/api/users', newUser);
        setUsers([...users, response.data]);
        setCurrentUser(response.data);
        setNewUserName('');
        setNewUserPassword('');
        toggleCreateUserModal();
      } catch (error) {
        console.error('Error creating user:', error);
      }
    }
  };

  const handleLogin = async () => {
    try {
      const user = users.find((u) => u.name === loginUsername);
      if (user) {
        const isMatch = await bcrypt.compare(loginPassword, user.password);
        if (isMatch) {
          if (currentUser) {
            const updatedCurrentUser = { ...currentUser, isLoggedIn: false };
            await axios.put(`/api/users/${currentUser.id}`, updatedCurrentUser);
          }

          const updatedUser = { ...user, isLoggedIn: true };
          await axios.put(`/api/users/${user.id}`, updatedUser);

          setCurrentUser(user);
          setUserModalIsOpen(false);
          setCurrentTournament(null);
        } else {
          alert("Неправильне ім'я або пароль");
        }
      } else {
        alert("Неправильне ім'я або пароль");
      }
    } catch (error) {
      console.error('Error logging in:', error);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      const updatedCurrentUser = { ...currentUser, isLoggedIn: false };
      await axios.put(`/api/users/${currentUser.id}`, updatedCurrentUser);

      setCurrentUser(null);
    }
  };

  return (
    <>
      <header>
        <section className='left-content'>
          <h1>Ткрнірна таблиця </h1>
          <Button
            buttonText='Відкрити турнір'
            handleClick={toggleOpenModal}
            disabled={false}
          />
        </section>

        <section className='right-content'>
          {currentUser ? <h2>Вітаю, {currentUser.name} !</h2> : ''}
          <Button
            handleClick={toggleUserModal}
            buttonText={currentUser ? 'Змінити користувача' : 'Ввійти'}
          />
        </section>
      </header>

      {currentTournament && (
        <>
          <Button
            buttonText='Оновити турнір'
            handleClick={toggleUpdateModal}
            disabled={
              currentUser?.role !== 'admin' &&
              currentUser?.name !== currentTournament.creator
            }
          />
          <Button
            className='red-button'
            buttonText='Видалити турнір'
            handleClick={handleDeleteTournament}
            disabled={
              currentUser?.role !== 'admin' &&
              currentUser?.name !== currentTournament.creator
            }
          />
        </>
      )}

      <Modal
        className={'modal'}
        isOpen={modalIsOpen}
        onRequestClose={toggleModal}
      >
        <h2>Кількість команд</h2>
        <InputText
          id='tournamentName'
          name='tournamentName'
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          inputText={'Назва турніру'}
        />
        <Selector
          defaultOption='Кількість команд'
          options={['2', '4', '8', '16', '32']}
          setSelectedValue={handleNumTeamsChange}
        />
        <Checkbox isChecked={randomizeTeams} onChange={handleRandomizeChange}>
          Перемішати команди
        </Checkbox>
        <Checkbox
          isChecked={isPrivate === 'public'}
          onChange={() => {
            setIsPrivate(isPrivate === 'public' ? 'private' : 'public');
          }}
        >
          Публічний матч
        </Checkbox>
        <br />
        <Button
          buttonText='Створити турнір'
          handleClick={handleCreateTournament}
          disabled={!Boolean(teamNames.length) || !currentUser}
        />
        <Button
          className='red-button'
          buttonText='Відмінити'
          handleClick={toggleModal}
          disabled={false}
        />
        {teamNames.map((teamName, index) => (
          <section className='create_modal' key={index}>
            <label htmlFor={`teamName${index}`}>{`Ім'я ${
              index + 1
            } команди: `}</label>
            <InputText
              autoFocus={index === 0}
              id={`teamName${index}`}
              name={`teamName${index}`}
              value={teamName}
              onChange={(e) => handleTeamNameChange(index, e.target.value)}
              inputText={''}
            />
          </section>
        ))}
      </Modal>

      <Modal
        className={'modal'}
        isOpen={openModalIsOpen}
        onRequestClose={toggleOpenModal}
      >
        <h2>Вибрати турнір</h2>
        {currentUser && currentUser.role !== 'guest' && (
          <>
            <h3>Мої турніри</h3>
            {tournaments.filter(
              (tournament) => tournament.creator === currentUser.name
            ).length === 0
              ? 'Відсутні'
              : tournaments
                  .filter(
                    (tournament) => tournament.creator === currentUser.name
                  )
                  .map((tournament) => (
                    <Button
                      disabled={currentTournament?.id === tournament.id}
                      key={tournament.id}
                      buttonText={`Турнір: ${tournament.name}`}
                      handleClick={() => handleOpenTournament(tournament)}
                    />
                  ))}
            <h3>Всі турніри</h3>
          </>
        )}

        {tournaments
          .filter((tournament) =>
            currentUser?.role !== 'admin'
              ? tournament.creator !== currentUser?.name &&
                tournament.privacy === 'public'
              : tournament.creator !== currentUser?.name
          )
          .map((tournament) => (
            <Button
              disabled={currentTournament?.id === tournament.id}
              key={tournament.id}
              buttonText={`Турнір: ${tournament.name}`}
              handleClick={() => handleOpenTournament(tournament)}
            />
          ))}
        <section className='loginsignup'>
          <Button
            buttonText='Створити турнір'
            handleClick={toggleModal}
            disabled={currentUser?.role === 'guest' || !currentUser}
          />
          <Button
            buttonText='Відмінити'
            handleClick={toggleOpenModal}
            className='red-button'
          />
        </section>
      </Modal>

      {currentTournament && (
        <Modal
          className={'modal'}
          isOpen={updateModalIsOpen}
          onRequestClose={toggleUpdateModal}
        >
          <Button
            buttonText='Прийняти зміни'
            handleClick={handleApplyChanges}
          />
          <Button buttonText='На головну' handleClick={toggleUpdateModal} />
          <h2>Оновити матч</h2>
          <section className='matches'>
            {currentTournament &&
              Array.from(
                new Set(
                  currentTournament.matches.map((match) =>
                    parseInt(match.tournamentRoundText)
                  )
                )
              )
                .sort((a, b) => a - b)
                .map((roundIndex) => (
                  <section key={roundIndex}>
                    {currentTournament.matches
                      .filter(
                        (match) =>
                          parseInt(match.tournamentRoundText) === roundIndex &&
                          isMatchValid(match) &&
                          (roundIndex === 1 ||
                            currentTournament.matches.some(
                              (m) =>
                                m.state === 'SCORE_DONE' &&
                                parseInt(m.tournamentRoundText) ===
                                  roundIndex - 1
                            ))
                      )
                      .map((match, matchIndex) => (
                        <section className='match' key={match.id}>
                          {match.participants.map(
                            (participant, participantIndex) => (
                              <section key={participant.id}>
                                <InputText
                                  autoFocus={false}
                                  id={`participantName${participant.id}`}
                                  name={`participantName${participant.id}`}
                                  value={participant.name || 'No participant'}
                                  onChange={(e) =>
                                    handleParticipantNameChange(
                                      roundIndex - 1,
                                      matchIndex,
                                      participantIndex,
                                      e.target.value
                                    )
                                  }
                                  disabled
                                  inputText={''}
                                />
                                <Checkbox
                                  isChecked={participant.isWinner}
                                  onChange={() =>
                                    handleWinnerChange(
                                      roundIndex - 1,
                                      matchIndex,
                                      participantIndex
                                    )
                                  }
                                >
                                  Переможець
                                </Checkbox>
                              </section>
                            )
                          )}
                          <label htmlFor={`matchDate${match.id}`}>
                            Дата матчу:
                          </label>
                          <input
                            type='date'
                            id={`matchDate${match.id}`}
                            name={`matchDate${match.id}`}
                            value={
                              match.startTime === 'Дата невідома'
                                ? ''
                                : match.startTime
                            }
                            onChange={(e) =>
                              handleDateChange(match.id, e.target.value)
                            }
                          />
                        </section>
                      ))}
                  </section>
                ))}
          </section>
        </Modal>
      )}
      <Modal
        className={'modal signin'}
        isOpen={userModalIsOpen}
        onRequestClose={toggleUserModal}
      >
        <h2>Ввійти</h2>
        <InputText
          id={'loginUsername'}
          name={'loginUsername'}
          value={loginUsername}
          onChange={(e) => setLoginUsername(e.target.value)}
          inputText={'Логін'}
        />
        <br />
        <InputText
          id={'loginPassword'}
          name={'loginPassword'}
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          inputText={'Пароль'}
          password={true}
        />
        <br />
        <section className='loginsignup'>
          <Button handleClick={handleLogin} buttonText='Ввійти' />
          <Button
            handleClick={toggleCreateUserModal}
            buttonText='Зареєструватись'
          />
        </section>

        <Button
          handleClick={toggleUserModal}
          buttonText='Відмінити'
          className='red-button'
        />
        {currentUser && (
          <Button handleClick={handleLogout} buttonText='Вийти' />
        )}
      </Modal>

      <Modal
        className={'modal signin'}
        isOpen={createUserModalIsOpen}
        onRequestClose={toggleCreateUserModal}
      >
        <h2>Реєстрація</h2>
        <label>
          <InputText
            id='newUserName'
            name='NewUserName'
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            inputText={'Логін'}
          />
          <InputText
            id='newUserPasswod'
            name='NewUserPasswod'
            value={newUserPassword}
            onChange={(e) => setNewUserPassword(e.target.value)}
            inputText={'Пароль (мін. 8 символів)'}
            password={true}
          />
        </label>
        <section className='loginsignup'>
          <Button
            disabled={newUserName.length < 4 || newUserPassword.length < 8}
            handleClick={handleCreateUser}
            buttonText='Зареєструватись'
          />
          <Button
            handleClick={toggleCreateUserModal}
            buttonText='Відмінити'
            className='red-button'
          />
        </section>
      </Modal>

      {currentTournament && (
        <>
          <br />
          Ім'я турніру: {currentTournament.name}
          <SingleEliminationBracket
            matches={currentTournament.matches}
            matchComponent={Match}
          />
        </>
      )}
    </>
  );
};

export default App;
