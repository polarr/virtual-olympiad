const express = require('express');
const socketIO = require('socket.io');
const got = require('got');
const http = require('http');
const path = require('path');
const cheerio = require('cheerio');
const { clearLine } = require('readline');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

const port = 4000;

app.set('port', port);

app.use('/', express.static(__dirname + '/'));
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(port, () => {
  console.log(`Server started at port: ${port}`);
});

var sockets = {};
var rooms = {};

function generateRoomCode(){
  // 4 digit alphanumeric code
  let code = Math.round(Math.pow(36, 5) - Math.random() * Math.pow(36, 4)).toString(36).slice(1);
  if (code in rooms) {
    return generateRoomCode();
  }
  else {
    return code;
  }
}

async function scrapeQuestion(test, year, problem, difficulty){
  const url = `https://artofproblemsolving.com/wiki/index.php/${year}_${test}`;
  try {
    let [{body: qHtml}, {body: aHtml}] = await Promise.all([got(url + "_Problems"), got(url + "_Answer_Key")]);

    let $ = cheerio.load(qHtml);
    let question =  $(`h2:has(span[id="Problem_${problem}"])`).nextUntil('p:has(a), h2').map(function (i, el) {
      return `<${$(this)['0'].name}>${$(this).html()}</${$(this)['0'].name}>`;
    }).toArray().join('');

    /**
      .map((i, el) => {
        let s = ``;
        el = $(el);
        while(el = el.next()){
          if(el.length === 0 || el.prop('tagName') === 'H2' || el.has('a')) break;
          s += `<${el['0'].name}>${el.html()}</${el['0'].name}>`;
        }
        return s;
      }).get()[0];
     */
    //console.log(question);

    $ = cheerio.load(aHtml);
    const ans = $(`div[class="mw-parser-output"] > ol > li:eq(${problem - 1})`).text();

    return {
      name: `${year} ${test} Problem ${problem}`,
      link: url + `_Problems/Problem_${problem}`, 
      problem: question,
      answer: ans,
      difficulty: difficulty
    };
  } catch (error) {console.log(error); return 0;}
}

function randomInt(min, max){
  return min + Math.floor((max - min) * Math.random());
}

const sources = ["AMC_8", "AMC_10", "AMC_12", "AIME"];

function questionDifficulty(x){
  let diff;
  switch(x[0]){
    case "AMC_8":
      diff = 1 + x[2]/20;
      diff *= 1 + Math.max(0, x[1] - 2000)/100;
    break;
    case "AMC_10": case "AMC_10A": case "AMC_10B":
      diff = 1 + Math.max(0, x[2] - 5)/10;
      diff *= 1 + Math.max(0, x[1] - 2000)/20;
    break;
    case "AMC_12": case "AMC_12A": case "AMC_12B":
      diff = 1.5 + Math.max(0, x[2] - 5)/10;  
      diff *= 1 + Math.max(0, x[1] - 2000)/15;   
    break;
    case "AIME": case "AIME_I": case "AIME_II":
      diff = 2.75 + x[2]/4;
      diff *= 1 + Math.max(0, x[1] - 2000)/30;
    break;
  }

  return diff;
}

function generateRandomQuestion(exam, check){
  let ans;
  switch(exam){
    case "AMC_8":
      ans = [`AMC_8`, randomInt(1999, 2021), randomInt(1, 26)];
    break;
    case "AMC_10":
      ans = [`AMC_10${randomInt(0, 2) == 0 ? "A":"B"}`, randomInt(2002, 2021), randomInt(1, 26)];
    break;
    case "AMC_12":
      ans = [`AMC_12${randomInt(0, 2) == 0 ? "A":"B"}`, randomInt(2002, 2021), randomInt(1, 26)];
    break;
    case "AIME":
      ans = [`AIME_${randomInt(0, 2) == 0 ? "I":"II"}`, randomInt(2000, 2021), randomInt(1, 16)];
    break;
  }

  let diff = questionDifficulty(ans);
  ans.push(diff);

  if (check.includes(ans)){
    return generateRandomExam(exam, check);
  }

  return ans;
}

async function fetchQuestions(length, exams){
  let questions = [];
  let totalExams = 0;
  for (let i = 0; i < exams.length; ++i){
    if (exams[i]){
      ++totalExams;
    }
  }

  let nowLength = length;
  for (let i = 0; i < exams.length; ++i){
    if (exams[i]){
      let examLength = Math.ceil(nowLength/totalExams);
      for (let x = 0; x < examLength; ++x){
        questions.push(generateRandomQuestion(sources[i], questions));
      }
      nowLength -= examLength;
      --totalExams;
    }
  }

  questions.sort((a, b) => a[3] - b[3]);
  let questionsPromise = [];
  for (let i = 0; i < length; ++i){
    questionsPromise.push(scrapeQuestion(questions[i][0], questions[i][1], questions[i][2], questions[i][3]));
  }
  return await Promise.all(questionsPromise);
}

function isNumber(str){
  return !isNaN(str) && !isNaN(parseFloat(str));
}

