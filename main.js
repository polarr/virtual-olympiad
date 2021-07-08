var socket = io();

// ParticlesJS config
tsParticles.load("bg", {
  "particles": {
    "number": {
      "value": 40,
      "density": {
        "enable": true,
        "value_area": 700
      }
    },
    "color": {
      "value": "#AA0000"
    },
    "shape": {
      "type": "circle",
      "stroke": {
        "width": 0,
        "color": "#000000"
      },
      "polygon": {
        "nb_sides": 5
      },
    },
    "opacity": {
      "value": 0.5,
      "random": false,
      "anim": {
        "enable": false,
        "speed": 0.1,
        "opacity_min": 0.1,
        "sync": false
      }
    },
    "size": {
      "value": 3,
      "random": true,
      "anim": {
        "enable": false,
        "speed": 10,
        "size_min": 0.1,
        "sync": false
      }
    },
    "line_linked": {
      "enable": true,
      "distance": 150,
      "color": "#000000",
      "opacity": 0.4,
      "width": 1
    },
    "move": {
      "enable": true,
      "speed": 2,
      "direction": "none",
      "random": false,
      "straight": false,
      "out_mode": "out",
      "bounce": false,
      "attract": {
        "enable": false,
        "rotateX": 600,
        "rotateY": 1200
      }
    }
  },
  "interactivity": {
    "detect_on": "canvas",
    "events": {
      "onhover": {
        "enable": true,
        "mode": "grab"
      },
      "onclick": {
        "enable": true,
        "mode": "repulse"
      },
      "resize": true
    },
    "modes": {
      "grab": {
        "distance": 140,
        "line_linked": {
          "opacity": 1
        }
      },
      "bubble": {
        "distance": 400,
        "size": 40,
        "duration": 2,
        "opacity": 8,
        "speed": 3
      },
      "repulse": {
        "distance": 200,
        "duration": 1
      },
      "push": {
        "particles_nb": 4
      },
      "remove": {
        "particles_nb": 2
      }
    }
  },
  "retina_detect": true
});

// GLOBALS
var phase = 0; // 0 = menu, 1 = in room, 2 = in game
var question = 1;
var localTimeLeft;
var localTimer;

function runSnackbar(msg) {
  let x = document.getElementById("snackbar");
  x.classList.remove("show");
  void x.offsetWidth;
  x.textContent = msg;
  x.className = "show";
  var z = setTimeout(function(){ x.className = x.className.replace("show", ""); }, 3000);
  var n = z - 1;
  while (n--) {
      window.clearTimeout(n);
  }
} 

function adjustingTimer(callback, interval) {
  var that = this;
  var expected, timeout;
  this.interval = interval;

  this.start = function() {
      expected = Date.now() + this.interval;
      timeout = setTimeout(step, this.interval);
  }

  this.stop = function() {
      clearTimeout(timeout);
  }

  function step() {
      var drift = Date.now() - expected;
      if (drift > that.interval) {
      }
      callback();
      expected += that.interval;
      timeout = setTimeout(step, Math.max(0, that.interval - drift));
  }
}

function elementDisplay(id, mode){
  document.getElementById(id).style.display = mode;
}

function toggleMenu(on = true){
  if (on){
    elementDisplay("menu", "block");
    return;
  }

  elementDisplay("menu", "none");
}

function toggleRoom(on = true){
  if (on){
    elementDisplay("room", "block");
    return;
  }

  elementDisplay("room", "none");
}

function toggleQuestions(on = true){
  if (on){
    elementDisplay("questions", "block");
    elementDisplay("nav-bar", "block");
    elementDisplay("results-wrapper", "none");
    return;
  }

  elementDisplay("questions", "none");
}

function switchPhase(n){
  phase = n;
  switch (n){
    case 0:
      toggleMenu();
      toggleRoom(false);
      toggleQuestions(false);
    break;
    case 1:
      toggleMenu(false);
      toggleRoom();
      toggleQuestions(false);
    break;
    case 2:
      toggleMenu(false);
      toggleRoom(false);
      toggleQuestions();
      document.getElementById("submit-answer-button").textContent = "Submit";
      document.querySelector("#time-remaining-wrapper > span").textContent = "Time remaining:";
  }
}

function createRoom(){
  let name = document.getElementById("name-input").value;
  if (name.length < 1){
    runSnackbar("Enter a name");
    return;
  }
  let mode = document.getElementById("select-mode").value;
  socket.emit('request-create-room', {name: name, mode: mode});
} 

