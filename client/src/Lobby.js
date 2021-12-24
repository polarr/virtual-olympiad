import React, {useState, useEffect} from 'react';

function Slider({min, max, step, value, onChange}){
    return (
        <div className = "lobby-slider-wrapper">
            <input type="range" min={min} max={max} step={step} value={value} onChange = {e => onChange(e.target.value)}/>
            <input type="number" min={min} max={max} value={value} onChange = {e => onChange(e.target.value)}/>
        </div>
    );
}

function Checkbox({name, description, checked, onChange}){
    return (
        <div className = "horizontal-flex">
            <input id = {name} type="checkbox" name = {name} value = {true} checked={checked} onChange={e => onChange(e.target.checked)}/>
            <label for = {name}>{description}</label>
        </div>
    );
}

function LobbyPlayers({socket, players, admin}){
    let mode = "";
    switch(admin?.mode){
        case 0:
            mode = "Normal";
        break;
        case 1:
            mode = "Practice";
        break;
        case 2:
            mode = "Time Rush";
    }

    function changePlayerAuth(auth){
        socket.emit("change-admin", {
            playerSettingsAuth: auth
        });
    }

    function changePlayerLimit(limit){
        socket.emit("change-admin", {
            playerLimit: limit
        });
    }

    return (
        <section className = "horizontal-flex">
            <section className = "lobby-players">
                {players?.map(player => {
                    return <div className = {"lobby-player-card " + (player.id === socket.id ? "isUser":"")}>{player.name}</div>;
                })}
            </section>
            <div className = "lobby-admin">
                <div className = "horizontal-flex lobby-info">
                    <div className = "vertical-flex lobby-about-code">Room Code<span>{admin?.code}</span></div>
                    <div className = "vertical-flex lobby-about-mode">Game Mode<span>{mode}</span></div>
                </div>
                <div className = "player-settings">
                    <div className = "vertical-flex lobby-admin-playerLimit">
                        Max Player Limit
                        <Slider min="1" max="4" step="1" value={admin.playerLimit} onChange = {changePlayerLimit} />
                    </div>
                    <Checkbox className = "lobby-admin-playerSettingsAuth" name = "playerSettingsAuth" description = "Allow players to modify settings" checked = {admin.playerSettingsAuth} onChange = {changePlayerAuth}/>
                </div>
            </div>
        </section>
    );
}

function LobbySettings({socket, settings}){
    function changeProblemAmount(a){
        socket.emit("change-settings", {
            amount: a
        });
    }

    function changeTimeLimit(t){
        socket.emit("change-settings", {
            time: t
        });
    }

    function changeSortExam(s){
        socket.emit("change-settings", {
            sortExam: s
        });
    }

    function changeTests(i, checked){
        let newTests = settings.tests;
        newTests[i] = checked;
        socket.emit("change-settings", {
            tests: newTests
        });
    }

    return (
        <section className = "lobby-settings">
            <div className = "lobby-info">
                <div className = "lobby-settings-panel">
                    Question Amount
                    <Slider min="1" max="50" step="1" value = {settings.amount} onChange = {changeProblemAmount}/>
                </div>
                <div className = "lobby-settings-panel">
                    Time Limit (min)
                    <Slider min="5" max="180" step="5" value = {settings.timeLimit} onChange = {changeTimeLimit} />
                </div>
            </div>
            <div className = "lobby-settings-panel">
                Problem Source
                <div className = "lobby-test-sources">
                    {settings?.avaliableTests?.map?.((test, i)=> {
                        return <Checkbox className = "test-source" name = {"test-source-" + test} description = {test} checked = {settings.tests[i]} onChange = {(checked)=> changeTests(i, checked)}/>;
                    })}
                </div>
            </div>
            <div className = "lobby-settings-panel">
                Exam Settings
                <div className = "lobby-exam-settings">
                    <Checkbox name = "lobby-exam-sort" description = "Sort problems by difficulty" checked = {settings.sortExam} onChange = {changeSortExam}/>
                </div>
            </div>
        </section>
    );
}

function Lobby({ socket }){
    const [players, setPlayers] = useState([]);
    const [admin, setAdmin] = useState({});
    const [settings, setSettings] = useState({});

    const [starting, setStarting] = useState(false);

    useEffect(()=> {
        function updatePlayers(p){
            setPlayers(p);
        }
        function updateAdmin(a){
            setAdmin(a);
        }
        function updateSettings(s){
            setSettings(s);
        }
        function toggleStarting(){
            setStarting(true);
        }

        socket.on("update-players", updatePlayers);
        socket.on("update-admin", updateAdmin);
        socket.on("update-settings", updateSettings);
        socket.on("starting-game", toggleStarting);

        return ()=> {
            socket.off("update-players", updatePlayers);
            socket.off("update-admin", updateAdmin);
            socket.off("update-settings", updateSettings);
            socket.off("starting-game", toggleStarting);
        };
    }, [socket]);

    function leaveGame(){
        socket.emit("leave-game");
    }

    function startGame(){
        socket.emit("start-game");
    }

    return (
        <section className = "lobby">
            <section className = "lobby-header">
                <img className = "lobby-logo" src = "assets/vo_svg_logo_horizontal.svg" alt="Virtual Olympiad"/>
                <div className = "lobby-icons"><a href = "https://github.com/polarr/virtual-olympiad" target = "_blank"><img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/91/Octicons-mark-github.svg/2048px-Octicons-mark-github.svg.png"></img></a> <a href = "https://github.com/polarr/virtual-olympiad/wiki/Guide" target = "_blank"><i class="fas fa-question-circle"></i></a></div>
            </section>
            {starting ?
            (
                <section className = "lobby-content">
                    <div className = "loading-exam">Generating Exam...</div>
                </section>
            ) : (
                <section className = "lobby-content">
                    <div className = "lobby-title">Players</div>
                    <LobbyPlayers socket = {socket} players = {players} admin = {admin} />
                    <div className = "lobby-title">Settings</div>
                    <LobbySettings socket = {socket} settings = {settings} />
                    <div className = "lobby-actions">
                        <button className = "leave-button" onClick = {leaveGame}>Leave</button>
                        <button className = "start-button" onClick = {startGame}>Start</button>
                    </div>
                </section>
            )}
        </section>
    );
}

export default Lobby;
export {LobbyPlayers, LobbySettings, Lobby};
