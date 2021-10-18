import * as path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

import Game from './Game.js';

const app = express();

const http = createServer(app);
const io = new Server(http, {
    cors: {
        origin: "*"
    }
});

var rooms = {};
var games = {};

// API Routing
const port = process.env.PORT || 4000;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.set('port', port);
app.use(express.static(path.resolve(__dirname, '../client/build')));

/**
app.get('/join/:code', (req, res) => {
    let {code} = req.params;
    if (code in games && games[code].players < games[code].playerLimit){
        // Join game!
        return;
    }

    res.redirect('/');
});
**/

http.listen(port, () => {
    console.log(`Server started at port ${port}`);
});

function generateRoomCode() {
    let code = Math.round(Math.pow(36, 5) - Math.random() * Math.pow(36, 4)).toString(36).slice(1);
    if (code in rooms) {
        return generateRoomCode();
    }
    else {
        return code;
    }
}

io.on('connection', (socket) => {
    socket.on('disconnect', () => {
        games[rooms[socket.id]]?.kick(socket);
        delete rooms[socket.id];
    });

    socket.on('leave-game', () => {
        games[rooms[socket.id]]?.kick(socket);
        delete rooms[socket.id];
    });

    socket.on('create-room', ({ name, mode }) => {
        if (socket.id in rooms) {
            return;
        }

        let code = generateRoomCode();
        socket.join(code);
        rooms[socket.id] = code;

        games[code] = new Game(io, socket, name, code, mode);
    });

    socket.on('join-room', ({ name, code }) => {
        if (socket.id in rooms) {
            return;
        }

        if (code in games) {
            if (games[code].join(socket, name, code)){
                rooms[socket.id] = code;
            }
        }
        else {
            socket.emit('join-game-invalid');
        }
    });

    socket.on('change-admin', ({playerSettingsAuth, playerLimit}) => {
        if (!(socket.id in rooms)) {
            return;
        }

        games[rooms[socket.id]]?.updateAdmin(socket, playerSettingsAuth, playerLimit);
    });

    socket.on('change-settings', ({amount, time, tests, sortExam}) => {
        if (!(socket.id in rooms)) {
            return;
        }

        games[rooms[socket.id]]?.updateSettings(socket, amount, time, tests, sortExam);
    });

    socket.on('start-game', async () => {
        if (!(socket.id in rooms)) {
            return;
        }

        await games[rooms[socket.id]].startGame(socket);
    });

    socket.on('submit-exam', ({response}) => {
        if (!(socket.id in rooms)) {
            return;
        }

        let finished = games[rooms[socket.id]].submit(socket, response);
        if (finished){
            for (let i = 0; i < finished.length; ++i){
                delete rooms[finished[i]];
            }
        }
    });
});