function joinRoom(){
  let name = document.getElementById("name-input").value;
  if (name.length < 1){
    runSnackbar("Enter a name");
    return;
  }
  let code = document.getElementById("code-input").value;
  socket.emit('request-join-room', {name: name, code: code});
}

function createRow(text, bold, border){
  let a = document.createElement("TR");
  let b = document.createElement("TD");
  let t = document.createTextNode(text);
  if (border){
    b.style = "border: 2px solid rgb(0, 220, 0);";
  }
  if (bold){
    b.style.fontWeight = "bold";
  }
  b.appendChild(t); 
  a.appendChild(b);
  return a;
}

function isNumber(str){
  return !isNaN(str) && !isNaN(parseFloat(str));
}

function changeQuestionAmount(input){
  if (input){
    let oldValue = document.getElementById("question-amount-input").oldValue;
    let x = document.getElementById("question-amount-input").value;
    if (!isNumber(x) || !Number.isInteger(parseFloat(x, 10))){
      runSnackbar("Question amount must be an integer");
      socket.emit('update-question-amount', oldValue);
      document.getElementById("question-amount-slider").value = oldValue;
      document.getElementById("question-amount-input").value = oldValue;
      return;
    }

    let intX = parseInt(x, 10);
    if (intX <= 0 || intX > 50){
      runSnackbar("Question amount must be between 1 and 50");
      socket.emit('update-question-amount', oldValue);
      document.getElementById("question-amount-slider").value = oldValue;
      document.getElementById("question-amount-input").value = oldValue;
      return;
    }

    socket.emit('update-question-amount', intX);
    document.getElementById("question-amount-slider").value = intX;
    return;
  }

  socket.emit('update-question-amount', document.getElementById("question-amount-slider").value);
  document.getElementById("question-amount-input").value = document.getElementById("question-amount-slider").value;
}

function changeTimeLimit(input){
  if (input){
    let oldValue = document.getElementById("time-limit-input").oldValue;
    let x = document.getElementById("time-limit-input").value;
    if (!isNumber(x) || !Number.isInteger(parseFloat(x, 10))){
      runSnackbar("Time limit must be an integer");
      socket.emit('update-time-limit', oldValue);
      document.getElementById("time-limit-slider").value = oldValue;
      document.getElementById("time-limit-input").value = oldValue;
      return;
    }

    let intX = parseInt(x, 10);
    if (intX < 5 || intX > 180){
      runSnackbar("Time limit must be between 5 and 180 minutes");
      socket.emit('update-question-amount', oldValue);
      document.getElementById("time-limit-slider").value = oldValue;
      document.getElementById("time-limit-input").value = oldValue;
      return;
    }

    socket.emit('update-time-limit', intX);
    document.getElementById("time-limit-slider").value = intX;
    return;
  }

  socket.emit('update-time-limit', document.getElementById("time-limit-slider").value);
  document.getElementById("time-limit-input").value = document.getElementById("time-limit-slider").value;
}

/**
function updateSlider(that){
  let value = (that.value - that.min)/(that.max - that.min) * 100;
  that.style.background = 'linear-gradient(to right, #0160e2 0%, #0160e2 ' + value + '%, #e9e8ee ' + value + '%, #e9e8ee 100%)';
}
 */

function changeSources(){
  let s = document.querySelectorAll(".question-sources > input");
  let sources = Array(s.length);
  for (let i = 0; i < s.length; ++i){
    sources[i] = s[i].checked;
  }

  socket.emit('update-question-sources', sources);
}

function leaveGame(){
  socket.emit('request-leave-room');
}

function startGame(){
  let amount = document.getElementById("question-amount-input").value;

  let sources = Array(4);
  sources[0] = document.getElementById("question-source-amc8").checked;
  sources[1] = document.getElementById("question-source-amc10").checked;
  sources[2] = document.getElementById("question-source-amc12").checked;
  sources[3] = document.getElementById("question-source-aime").checked;

  let hasSource = false;
  for (let i = 0; i < sources.length; ++i){
    if (sources[i]){
      hasSource = true;
      break;
    } 
  }

  if (!hasSource){
    runSnackbar("Must select at least one question source");
    return;
  }

  socket.emit('request-start-game', {amount: amount, sources: sources});
}

