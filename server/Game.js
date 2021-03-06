import { tests, fetchProblems } from "./scrape.js";
import _ from "lodash";
const { pick } = _;

function isInt(str) {
    return (
        !isNaN(str) &&
        !isNaN(parseFloat(str)) &&
        Number.isInteger(parseFloat(str, 10))
    );
}

class AdjustingTimer {
    constructor(callback, interval) {
        this.callback = callback;
        this.interval = interval;
        this.expected, this.timeout;
    }

    step() {
        let drift = Date.now() - this.expected;
        if (drift > this.interval) {
            // Browser inactive?
        }

        this.callback();
        this.expected += this.interval;
        this.timeout = setTimeout(
            this.step.bind(this),
            Math.max(0, this.interval - drift)
        );
    }

    start() {
        this.expected = Date.now() + this.interval;
        this.timeout = setTimeout(this.step.bind(this), this.interval);
    }

    stop() {
        clearTimeout(this.timeout);
    }
}

class Player {
    constructor(id, name, status, answers, time, score) {
        this.id = id;
        this.name = name;
        this.status = status;
        this.answers = answers;
        this.time = time;
        this.score = score;
    }

    clientInfo() {
        return { id: this.id, name: this.name, status: this.status };
    }

    clientResults() {
        return {
            id: this.id,
            name: this.name,
            score: this.score,
            time: this.time,
        };
    }
}

class Game {
    constructor(io, socket, name, code, mode) {
        this.io = io;

        this.owner = socket.id;
        this.code = code;
        this.mode = mode;
        this.admin = {
            playerSettingsAuth: false,
            playerLimit: 4,
        };

        this.players = {};

        this.settings = {
            amount: 10,
            timeLimit: 30,
            avaliableTests: Object.entries(tests).map((test) => {
                return test[1].name;
            }),
            tests: new Array(Object.keys(tests).length).fill(false),
            sortExam: true,
        };

        this.started = false;
        this.ended = false;
        this.exam = {
            problems: [],
            clientProblems: [],
            answers: [],
            timeLeft: 0,
            timer: null,
        };

        this.players[socket.id] = new Player(socket.id, name, 0, [], 0, 0);

        socket.emit("page-lobby");

        setTimeout(() => {
            this.emitPlayers();
            this.emitAdmin();
            this.emitSettings();
        }, 100);
    }

    emit(title, info) {
        this.io.to(this.code).emit(title, info);
    }

    join(socket, name, code) {
        if (Object.keys(this.players).length < this.admin.playerLimit) {
            const { id } = socket;

            socket.join(code);
            this.players[id] = new Player(id, name, 0, [], 0, 0);

            if (this.started) {
                socket.emit("page-exam");
                setTimeout(() => {
                    this.emitPlayers();
                    socket.emit("exam-details", {
                        problems: this.exam.clientProblems,
                        time: this.exam.timeLeft,
                    });
                }, 100);
            } else {
                socket.emit("page-lobby");
                setTimeout(() => {
                    this.emitPlayers();
                    this.emitAdmin();
                    this.emitSettings();
                }, 100);
            }

            return true;
        } else {
            socket.emit("error-lobby-full");
            return false;
        }
    }

    kick(socket) {
        const { id } = socket;
        let client = this.io.sockets.sockets.get(id);
        if (client) {
            client.leave(this.code);
        }

        socket.emit("page-menu");
        delete this.players[id];
        if (Object.keys(this.players).length == 0) {
            this.end();
            return 1;
        }

        if (this.owner === id) {
            this.owner = this.players[Object.keys(this.players)[0]].id;
        }

        this.emitPlayers();

        for (let i in this.players) {
            if (!this.started || this.players[i].status !== 0) {
                return;
            }
        }
        this.finishGame();
    }

    emitPlayers() {
        let p = [];
        for (let i in this.players) {
            p.push(this.players[i].clientInfo());
        }

        this.emit("update-players", p);
    }

    emitAdmin() {
        this.emit("update-admin", {
            ...this.admin,
            code: this.code,
            mode: this.mode,
        });
    }

    emitSettings() {
        this.emit("update-settings", this.settings);
    }

    updateAdmin(socket, playerSettingsAuth, playerLimit) {
        if (this.started || socket.id != this.owner) {
            return;
        }

        if (typeof playerSettingsAuth == "boolean") {
            this.admin.playerSettingsAuth = playerSettingsAuth;
        }

        if (isInt(playerLimit)) {
            let l = parseInt(playerLimit, 10);
            if (l >= 1 && l >= Object.keys(this.players).length && l <= 4) {
                this.admin.playerLimit = playerLimit;
            }
        }

        this.emitAdmin();
    }

