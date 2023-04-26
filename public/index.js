const canvasEl = document.getElementById('canvas');
canvasEl.width = window.innerWidth;
canvasEl.height = window.innerHeight;

const socket = io();

const canvas = canvasEl.getContext("2d");
const TILE_SIZE = 32;

const maxX = 3000;
const maxY = 3000;

const foodR = 5;

let players = [];

let food = [];

socket.on('connect', ()=> {
    console.log("connected");
});

socket.on('players', (serverPlayers) => {
    players = serverPlayers;
});

socket.on('food', (serverFood) => {
    food = serverFood;
});

const inputs = {
    'up': false,
    'down': false,
    'left': false,
    'right': false,
};

let mouseX = 0, mouseY = 0;

window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

window.addEventListener('keydown', (e) => {
    const myPlayer = players.find((player) => player.id === socket.id);
    // console.log(e.key);
    if (myPlayer.alive) {
        if (e.key == 'w') {
            inputs['up'] = true;
        } else if (e.key == 's') {
            inputs['down'] = true;
        } else if (e.key == 'a') {
            inputs['left'] = true;
        } else if (e.key == 'd') {
            inputs['right'] = true;
        } else if (e.key == ' ') {
            // console.log(e);
            let angle = Math.atan2(mouseY - canvasEl.height / 2, mouseX - canvasEl.width / 2);
            // console.log(angle);
            socket.emit("split", angle);
            return;
        }
        socket.emit('inputs', inputs);
    } else {
        inputs['up'] = false;
        inputs['down'] = false;
        inputs['left'] = false;
        inputs['right'] = false;
        // console.log(e.key);
        if (e.key == 'Enter') {
            myPlayer.alive = true;
        } else if (e.key == 'Backspace') {
            if (myPlayer.name.length > 0) {
                myPlayer.name = myPlayer.name.substring(0, myPlayer.name.length - 1);
            }
        } else if (e.key.length == 1){
            if (myPlayer.name.length < 20) {
                myPlayer.name = myPlayer.name + e.key;
            }
        }
        socket.emit('players', players);
    }
});

window.addEventListener('keyup', (e) => {
    const myPlayer = players.find((player) => player.id === socket.id);
    if (myPlayer.alive) {
        if (e.key == 'w') {
            inputs['up'] = false;
        } else if (e.key == 's') {
            inputs['down'] = false;
        } else if (e.key == 'a') {
            inputs['left'] = false;
        } else if (e.key == 'd') {
            inputs['right'] = false;
        }
    } else {
        inputs['up'] = false;
        inputs['down'] = false;
        inputs['left'] = false;
        inputs['right'] = false;
    }
    socket.emit('inputs', inputs);
});