function generateQuestion(number, content, name){
  let questionNode = document.createElement("DIV");
  questionNode.className = "question";
  questionNode.id = "question-" + number;

  let questionTitle = document.createElement("H2");
  questionTitle.className = "question-title";
  questionTitle.textContent = name;
  questionNode.appendChild(questionTitle);

  let questionProblem = document.createElement("DIV");
  questionProblem.className = "problem";
  questionProblem.innerHTML = content;
  questionNode.appendChild(questionProblem);

  let questionInput = document.createElement("INPUT");
  questionInput.className = "answer-input";
  questionInput.id = "answer-input-" + number;
  questionInput.setAttribute("type", "text");
  questionInput.setAttribute("name", "answer-input");
  questionInput.setAttribute("maxlength", "3");
  questionInput.setAttribute("placeholder", "Answer");
  questionNode.appendChild(questionInput);

  let questionSolution = document.createElement("SPAN");
  questionSolution.className = "question-solution";
  questionNode.appendChild(questionSolution);

  return questionNode;
}

function loadQuestions(questions){
  let questionWrapper = document.getElementById("question-wrapper");
  questionWrapper.innerHTML = "";
  for (let i = 0; i < questions.length; ++i){
    let questionNode = generateQuestion(i + 1, questions[i].problem, "Problem " + (i + 1));
    questionWrapper.appendChild(questionNode);
  }
}

function parseTime(time){
  return `${Math.floor(time/3600)}:${Math.floor((time % 3600)/60).toLocaleString(undefined, {minimumIntegerDigits: 2, useGrouping:false})}:${(time % 60).toLocaleString(undefined, {minimumIntegerDigits: 2, useGrouping:false})}`;
}

function updateTimeLeft(time){
  document.getElementById("time-remaining").textContent = parseTime(time);
}

function submitAnswer(){
  localTimer.stop();
  let ans = document.querySelectorAll(".answer-input");
  let answers = [];
  for (let i = 0; i < ans.length; ++i){
    answers.push(ans[i].value);
  }
  socket.emit('request-submit-answer', answers);
};

function displayResults(results){
  localTimeLeft = results.time;
  document.querySelector("#time-remaining-wrapper > span").textContent = "Time Used:";

  updateTimeLeft(localTimeLeft);
  document.getElementById("submit-answer-button").textContent = results.correct + "/" + results.solutions.length;
  document.getElementById("submit-answer-button").disabled = true;

  let ansInputs = document.querySelectorAll(".answer-input");
  for (let i = 0; i < ansInputs.length; ++i){
    ansInputs[i].value = results.answers[i];
    ansInputs[i].readOnly = true;
  }

  let sols = document.querySelectorAll(".question-solution");
  for (let i = 0; i < sols.length; ++i){
    sols[i].style = `color: ${results.answers[i] == results.solutions[i] ? "green":"red"}; margin-left: 5px`;
    sols[i].textContent = "Answer: " + results.solutions[i];
  }

  let titles = document.querySelectorAll(".question-title");
  for (let i = 0; i < titles.length; ++i){
    let a = document.createElement('A');
    a.href = results.links[i];
    a.textContent = results.names[i];
    titles[i].innerHTML = "";
    titles[i].appendChild(a);
  }
}

function finishGame(results){
  elementDisplay("nav-bar", "none");
  elementDisplay("results-wrapper", "block");
  document.getElementById("question-wrapper").style.height = "calc(50vh - 10px)";

  let resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";
  for (let i = 0; i < results.players.length; ++i){
    let playerDiv = document.createElement("DIV");
    playerDiv.className = "player-result";

    let nameDiv = document.createElement("SPAN");
    nameDiv.className = "v-center";
    nameDiv.textContent = "#" + (i + 1) + " " + results.players[i].name;
    nameDiv.style = "float: left; font-weight: bold";
    playerDiv.appendChild(nameDiv);

    let statsDiv = document.createElement("SPAN");
    statsDiv.className = "v-center";
    statsDiv.textContent = "Time Used: " + parseTime(results.players[i].time) + " Score: " + results.players[i].correct + "/" + results.total;
    statsDiv.style = "float: right;";
    playerDiv.appendChild(statsDiv);

    resultsDiv.appendChild(playerDiv);
  }
}

socket.on('create-room-success', (info)=> {
  switchPhase(1);
  document.getElementById("room-code").textContent = info.code;
  document.getElementById("game-mode").textContent = info.mode;
  runSnackbar("Created room");
});

socket.on('join-room-invalid', ()=> {
  switchPhase(0);
  runSnackbar("Invalid code");
});

