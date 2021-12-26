import React, { useState, useEffect } from "react";
import toast from "react-hot-toast";

function JoinRoom({ name, socket }) {
    let [code, setCode] = useState("");
    const handleClick = () => {
        socket.emit("join-room", { name, code });
    };

    return (
        <div className="join-room">
            <input
                type="text"
                className="code-input"
                name="code-input"
                maxLength="4"
                placeholder="Code"
                value={code}
                onInput={(e) => setCode(e.target.value)}
            />
            <button className="join-room-button" onClick={handleClick}>
                Join Room
            </button>
        </div>
    );
}

function ModeOption({ value, mode, name, ...other }) {
    return (
        <option
            {...other}
            value={value}
            selected={mode === value ? "selected" : ""}
        >
            {name}
        </option>
    );
}

function CreateRoom({ name, socket }) {
    let [mode, setMode] = useState(0);
    const handleClick = () => {
        socket.emit("create-room", { name, mode });
    };

    return (
        <div className="create-room">
            <select
                className="select-mode"
                name="select-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
            >
                <ModeOption value={0} mode={mode} name="Normal" />
                {/* <ModeOption value = {1} mode = {mode} name = "Practice"/>
                <ModeOption value = {2} mode = {mode} name = "Time Rush"/> */}
            </select>
            <button className="create-room-button" onClick={handleClick}>
                Create Room
            </button>
        </div>
    );
}

function MenuToggle({ isActive, name, ...extra }) {
    return (
        <div
            {...extra}
            className={"selector-option" + (isActive ? " selected" : "")}
        >
            {name}
        </div>
    );
}

function Menu({ socket }) {
    let [menuToggle, setMenuToggle] = useState(true);
    let [name, setName] = useState("");

    useEffect(() => {
        function errorLobbyFull() {
            toast.error("Lobby is full");
        }
        function errorNoName() {
            toast.error("Input a name");
        }
        function errorInvalidCode() {
            toast.error("Invalid code");
        }

        socket.on("error-lobby-full", errorLobbyFull);
        socket.on("error-no-name", errorNoName);
        socket.on("error-invalid-code", errorInvalidCode);

        return () => {
            socket.off("error-lobby-full", errorLobbyFull);
            socket.off("error-no-name", errorNoName);
            socket.off("error-invalid-code", errorInvalidCode);
        };
    }, [socket]);

    return (
        <section className="menu">
            <p className="menu-title">
                <img
                    className="menu-logo"
                    src="assets/vo_svg_logo_vertical.svg"
                    alt="Virtual Olympiad"
                />
            </p>
            <input
                type="text"
                className="name-input"
                name="name-input"
                minLength="1"
                maxLength="16"
                placeholder="Enter a name"
                value={name}
                onInput={(e) => setName(e.target.value)}
            />
            <section className="menu-settings">
                <div className="menu-selector">
                    <MenuToggle
                        isActive={menuToggle}
                        name="Join"
                        onClick={(e) => setMenuToggle(true)}
                    />
                    <MenuToggle
                        isActive={!menuToggle}
                        name="Create"
                        onClick={(e) => setMenuToggle(false)}
                    />
                </div>
                <div className="menu-details">
                    {menuToggle ? (
                        <JoinRoom name={name} socket={socket} />
                    ) : (
                        <CreateRoom name={name} socket={socket} />
                    )}
                </div>
            </section>
            <div className="help">
                <a href="https://github.com/polarr/virtual-olympiad/wiki/Guide" target="_blank">Help</a>
            </div>
            <footer className="promotion">
                <a href="https://discord.gg/3eXC9UE6rT" target="_blank">
                    <img src="https://cdn.jsdelivr.net/npm/simple-icons@v3/icons/discord.svg"></img>
                </a>
                <br />
                Join our fun STEM Server!
            </footer>
            <footer className="copyright">
                © 2021-present <a href="https://polarr.github.io" target="_blank">polarity</a>
            </footer>
        </section>
    );
}

export default Menu;