function loop() {
    canvas.clearRect(0, 0, canvasEl.width, canvasEl.height);
    // canvas.fillStyle = "#000000";
    // canvas.fillRect(0, 0, canvasEl.width, canvasEl.height);

    const myPlayer = players.find((player) => player.id === socket.id);
    let cameraX = 0, cameraY = 0;
    if (myPlayer) {
        
        if (!(myPlayer.alive)) {
            canvas.font = "30px Comic Sans MS";
            canvas.fillStyle = "red";
            canvas.textAlign = "center";
            canvas.fillText("Чтобы начать нажмите Enter", canvasEl.width/2, canvasEl.height/2);
            canvas.fillText("Ваше имя: " + myPlayer.name, canvasEl.width/2, canvasEl.height/2 + 30);
        } else {
            let playerX = 0, playerY = 0;
            for (let xx of myPlayer.x) {
                playerX += xx;
            }
            for (let yy of myPlayer.y) {
                playerY += yy;
            }
            cameraX = playerX / myPlayer.x.length - canvasEl.width / 2;
            cameraY = playerY / myPlayer.x.length - canvasEl.height / 2;
            let STEP_SMALL = 20;
            for (let x = 0; x <= maxX; x += STEP_SMALL) {
                canvas.width = 1;
                canvas.strokeStyle = "#d4dcde";
                canvas.beginPath();
                canvas.moveTo(x - cameraX, -cameraY);
                canvas.lineTo(x - cameraX, maxY - cameraY);
                canvas.stroke();
            }

            for (let y = 0; y <= maxY; y += STEP_SMALL) {
                canvas.width = 1;
                canvas.strokeStyle = "#d4dcde";
                canvas.beginPath();
                canvas.moveTo(-cameraX, y - cameraY);
                canvas.lineTo(maxX - cameraX, y - cameraY);
                canvas.stroke();
            }

            let STEP_BIG = 500;

            for (let x = 0; x <= maxX; x += STEP_BIG) {
                canvas.width = 3;
                canvas.strokeStyle = "#afbfc2";
                canvas.beginPath();
                canvas.moveTo(x - cameraX, -cameraY);
                canvas.lineTo(x - cameraX, maxY - cameraY);
                canvas.stroke();
            }

            for (let y = 0; y <= maxY; y += STEP_BIG) {
                canvas.width = 3;
                canvas.strokeStyle = "#afbfc2";
                canvas.beginPath();
                canvas.moveTo(-cameraX, y - cameraY);
                canvas.lineTo(maxX - cameraX, y - cameraY);
                canvas.stroke();
            }

            for (const f of food) {
                canvas.fillStyle = f.color;
                canvas.strokeStyle = f.color;
                canvas.beginPath();
                canvas.arc(f.x - cameraX, f.y - cameraY, foodR, 0, 2 * Math.PI);
                canvas.fill();
                canvas.stroke();
            }

            let sm = 0;
            for (let mass of myPlayer.mass) {
                sm += mass;
            }
            for (const player of players) {
                if (!player) continue;
                if (!(player.alive)) continue;
                for (let i = 0; i < player.x.length; i++) {
                    canvas.fillStyle = "white";
                    canvas.strokeStyle = "black";
                    canvas.beginPath();
                    canvas.arc(player.x[i] - cameraX, player.y[i] - cameraY, player.mass[i] ** 0.5, 0, 2 * Math.PI);
                    canvas.fill();
                    canvas.stroke();
                }
            }
            canvas.font = "20px Comic Sans MS";
            canvas.fillStyle = "black";
            canvas.fillText("Масса: " + parseInt(sm / 10), 80, 40);
            for (const player of players) {
                if (!(player.alive)) continue; 
                for (let i = 0; i < player.x.length; i++) {
                    let name = player.name;
                    let fontNow = canvas.font;
                    let pos = 0;
                    for (let j = 0; j < fontNow.length; j++) {
                        if (fontNow[j] == ' ') {
                            pos = j;
                            break;
                        }
                    }
                    let newFont = Math.floor(3 * ((player.mass[i]) ** 0.5) / player.name.length);
                    canvas.textAlign = "center";
                    canvas.font = String(newFont)+ "px"+ fontNow.substring(pos);
                    canvas.fillText(name, player.x[i] - cameraX, player.y[i] - cameraY);
                }
            }
            canvas.font = "20px Comic Sans MS";
            let was = false;
            let cnt = 0;
            players.sort(function (a, b) {
                let am = 0, bm = 0;
                for (let ms of a.mass) {
                    am += ms;
                }
                for (let ms of b.mass) {
                    bm += ms;
                }
                if (am > bm) {
                    return -1;
                } else if (am == bm) {
                    return 0;
                }
                return 1;
            });
            for (let i = 0; i < players.length && cnt < 10; i++) {
                if (players[i].alive) {
                    cnt++;
                    canvas.fillStyle = "black";
                    if (players[i].id == myPlayer.id) {
                        was = true;
                        canvas.fillStyle = "red";
                    }
                    canvas.fillText(String(cnt) + " - " + players[i].name, canvasEl.width - 100, 20 * (cnt + 1));
                }
            }
            if (!was) {
                canvas.fillStyle = "black";
                canvas.fillText("...", canvasEl.width - 100, 20 * (cnt + 1));
                let pos = 0;
                for (let i = 0; i < players.length; i++) {
                    if (players[i].alive) {
                        pos++;
                    }
                    if (players[i].id == myPlayer.id) {
                        break;
                    } 
                }
                canvas.fillStyle = "red";
                canvas.fillText(String(pos) + " - " + myPlayer.name, canvasEl.width - 100, 20 * (cnt + 2));
            }
        }
    }

    window.requestAnimationFrame(loop);
}

window.requestAnimationFrame(loop);