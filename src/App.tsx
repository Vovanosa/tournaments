import React, { useState, useEffect } from 'react';
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
  matches: TournamentMatch[];
};

const App = () => {
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [updateModalIsOpen, setUpdateModalIsOpen] = useState(false);
  const [openModalIsOpen, setOpenModalIsOpen] = useState(false);
  const [numTeams, setNumTeams] = useState(2);
  const [teamNames, setTeamNames] = useState<string[]>([]);
  const [randomizeTeams, setRandomizeTeams] = useState(false);
  const [tournamentName, setTournamentName] = useState('');
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [currentTournament, setCurrentTournament] = useState<Tournament | null>(
    null
  );

  useEffect(() => {
    axios
      .get('/api/tournaments')
      .then((response) => setTournaments(response.data))
      .catch((error) => console.error('Error fetching tournaments:', error));
  }, []);

  const toggleModal = () => {
    if (!modalIsOpen) {
      setNumTeams(2);
      setTeamNames([]);
      setRandomizeTeams(false);
      setTournamentName('');
    }
    setModalIsOpen(!modalIsOpen);
  };

  const toggleUpdateModal = () => {
    setUpdateModalIsOpen(!updateModalIsOpen);
  };

  const toggleOpenModal = () => {
    setOpenModalIsOpen(!openModalIsOpen);
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
      Array.from({ length: parseInt(value) }, (_, index) => `Team ${index + 1}`)
    );
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

  const handleCreateTournament = () => {
    const newMatches = generateMatches(teamNames, randomizeTeams);
    const newTournament = {
      id: tournaments.length + 1,
      name: tournamentName,
      matches: newMatches,
    };
    axios
      .post('/api/tournaments', newTournament)
      .then((response) => {
        setTournaments([...tournaments, response.data]);
        setCurrentTournament(response.data);
        toggleModal();
      })
      .catch((error) => console.error('Error creating tournament:', error));
  };

  const handleDeleteTournament = () => {
    if (currentTournament) {
      if (window.confirm('Are you sure you want to delete this tournament?')) {
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
      clickedParticipant.resultText = 'Winner';
      otherParticipant.resultText = 'Lost';
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

    if (currentMatch.startTime === 'Date unknown') {
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
    setCurrentTournament(tournament);
    toggleOpenModal();
  };

  return (
    <>
      <header>
        <h1>Турнірна таблиця</h1>
      </header>
      <Button
        buttonText='Create Tournament'
        handleClick={toggleModal}
        disabled={false}
      />
      <Button
        buttonText='Open Tournament'
        handleClick={toggleOpenModal}
        disabled={tournaments.length === 0}
      />
      <Button
        buttonText='Update'
        handleClick={toggleUpdateModal}
        disabled={!currentTournament}
      />
      <Button
        buttonText='Delete Tournament'
        handleClick={handleDeleteTournament}
        disabled={!currentTournament}
      />
      <Modal isOpen={modalIsOpen} onRequestClose={toggleModal}>
        <h2>Select Number of Teams</h2>
        <InputText
          id='tournamentName'
          name='tournamentName'
          value={tournamentName}
          onChange={(e) => setTournamentName(e.target.value)}
          inputText={'Tournament name'}
        />
        <Selector
          defaultOption='Select Number of Teams'
          options={['2', '4', '8', '16', '32']}
          setSelectedValue={handleNumTeamsChange}
        />
        <Checkbox isChecked={randomizeTeams} onChange={handleRandomizeChange}>
          Randomize Teams
        </Checkbox>
        <Button
          buttonText='Create Tournament'
          handleClick={handleCreateTournament}
          disabled={!Boolean(teamNames.length)}
        />
        <Button
          buttonText='Cancel'
          handleClick={toggleModal}
          disabled={false}
        />
        {teamNames.map((teamName, index) => (
          <div className='create_modal' key={index}>
            <label htmlFor={`teamName${index}`}>{`Team ${
              index + 1
            } name:`}</label>
            <InputText
              autoFocus={index === 0}
              id={`teamName${index}`}
              name={`teamName${index}`}
              value={teamName}
              onChange={(e) => handleTeamNameChange(index, e.target.value)}
              inputText={''}
            />
          </div>
        ))}
      </Modal>

      <Modal isOpen={openModalIsOpen} onRequestClose={toggleOpenModal}>
        <h2>Select Tournament</h2>
        {tournaments.map((tournament) => (
          <Button
            disabled={currentTournament?.id === tournament.id}
            key={tournament.id}
            buttonText={`Tournament ${tournament.name}`}
            handleClick={() => handleOpenTournament(tournament)}
          />
        ))}
        <Button buttonText='Cancel' handleClick={toggleOpenModal} />
      </Modal>

      {currentTournament && (
        <Modal isOpen={updateModalIsOpen} onRequestClose={toggleUpdateModal}>
          <Button buttonText='Apply Changes' handleClick={handleApplyChanges} />
          <Button buttonText='Exit' handleClick={toggleUpdateModal} />
          <h2>Update Matches</h2>
          <div className='matches'>
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
                  <div key={roundIndex}>
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
                        <div className='match' key={match.id}>
                          {match.participants.map(
                            (participant, participantIndex) => (
                              <div key={participant.id}>
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
                                  disabled={!participant.name}
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
                                  Winner
                                </Checkbox>
                              </div>
                            )
                          )}
                          <label htmlFor={`matchDate${match.id}`}>
                            Match Date:
                          </label>
                          <input
                            type='date'
                            id={`matchDate${match.id}`}
                            name={`matchDate${match.id}`}
                            value={
                              match.startTime === 'Date unknown'
                                ? ''
                                : match.startTime
                            }
                            onChange={(e) =>
                              handleDateChange(match.id, e.target.value)
                            }
                          />
                        </div>
                      ))}
                  </div>
                ))}
          </div>
        </Modal>
      )}

      {currentTournament && (
        <SingleEliminationBracket
          matches={currentTournament.matches}
          matchComponent={Match}
        />
      )}
    </>
  );
};

export default App;