    updateSettings(socket, amount, time, t, sortExam) {
        if (
            (!this.admin.playerSettingsAuth && socket.id !== this.owner) ||
            this.started
        ) {
            return;
        }

        if (isInt(amount)) {
            let a = parseInt(amount, 10);
            if (a > 0 && a <= 50) {
                this.settings.amount = amount;
            }
        }

        if (isInt(time)) {
            let t = parseInt(time, 10);
            if (t >= 5 && t <= 180) {
                this.settings.timeLimit = time;
            }
        }

        if (t?.length == this.settings.tests.length) {
            this.settings.tests = t.map((test) => {
                return !!test;
            });
        }

        if (typeof sortExam == "boolean") {
            this.settings.sortExam = sortExam;
        }

        this.emitSettings();
    }

    async startGame(socket) {
        if (this.started) {
            return;
        }

        if (socket.id != this.owner){
            socket.emit("error-not-owner");
            return;
        }

        let parsedTests = [];
        for (let i = 0; i < this.settings.tests.length; ++i) {
            if (this.settings.tests[i]) {
                parsedTests.push(i);
            }
        }

        if (parsedTests.length < 1) {
            socket.emit("error-no-test");
            return;
        }

        this.started = true;
        this.emit("starting-game");

        this.exam.timeLeft = this.settings.timeLimit * 60;
        this.exam.problems = await fetchProblems(
            this.settings.amount,
            parsedTests,
            this.settings.sortExam
        );

        this.exam.clientProblems = this.exam.problems.map((el) => {
            return el.problem;
        });
        this.exam.solutions = this.exam.problems.map((el) => {
            return pick(el, ["name", "answer", "link"]);
        });

        this.emit("page-exam");
        setTimeout(() => {
            this.emit("exam-details", {
                problems: this.exam.clientProblems,
                time: this.exam.timeLeft,
            });
        }, 100);
        
        this.timer = new AdjustingTimer(() => {
            --this.exam.timeLeft;
            if (this.exam.timeLeft <= 0) {
                this.emit("force-submit-exam");
                this.timer.stop();
            }
        }, 1000);

        /*Log game creation*/
        console.log(
            "Started game in room " +
                this.code +
                " with " +
                this.settings.timeLimit +
                " minutes and " +
                this.settings.amount +
                " problems."
        );
        for (let i = 0; i < this.exam.problems.length; ++i) {
            console.log("Q" + (i + 1) + ": " + this.exam.problems[i].name);
        }
        /**/

        this.timer.start();
        this.emitPlayers();
    }

    submit(socket, response) {
        let p = this.players[socket.id];
        if (!this.started || p.status !== 0) {
            return 0;
        }

        p.time = this.settings.timeLimit * 60 - this.exam.timeLeft;
        p.status = 1;

        let formatRes = response?.map?.((el, i) => {
            let { answer } = this.exam.problems[i];
            let res = el
                ?.toUpperCase()
                .replace(/\s+/g, "")
                .replace(/^0+(?=\d)/, "");

            if (res === answer) {
                ++p.score;
            }

            return res;
        });

        socket.emit("submit-exam-success", {
            time: p.time,
            response: formatRes,
            score: p.score,
            solutions: this.exam.solutions,
        });
        this.emitPlayers();

        for (let i in this.players) {
            if (this.players[i].status !== 1) {
                return 0;
            }
        }

        let players = Object.entries(this.players).map(([i, p]) => {
            return p.id;
        });
        this.finishGame();
        return players;
    }

    finishGame() {
        this.ended = true;
        this.timer?.stop();

        let results = [];
        for (let i in this.players) {
            results.push(this.players[i].clientResults());
        }

        results.sort((a, b) => {
            if (a.score == b.score) {
                return a.time - b.time;
            }

            return b.score - a.score;
        });

        this.emit("finish-game", { results: results });
        this.end();
    }

    end() {
        this.ended = true;
        this.timer?.stop();
        this.emit("end-game");

        let clients = this.io.sockets.adapter.rooms.get(this.code);
        if (clients) {
            for (const id of clients) {
                let client = this.io.sockets.sockets.get(id);
                client.leave(this.code);
            }
        }
    }
}

export default Game;
