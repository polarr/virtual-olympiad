import './styles/App.scss';
import './styles/Menu.scss';
import './styles/Lobby.scss';
import './styles/Exam.scss';

import Lobby from './Lobby.js';
import Exam from './Exam.js';
import Menu from './Menu.js';

import React, {useState, useEffect} from 'react';
import io from 'socket.io-client';

function App() {
  const [socket, setSocket] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(()=> {
    const newSocket = io();
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  useEffect(()=> {
    if (socket == null){
      return;
    }
    function joinMenu(){
      setPage(0);
    }
    function joinLobby(){
      setPage(1);
    }
    function joinGame(){
      setPage(2);
    }

    socket.on("page-menu", joinMenu);
    socket.on("page-lobby", joinLobby);
    socket.on("page-exam", joinGame);

    return ()=> {
      socket.off("page-menu", joinMenu);
      socket.off("page-lobby", joinLobby);
      socket.off("page-exam", joinGame);
    };
  }, [socket]);

  if (socket){
    switch(page){
      case 1:
        return (
          <div className="App">
            <Lobby socket = {socket}/>
          </div>
        );
      case 2:
        return (
          <div className="App">
            <Exam socket = {socket}/>
          </div>
        );
      case 0: default:
        return (
          <div className="App">
            <Menu socket = {socket} />
          </div>
        );
    }
  }

  return (
    <div className="App">
      Not connected to server...
    </div>
  );
}

export default App;
