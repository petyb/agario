const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

const TICK_RATE = 30;

const maxFood = 1000;

let colors = ["red", "blue", "yellow", "purple", "green"];

let players = [];
let food = [];

const inputsMap = {};

const maxX = 3000;
const maxY = 3000;
const minSpeed = 7;
const maxSpeed = 15;
const foodR = 5;

const initialPlayer = (num) => {
    var arr = [100];
    return {
        id: num,
        x: [Math.floor(Math.random() * maxX)],
        y: [Math.floor(Math.random() * maxY)],
        mass: arr,
        alive: false,
        name: "Новый игрок",
    };
};

const massDiff = 20;

const minMass = 100;

const isCollide = (c1, c2) => {
    let distance = Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2);
    return distance < c1.r;
}

const tick = () => {
    for (const player of players) {
        if (!(player.alive)) {
            continue;
        }
        for (let i = 0; i < player.x.length; i++) {
            const inputs = inputsMap[player.id];
            // console.log(inputs); 
            // console.log(maxSpeed - minSpeed);
            // console.log();
            let SPEED = Math.max(maxSpeed - (maxSpeed - minSpeed) * Math.pow(player.mass[i] / minMass, 1.0 / 10.0), 1);
            // console.log(SPEED);
            if ((inputs.up || inputs.down) && (inputs.left || inputs.right)) {
                SPEED /= Math.sqrt(2);
            }

            if (inputs.up) {
                player.y[i] -= SPEED;
                if (player.y[i] < 0) {
                    player.y[i] = 0;
                }
            } else if (inputs.down) {
                player.y[i] += SPEED;
                if (player.y[i] > maxY) {
                    player.y[i] = maxY;
                }
            }

            if (inputs.right) {
                player.x[i] += SPEED;
                if (player.x[i] > maxX) {
                    player.x[i] = maxX;
                }
            } else if (inputs.left) {
                player.x[i] -= SPEED;
                if (player.x[i] < 0) {
                    player.x[i] = 0;
                }
            }
            player.mass[i] -= (0.01 * Math.pow(player.mass[i], 0.5));
            if (player.mass[i] < minMass) {
                player.mass[i] = minMass;
            }
        }
    }

    for (let player1 of players) {
        for (let i = 0; i < player1.x.length; i++) {
            for (let player2 of players) {
                for (let j = (player1.id == player2.id ? i + 1 : 0); j < player2.x.length; j++) {
                    if (player1.id < player2.id) continue;
                    if (!(player1.alive) || !(player2.alive)) continue;
                    if (player1.mass[i] == 0 || player2.mass[j] == 0) continue;
                    const s1 = isCollide({
                        x: player1.x[i],
                        y: player1.y[i],
                        r: player1.mass[i] ** 0.5,
                    },
                        {
                            x: player2.x[j],
                            y: player2.y[j],
                            r: player2.mass[j] ** 0.5,
                        });
                    const s2 = isCollide({
                        x: player2.x[j],
                        y: player2.y[j],
                        r: player2.mass[j] ** 0.5,
                    },
                        {
                            x: player1.x[i],
                            y: player1.y[i],
                            r: player1.mass[i] ** 0.5,
                        }
                    );
                    if (s1 && player1.mass[i] > player2.mass[j] + massDiff) {
                        player1.mass[i] += player2.mass[j];
                        player2.mass[j] = 0;
                    }
    
                    if (s2 && player2.mass[j] > player1.mass[i] + massDiff) {
                        player2.mass[j] += player1.mass[i];
                        player1.mass[i] = 0;
                        // player1.x = Math.floor(Math.random() * maxX);
                    }
                }
            }   
        }
    }
    for (let player of players) {
        let newX = [];
        let newY = [];
        let newMass = [];
        for (let i = 0; i < player.x.length; i++) {
            if (player.mass[i] >= minMass) {
                newX.push(player.x[i]);
                newY.push(player.y[i]);
                newMass.push(player.mass[i]);
            }
        }
        if (newX.length == 0) {
            // player = initialPlayer(player.id);
            player.alive = false;
            player.mass = [100];
            player.x = [Math.floor(Math.random() * maxX)];
            player.y = [Math.floor(Math.random() * maxY)];
        } else {
            player.x = newX;
            player.y = newY;
            player.mass = newMass;
        }
        // console.log("after", player.x.length);
    }
    for (const player of players) {
        if (!(player.alive)) continue;
        for (let i = 0; i < player.x.length; i++) {
            let new_food = [];
            for (const f of food) {
                if (isCollide({
                    x: player.x[i],
                    y: player.y[i],
                    r: player.mass[i] ** 0.5,
                },
                    {
                        x: f.x,
                        y: f.y,
                        r: foodR,
                    })) {
                    player.mass[i] += foodR * foodR * foodR;
                } else {
                    new_food.push(f);
                }
            }
            food = new_food;
        }
    }

    if (food.length < maxFood) {
        for (let i = 0; i < 3; i++) {
            food.push({
                x: Math.floor(Math.random() * maxX),
                y: Math.floor(Math.random() * maxY),
                color: colors[Math.floor(Math.random() * colors.length)],
            });
        }
    }

    io.emit('players', players);
    io.emit('food', food);
}

const main = async () => {
    io.on('connect', (socket) => {
        inputsMap[socket.id] = {
            up: false,
            down: false,
            left: false,
            right: false,
        }
        let newPlayer = initialPlayer(socket.id);
        players.push(newPlayer);
        socket.on('players', (players1) => {
            players = players1;
        });

        socket.on('inputs', (inputs) => {
            inputsMap[socket.id] = inputs;
        });

        socket.on('split', (angle) => {
            let myPlayer = players.find((player) => player.id === socket.id);
            const sz = myPlayer.x.length;
            for (let i = 0; i < sz; i++) {
                if (myPlayer.mass[i] < 2 * minMass) {
                    continue;
                }
                myPlayer.mass.push(myPlayer.mass[i] / 2);
                myPlayer.mass[i] /= 2;
                myPlayer.x.push(myPlayer.x[i] + 2 * (myPlayer.mass[i] ** 0.5) * Math.cos(angle));
                myPlayer.y.push(myPlayer.y[i] + 2 * (myPlayer.mass[i] ** 0.5) * Math.sin(angle));
            }
            // for (let player of players) {
            //     console.log(player);
            // }
        });

        socket.on('disconnect', () => {
            players = players.filter((player) => player.id !== socket.id);
        });
    });

    app.use(express.static("public"));

    httpServer.listen(PORT);

    setInterval(() => {
        tick();
    }, 1000 / TICK_RATE);
}

main();