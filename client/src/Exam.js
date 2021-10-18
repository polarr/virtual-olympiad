import React, {useState, useEffect} from 'react';
import DOMPurify from 'dompurify';

function PlayerBox({socket, player}) {
    return (
        <div className = {`player-box ${player.id === socket.id ? "user": ""}`}>
            <span className = "player-box-name">{player.name}</span>
            <div className = "player-box-status">{player.status == 0 ? "Answering":"Submitted"}</div>
        </div>
    );
}

function parseTime(time){
    return `${Math.floor(time/3600)}:${Math.floor((time % 3600)/60).toLocaleString(undefined, {minimumIntegerDigits: 2, useGrouping:false})}:${(time % 60).toLocaleString(undefined, {minimumIntegerDigits: 2, useGrouping:false})}`;
}

function StatusBar({socket, players, time, onSubmit, submitted, score}){
    return (
        <nav className = "status-bar">
            <div className = "time-remaining-wrapper">{submitted ? "Time Used":"Time Remaining"}<span className = "time-remaining">{parseTime(time)}</span></div>
            {players.map(p => {
                return <PlayerBox socket = {socket} player = {p}/>;
            })}
            {submitted ?
            <div className = "score-wrapper">Score<span className = "score">{score}</span></div>
            : <button className = "submit-button" onClick = {onSubmit}>Submit</button>}

        </nav>
    );
}

function Problem({index, question, response, onChange, submitted, solution}) {
    return (
        <article id = {`problem-${index + 1}`} className = "problem">
            <div className = "problem-title">Problem {index + 1} {submitted ?
                <a className = "problem-tooltip" href = {solution?.link} target = "_blank">
                    <i class="fas fa-info-circle"></i>
                    <div className = "problem-tooltip-name">{solution?.name}</div>
                </a>:""
            }</div>
            <div className = "problem-question" dangerouslySetInnerHTML={{__html: DOMPurify.sanitize(question)}}></div>
            <div className = "horizontal-flex"><input type="text" className ="problem-input" id={`problem-input-${index + 1}`} name="problem-input" maxlength="3" placeholder="Answer" value = {response} onChange = {e => onChange(index, e.target.value)}/>
            {submitted ? <div className = "problem-answer" style={{backgroundColor: response == solution?.answer ? "#009412":"#ff0000"}}>{solution?.answer}</div>:""}
            </div>
        </article>
    );
}

function ExamProblems({problems, response, onChange, submitted, solutions}){
    return (
        <section className = "exam-problems">
            {problems.map((problem, i)=> {
                return <Problem index = {i} question = {problem} response = {response[i]} onChange = {onChange} submitted = {submitted} solution = {solutions[i]}/>
            })}
        </section>
    );
}

function Results({socket, results, total}){
    return (
        <section className = "results">
            <div className = "results-title">Exam Finished</div>
            <div className = "results-subtitle">Here are the results</div>
            {results?.map(result => {
                return (<div className = {"result-card " + (result?.id === socket.id ? "isUser":"")}>
                    <div className = "result-name">{result?.name}</div>
                    <div className = "result-time">Time Used: {parseTime(result?.time)}</div>
                    <div className = "result-score">Score: {`${ result.score }/${total}`}</div>
                </div>);
            })}
        </section>
    );
}

class AdjustingTimer {
    constructor(callback, interval) {
        this.callback = callback;
        this.interval = interval;
        // eslint-disable-next-line no-unused-expressions
        this.expected, this.timeout;
    }

    step() {
        let drift = Date.now() - this.expected;
        if (drift > this.interval) {
            // Browser inactive?
        }

        this.callback();
        this.expected += this.interval;
        this.timeout = setTimeout(this.step.bind(this), Math.max(0, this.interval - drift));
    }

    start() {
        this.expected = Date.now() + this.interval;
        this.timeout = setTimeout(this.step.bind(this), this.interval);
    }

    stop() {
        clearTimeout(this.timeout);
    }
}

function Exam({socket}){
    const [finished, setFinished] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [players, setPlayers] = useState([]);

    const [time, setTime] = useState(null);
    const [timer, setTimer] = useState(null);
    const [problems, setProblems] = useState([]);

    const [response, setResponse] = useState([]);
    const [score, setScore] = useState(0);
    const [solutions, setSolutions] = useState([]);
    const [results, setResults] = useState([]);


    function updateResponse(index, value){
        let newRes = [...response];
        newRes[index] = value;
        setResponse(newRes);
    }

    function submitExam(){
        socket.emit("submit-exam", {response: response});
        timer?.stop?.();
    }

    useEffect(()=> {
        function updatePlayers(p){
            setPlayers(p);
        }
        function toggleFinished({results}){
            setFinished(true);
            setResults(results);
        }
        function updateExam({problems, time}){
            setResponse(new Array(problems.length));
            setProblems(problems);

            setTime(time);
            setTimer(new AdjustingTimer(()=> {
              setTime(prev => {
                return prev - 1;
              });
            }, 1000));
        }
        function forceSubmit(){
            socket.emit("submit-exam", {response: response});
        }
        function updateSubmitted({time, response, score, solutions}){
          setSubmitted(true);
          setResponse(response);
          setTime(time);
          setScore(score);
          setSolutions(solutions);
        }

        socket.on("exam-details", updateExam);
        socket.on("update-players", updatePlayers);
        socket.on("finish-game", toggleFinished);
        socket.on("force-submit-exam", forceSubmit);
        socket.on("submit-exam-success", updateSubmitted);

        return ()=> {
            socket.off("exam-details", updateExam);
            socket.off("update-players", updatePlayers);
            socket.off("finish-game", toggleFinished);
            socket.off("force-submit-exam", forceSubmit);
            socket.off("submit-exam-success", updateSubmitted);
        };
    }, [socket]);

    useEffect(()=> {
      if (time && time <= 0 && !submitted){
        submitExam();
      }
    }, [time]);

    useEffect(()=> {
      timer?.start?.();
    }, [timer]);

    return (
        <div className = "exam">
            <StatusBar socket = {socket} players = {players} time = {time} onSubmit = {submitExam} submitted = {submitted} score = {`${score}/${solutions.length}`}/>
        <div className = "content">
                {finished ?
                    <Results socket = {socket} results = {results} total = {solutions.length}></Results>
                :""}
                <ExamProblems socket = {socket} problems = {problems} response = {response} onChange = {updateResponse} submitted = {submitted} solutions = {solutions}/>
            </div>
        </div>
    );
}

export default Exam;
export {PlayerBox, StatusBar, Problem, ExamProblems, Exam};