socket.on('join-room-exceed-party-limit', ()=> {
  switchPhase(0);
  runSnackbar("Maximum player limit reached");
});

socket.on('join-room-started', ()=> {
  switchPhase(0);
  runSnackbar("Room already started game");
});

socket.on('join-room-success', (info)=> {
  switchPhase(1);
  document.getElementById("room-code").textContent = info.code;
  document.getElementById("game-mode").textContent = info.mode;
  runSnackbar("Joined room");
});

socket.on('leave-room-success', ()=> {
  switchPhase(0);
  runSnackbar("Left room");
});

socket.on('update-players', (players) => {
  if (phase == 1){
    let playersTable = document.getElementById("room-players");
    playersTable.innerHTML = "";
    for (let i = 0; i < 4; ++i){
      let n = "";
      let border = false;
      if (players.length > i){
        n = players[i].name;
        border = (players[i].id == socket.id);
      }

      let playerRow = createRow(n, (i == 0), border);
      playersTable.appendChild(playerRow);
    }
    
    if (socket.id == players[0].id){
      let k = document.querySelectorAll("#room-info input[type='checkbox'], #room-info input[type='range']");
      for (let i = 0; i < k.length; ++i){
        k[i].disabled = false;
      }
      let inputs = document.querySelectorAll("#room-info input[type='number']");
      for (let i = 0; i < inputs.length; ++i){
        inputs[i].readOnly = false
      }
      document.getElementById("start-button-wrapper").style.display = "block";
    }
    else{
      let k = document.querySelectorAll("#room-info input[type='checkbox'], #room-info input[type='range']");
      for (let i = 0; i < k.length; ++i){
        k[i].disabled = true;
      }
      let inputs = document.querySelectorAll("#room-info input[type='number']");
      for (let i = 0; i < inputs.length; ++i){
        inputs[i].readOnly = true;
      }
      document.getElementById("start-button-wrapper").style.display = "none";
    }
    
    return;
  }

  if (phase == 2 || phase == 3){
    let playersbar = document.getElementById("players-bar");
    playersbar.innerHTML = "";
    for (let i = 0; i < players.length; ++i){
      let playerNode = document.createElement("DIV");
      // playerNode.style = "width: clamp()";
      playerNode.className = "nav-bar-items v-center";

      let playerNameNode = document.createElement("SPAN");
      playerNameNode.style = "font-weight: bold";
      playerNameNode.textContent = players[i].name;

      let playerStatusNode = document.createElement("DIV");
      playerStatusNode.style = "margin-top: 5px; font-style: italic;";
      playerStatusNode.textContent = players[i].status;

      playerNode.appendChild(playerNameNode);
      playerNode.appendChild(playerStatusNode);
      playersbar.appendChild(playerNode);
    }
  }
});

socket.on('update-game-details', (details) => {
  /**   
  if (socket.id == details.owner){
    return;
  }
   */
  document.getElementById("question-amount-slider").value = details.amount;
  document.getElementById("question-amount-input").value = details.amount;

  document.getElementById("time-limit-slider").value = details.time;
  document.getElementById("time-limit-input").value = details.time;

  let s = document.querySelectorAll(".question-sources > input");
  for (let i = 0; i < s.length; ++i){
    s[i].checked = details.sources[i];
  }
});

socket.on('starting-game', () => {
  runSnackbar("Generating questions, please wait");
});

socket.on('start-game', (info) => {
  switchPhase(2);
  runSnackbar("Started Game");
  localTimeLeft = info.time;
  localTimer = new adjustingTimer(()=> {
    --localTimeLeft;
    
    updateTimeLeft(localTimeLeft);

    if (localTimeLeft == 180){
      runSnackbar("3 minutes remaining");
    }

    if (localTimeLeft == 0){
      localTimer.stop();
      return;
    }
  }, 1000);
  loadQuestions(info.questions);
  updateTimeLeft(info.time);
  localTimer.start();
});

/**
socket.on('update-time-left', (syncTime)=>{
  if (phase != 2){
    return;
  }
  localTimeLeft = syncTime;
});
*/

socket.on('submit-answer-success', (results)=>{
  phase = 3;
  runSnackbar("Submitted answers");
  displayResults(results);
});

socket.on('request-finish-game', ()=>{
  submitAnswer();
});

socket.on('finish-game', (results)=>{
  phase = 3;
  runSnackbar("Game ended");
  finishGame(results);
});