import "./styles/App.scss";
import "./styles/Menu.scss";
import "./styles/Lobby.scss";
import "./styles/Exam.scss";

import Lobby from "./Lobby.js";
import Exam from "./Exam.js";
import Menu from "./Menu.js";

import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import toast, { Toaster } from "react-hot-toast";

function Canvas(props) {
    const { draw, ...rest } = props;
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        let frameCount = 0;
        let animationFrameId;

        const render = () => {
            frameCount++;
            draw(context, frameCount);
            animationFrameId = window.requestAnimationFrame(render);
        };
        render();

        return () => {
            window.cancelAnimationFrame(animationFrameId);
        };
    }, [draw]);

    return <canvas ref={canvasRef} {...rest} />;
}

function App() {
    const [socket, setSocket] = useState(null);
    const [page, setPage] = useState(0);

    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);
        return () => newSocket.close();
    }, []);

    useEffect(() => {
        if (socket == null) {
            return;
        }
        function joinMenu() {
            setPage(0);
            toast.success("Returned to menu");
        }
        function joinLobby() {
            setPage(1);
            toast.success("Entered lobby");
        }
        function joinGame() {
            setPage(2);
        }

        socket.on("page-menu", joinMenu);
        socket.on("page-lobby", joinLobby);
        socket.on("page-exam", joinGame);

        return () => {
            socket.off("page-menu", joinMenu);
            socket.off("page-lobby", joinLobby);
            socket.off("page-exam", joinGame);
        };
    }, [socket]);

    const circleColors = ["#0FF", "#44D62C", "#E0E722", "#FFAD00", "#4D4DFF"];
    let circles = [];

    function resizeCanvas(canvas) {
        const { width, height } = canvas.getBoundingClientRect();

        if (canvas.width !== width || canvas.height !== height) {
            const { devicePixelRatio: ratio = 1 } = window;
            const context = canvas.getContext("2d");
            canvas.width = width * ratio;
            canvas.height = height * ratio;
            context.scale(ratio, ratio);
            return true;
        }

        return false;
    }

    function draw(ctx, frameCount) {
        let { canvas } = ctx;
        resizeCanvas(canvas);
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.filter = "blur(20px)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        if (frameCount === 1) {
            let minDim = Math.min(canvas.width, canvas.height);
            for (let i = 0; i < 10; ++i) {
                let direction = Math.random() * 2 * Math.PI;
                let circle = {
                    posX: Math.floor(Math.random() * canvas.width),
                    posY: Math.floor(Math.random() * canvas.height),
                    color: circleColors[
                        Math.floor(i/10 * circleColors.length)
                    ],
                    speed: Math.max(0.5, Math.random() * 3),
                    xVel: Math.cos(direction),
                    yVel: Math.sin(direction),
                    size: Math.random() * minDim/20 + minDim/10,
                };

                circles.push(circle);
            }
        }

        for (let i = 0; i < circles.length; i++) {
            let c = circles[i];
            ctx.fillStyle = c.color;
            ctx.beginPath();
            ctx.arc(c.posX, c.posY, c.size, 0, 2 * Math.PI);
            ctx.fill();
        }

        for (let i = 0; i < circles.length; i++) {
            let c = circles[i];
            c.posX += c.xVel;
            c.posY += c.yVel;
            if (c.posX + c.size / 2 < 0 || c.posX > canvas.width + c.size / 2) {
                c.xVel *= -1;
            }
            if (
                c.posY + c.size / 2 < 0 ||
                c.posY > canvas.height + c.size / 2
            ) {
                c.yVel *= -1;
            }
        }
    }

    if (socket) {
        switch (page) {
            case 1:
                return (
                    <div className="App">
                        <Toaster
                            position="bottom-center"
                            reverseOrder={false}
                        />
                        <Canvas className="background" draw={draw} />
                        <Lobby socket={socket} />
                    </div>
                );
            case 2:
                return (
                    <div className="App">
                        <Toaster
                            position="bottom-center"
                            reverseOrder={false}
                        />
                        <Exam socket={socket} />
                    </div>
                );
            case 0:
            default:
                return (
                    <div className="App">
                        <Toaster
                            position="bottom-center"
                            reverseOrder={false}
                        />
                        <Canvas className="background" draw={draw} />
                        <Menu socket={socket} />
                    </div>
                );
        }
    }

    return <div className="App">Not connected to server...</div>;
}

export default App;
