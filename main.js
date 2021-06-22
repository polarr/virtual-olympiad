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
var questions;
var players;

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

function elementDisplay(id, mode){
  document.getElementById(id).style.display = mode;
}

function toggleMenu(on = true){
  if (on){
    elementDisplay("menu", "block");
    elementDisplay("description", "block");
    return;
  }

  elementDisplay("menu", "none");
  elementDisplay("description", "none");
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

function updateSlider(){
  let slider = document.getElementById("question-amount-slider");
  let value = (slider.value - slider.min)/(slider.max - slider.min) * 100;
  slider.style.background = 'linear-gradient(to right, #0160e2 0%, #0160e2 ' + value + '%, #e9e8ee ' + value + '%, #e9e8ee 100%)';
}

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

  return questionNode;
}

function loadQuestions(questions){
  let questionWrapper = document.getElementById("question-wrapper");
  for (let i = 0; i < questions.length; ++i){
    let questionNode = generateQuestion(i + 1, questions[i].problem, "Problem " + (i + 1));
    questionWrapper.appendChild(questionNode);
  }
}

socket.on('create-room-success', (info)=> {
  switchPhase(1);
  document.getElementById("room-code").textContent = info.code;
  document.getElementById("game-mode").textContent = info.mode;
  runSnackbar("Created room");

  changeSources();
  socket.emit('update-question-amount', document.getElementById("question-amount-slider").value);
});

socket.on('join-room-invalid', ()=> {
  switchPhase(0);
  runSnackbar("Invalid code");
});

socket.on('join-room-exceed-party-limit', ()=> {
  switchPhase(0);
  runSnackbar("Maximum player limit reached");
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
      document.querySelector("#room-info input[type='number']").readOnly = false;
      document.getElementById("start-button-wrapper").style.display = "block";
    }
    else{
      let k = document.querySelectorAll("#room-info input[type='checkbox'], #room-info input[type='range']");
      for (let i = 0; i < k.length; ++i){
        k[i].disabled = true;
      }
      document.querySelector("#room-info input[type='number']").readOnly = true;
      document.getElementById("start-button-wrapper").style.display = "none";
    }
    
    return;
  }

});

socket.on('update-game-details', (details) => {
  if (socket.id == details.owner){
    return;
  }

  document.getElementById("question-amount-slider").value = details.amount;
  document.getElementById("question-amount-input").value = details.amount;

  let s = document.querySelectorAll(".question-sources > input");
  for (let i = 0; i < s.length; ++i){
    s[i].checked = details.sources[i];
  }
});

socket.on('starting-game', () => {
  runSnackbar("Generating questions, please wait");
});

socket.on('start-game', (questions) => {
  switchPhase(2);
  runSnackbar("Started Game");
  loadQuestions(questions);
});