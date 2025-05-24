const express = require("express");
const socket = require("socket.io");
const http = require("http");
const path = require("path");
const { Chess } = require("chess.js");
const { title } = require("process");

const PORT = 3000;
const app = express();

const server = http.createServer(app);

const io = socket(server);

const chess = new Chess();
let players = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniqueSocket) => {
    console.log("connected");

    if (!players.white) {
        players.white = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "w");
    }
    else if (!players.black) {
        players.black = uniqueSocket.id;
        uniqueSocket.emit("playerRole", "b");
    }
    else {
        uniqueSocket.emit("spectatorRole");
    }

    // If any player get disconnected : 
    uniqueSocket.on("disconnect", () => {
        if (uniqueSocket.id === players.white) {
            delete players.white;
        }
        else if (uniqueSocket.id === players.black) {
            delete players.black;
        }
    });

    // To move peices of chess : 
    uniqueSocket.on("move", (move) => {
        try {
            if (chess.turn() === "w" && uniqueSocket.id !== players.white) return;   // Cheking it's white player's turn and also checking that other player cannot move its peices while white's turn : 
            if (chess.turn() === "b" && uniqueSocket.id !== players.black) return;   // Cheking it's black player's turn and also checking that other player cannot move its peices while black's turn : 

            const result = chess.move(move);    // If the move is right then it will go ahead otherwise we will handle it in the catch : 
            if (result) {
                currentPlayer = chess.turn();   // Storing whose turn is next : 
                io.emit("move", move);  // Sending the move info to the frontend for all the spectator and to the players as well : 
                io.emit("boardState", chess.fen());     // This will send the board state of the game : 
            }
            else {
                console.log("Invalid Move: ", move);     // Telling that it's an invalid move : 
                uniqueSocket.emit("invalidMove", move);     // Sending the invalid move to all : 
            }
        }
        catch (err) {
            console.log("Error: ", err);
            uniqueSocket.emit("Invalid move: ", move);
        }
    });
});

server.listen(PORT, () => console.log("Server is running on the port: ", PORT));