class Game {
  constructor(code, id, name, mode){
    this.roomCode = code;
    this.owner = id;
    // NORMAL, RUSH
    this.mode = mode;
    this.partyLimit = 4;
    this.players = {};
    this.players[id] = {
      id: id,
      name: name,
      answers: new Array(50),
      incorrect: 0,
      points: 0
    }

    this.questionAmount = 10;
    this.sources = [0, 0, 0, 0];

    this.started = false;
  }

  async startGame(){
    this.started = true;
    this.questions = await fetchQuestions(this.questionAmount, this.sources);
    this.displayQuestions = [];
    for (let i = 0; i < this.questions.length; ++i){
      this.displayQuestions.push({name: this.questions[i].name, problem: this.questions[i].problem});
    }
    io.to(this.roomCode).emit('start-game', this.displayQuestions);
    console.log('Started game in room ' + this.roomCode);
  }

  // METHODS
  join(id, name){
    this.players[id] = {
      id: id,
      name: name,
      answers: new Array(50),
      incorrect: 0,
      points: 0
    }
  }

  kick(id){
    let client = io.sockets.sockets.get(id);
    if (client){
      client.leave(this.roomCode);
    }

    delete sockets[id];
    delete this.players[id];
    if (Object.keys(this.players).length == 0){
      this.end();
      return;
    }

    if (this.owner == id){
      this.owner = this.players[Object.keys(this.players)[0]].id;
    }

    this.updatePlayers();
  }

  updateGameDetails(amount=false, sources=false){
    if (amount){
      this.questionAmount = amount;
    }

    if (sources){
      this.sources = sources;
    }

    io.to(this.roomCode).emit('update-game-details', {owner: this.owner, amount: this.questionAmount, sources: this.sources});
  }

  submit(id, answer){

  }

  updatePlayers(){
    let p = [];
    for (let i in this.players){
      p.push({id: this.players[i].id, name: this.players[i].name});
    }
    io.to(this.roomCode).emit('update-players', p);
  }

  end(){
    io.to(this.roomCode).emit('end-game');

    var clients = io.sockets.adapter.rooms.get(this.roomCode);
    if (clients){
      for (const SOCKET_ID of clients) {
        let client = io.sockets.sockets.get(SOCKET_ID);
        client.leave(this.roomCode);
      }
    }

    for (let i in this.players){
      delete sockets[this.players[i].id];
    }
    delete rooms[this.roomCode];
  }
}

io.on('connection', (socket) => {
  socket.on('disconnect', () => {
    if (socket.id in sockets){
      rooms[sockets[socket.id]].kick(socket.id);
    }
  });
  socket.on('request-create-room', ({name, mode}) => {
    if (socket.id in sockets){
      return;
    }
    let ROOM_CODE = generateRoomCode();
    socket.join(ROOM_CODE);
    sockets[socket.id] = ROOM_CODE;
    rooms[ROOM_CODE] = new Game(ROOM_CODE, socket.id, name, mode);
    socket.emit('create-room-success', {code: ROOM_CODE, mode: mode});
    rooms[ROOM_CODE].updatePlayers();
  });
  socket.on('request-join-room', ({name, code}) => {
    if (socket.id in sockets){
      return;
    }
    if (code in rooms){
      if (Object.keys(rooms[code].players).length < rooms[code].partyLimit){
        socket.join(code);
        sockets[socket.id] = code;
        rooms[code].join(socket.id, name);
        socket.emit('join-room-success', {code: code, mode: rooms[code].mode});
        rooms[code].updatePlayers();
        rooms[code].updateGameDetails();
      }
      else{
        socket.emit('join-room-exceed-party-limit');
      }
    }
    else {
      socket.emit('join-room-invalid');
    }
  });
  socket.on('update-question-amount', (amount) => {
    if (!(socket.id in sockets) || socket.id != rooms[sockets[socket.id]].owner){
      // Hacker
      return;
    }

    if (!isNumber(amount) || !Number.isInteger(parseFloat(amount, 10))){
      // Hacker
      socket.emit('question-amount-not-integer');
      return;
    }

    let intX = parseInt(amount, 10);
    if (intX <= 0 || intX > 50){
      // Hacker
      socket.emit('question-amount-out-range');
      return;
    }

    rooms[sockets[socket.id]].updateGameDetails(amount, false);
  });
  socket.on('update-question-sources', (sources) => {
    if (!(socket.id in sockets) || socket.id != rooms[sockets[socket.id]].owner){
      // Hacker
      return;
    }
    if (!sources.length || sources.length > 4){
      // Hacker
      return;
    }

    rooms[sockets[socket.id]].updateGameDetails(false, sources);
  });
  socket.on('request-leave-room', () => {
    if (!(socket.id in sockets)){
      // Hacker
      return;
    }

    rooms[sockets[socket.id]].kick(socket.id);
    socket.emit('leave-room-success');
  });
  socket.on('request-start-game', async () => {
    if (!(socket.id in sockets) || socket.id != rooms[sockets[socket.id]].owner){
      return;
    }

    if (rooms[sockets[socket.id]].started){
      socket.emit('starting-game');
      return;
    }

    await rooms[sockets[socket.id]].startGame();
  });
  socket.on('request-submit-answer', (answer) => {
    let THIS_ID = socket.id;
    rooms[sockets[THIS_ID]].submit(THIS_ID, answer);
  });
});