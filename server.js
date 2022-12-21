//https://www.youtube.com/watch?v=Bk90lT6ne3g
//https://www.youtube.com/watch?v=Bk90lT6ne3g

let local_ip = "http://localhost:8888/";        // This is the IP of the machine this server is running on

const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server)

const ready_players = new Set();
const total_rounds = 15;

app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
const { player_join, player_leave, get_player } = require('./public/js/players');
const { add_spotify, get_spotify } = require('./public/js/spotify');
const { join_lobby, lobby_leave, get_lobby, sort_players } = require('./public/js/lobby');

const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '/views'));

// Handle a user entering the game homescreen
io.on('connection', socket => {
    var socketId = socket.id;
    var clientIp = socket.request.connection.remoteAddress;

    console.log("connected!");


    // ***** THE FOLLOWING HANDLES THE LOBBY SYSTEM ***** //
    // Handle a player joining a game lobby
    socket.on('join_lobby', (code) => {
        const spotify_item = get_spotify(clientIp);
        const player = player_join(socket.id, spotify_item.username, code, spotify_item.topTracks, 0, undefined);

        // Add player to existing lobby or create a new lobby 
        join_lobby(code, player, 15);

        // Add player to lobby on socket.io side
        socket.join(player.lobby_code)
        console.log(player.username);

        // Convey player join information to client side
        socket.to(player.lobby_code).emit('message', spotify_item.username + ' has joined the lobby');
        socket.to(player.lobby_code).emit('join_lobby', player);
    })

    // Return all players in a current lobby to a client
    socket.on('initialize_lobby', (code) => {
        socket.emit('initialize_lobby', get_lobby(code).players)
    })

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log("socket! " + socket.id);
        let player = get_player(socket.id);

        if (player) {
            let lobby = get_lobby(player.lobby_code);

            // Let lobby know that player has left 
            socket.to(player.lobby_code).emit('disconnect_player', player);
            // Remove player from socket.io lobby
            socket.leave(player.lobby_code);

            // Remove player from lobby and player lists 
            lobby_leave(lobby, player)
            player_leave(socket.id);
        }
    });

    //Listen for start command
    socket.on('startgame', (start) => {
        let player = get_player(socket.id);
        let lobby = get_lobby(player.lobby_code);

        // Signal the lobbies to start their games
        io.in(player.lobby_code).emit('startgame', start);

        // Recursive call to start the rounds
        game_timer(lobby, socket);
    });

    // ***** THE FOLLOWING HANDLES GAMEPLAY ***** //
    // If a user selects a song choice, do stuff
    socket.on('ready', (username) => {
        let player = get_player(socket.id);
        let lobby = get_lobby(player.lobby_code);

        // Increase number of ready players 
        lobby.ready_players++;

        // If song selection matches the correct song, then emit true to client 
        if (username.trim() === lobby.music_info.player_chosen.username.trim()) {
            // Calculate score using a simliar algorithim that Kahoot uses
            let score = Math.floor((1 - ((lobby.time_elapsed / lobby.max_time) / 2)) * 1000);
            player.score += score;
            socket.emit('select', true);
        } else {
            // If song selection doesn't match current song, then emit false to client
            player.score += 0;
            socket.emit('select', false);
        }

        // If all players have chosen a song, then continue to next round
        if (lobby.ready_players === lobby.players.length) {
            initiate_next_round(lobby, player, socket);
        }
    });
})


// ***** Helper functions for the above conditionals ***** //
// Start game timer and initiate rounds. Each round is a recursive call. 
function game_timer(lobby, socket) {
    let seconds = 0;
    let player = get_player(socket.id);
    // Choose a random song that players have to guess
    let music_info = choose_random_song(lobby.players);
    let first_round = lobby.current_round === 0;

    // Base case: the max number of rounds is played. 
    if (lobby.current_round === lobby.max_rounds) {
        io.in(player.lobby_code).emit('end_game', lobby)
        return;
    }

    // Signal to the lobbies that a new round is being run. Pass in the randomly selected song
    io.in(player.lobby_code).emit('new_round', music_info, lobby.players, first_round);

    // Set a timer for each round that runs for a specified amount of time
    let interval = setInterval(function () {
        io.in(player.lobby_code).emit('update_time', lobby.max_time - seconds);
        lobby.time_elapsed = seconds;
        seconds++;
        if (seconds === lobby.max_time) {
            // Once timer completes, call helper function to setup new round
            initiate_next_round(lobby, player, socket);
        }
    }, 1000);

    // Save this specific timer instance so each lobby has a unique timer
    lobby.interval = interval;
    lobby.music_info = music_info;
}

// Helper function to initiate next round
function initiate_next_round(lobby, player, socket) {
    // Sort players so player cards appear the same for every lobby
    sort_players(lobby);

    // Reset the number of ready players and increment round count
    lobby.ready_players = 0;
    lobby.current_round++;

    // Reset timer
    clearInterval(lobby.interval);
    lobby.time_elapsed = 0;

    // Signal clients to show the scoreboard 
    io.in(player.lobby_code).emit('show_results', lobby);

    setTimeout(function () {
        // Recursive call -- run next round after a few seconds 
        game_timer(lobby, socket);
    }, 3000);
}

// Choose a random song by finding a random index in player and song lists
function choose_random_song(current_players) {
    let random_player_index = Math.floor(Math.random() * current_players.length);
    let random_player = current_players[random_player_index];
    let random_song_index = Math.floor(Math.random() * random_player.top_tracks.length);
    let random_song = random_player.top_tracks[random_song_index];

    let music_info = { song_image_url: random_song.album.images[0].url, song_url: random_song.preview_url, title: random_song.name, artist: random_song.artists[0].name, player_chosen: random_player }
    return music_info;
}


// ***** The following handles Spotify Auth ***** //
var SpotifyWebApi = require('spotify-web-api-node');
const { isObject } = require('util');

// Only need top tracks from a user
const scopes = [
    'user-top-read',
];

// All possible scopes 

// 'ugc-image-upload',
// 'user-read-playback-state',
// 'user-modify-playback-state',
// 'user-read-currently-playing',
// 'streaming',
// 'app-remote-control',
// 'user-read-email',
// 'user-read-private',
// 'playlist-read-collaborative',
// 'playlist-modify-public',
// 'playlist-read-private',
// 'playlist-modify-private',
// 'user-library-modify',
// 'user-library-read',
// 'user-top-read',
// 'user-read-playback-position',
// 'user-read-recently-played',
// 'user-follow-read',
// 'user-follow-modify'

// credentials are optional
var spotifyApi = new SpotifyWebApi({
    clientId: '618a3849a7234a949622b2722ba8bfdb',
    clientSecret: '4037f89d0c0f464fa173e62f9fa247fa',
    redirectUri: local_ip + 'callback'                  // In Spotify Dev, set the callback URI to this link. 
});                                                     // This link should be your machine IP + /callback

// When spotify login is prompted, redirect user to Spotify login
app.get('/spotifylogin', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
});

app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;
    const ip = req.socket.remoteAddress;
    console.log('added ip ' + ip)

    if (error) {
        console.error('Callback Error:', error);
        res.send(`Callback Error: ${error}`);
        return;
    }

    spotifyApi
        .authorizationCodeGrant(code)
        .then(data => {
            const access_token = data.body['access_token'];
            const refresh_token = data.body['refresh_token'];
            const expires_in = data.body['expires_in'];

            spotifyApi.setAccessToken(access_token);
            spotifyApi.setRefreshToken(refresh_token);

            console.log('access_token:', access_token);
            console.log('refresh_token:', refresh_token);

            console.log(
                `Sucessfully retreived access token. Expires in ${expires_in} s.`
            );

            // Store spotify information of each joined user 
            add_spotify(access_token, ip, res)

            setInterval(async () => {
                const data = await spotifyApi.refreshAccessToken();
                const access_token = data.body['access_token'];

                console.log('The access token has been refreshed!');
                console.log('access_token:', access_token);
                spotifyApi.setAccessToken(access_token);
            }, expires_in / 2 * 1000);
        })
        .catch(error => {
            console.error('Error getting Tokens:', error);
            res.send(`Error getting Tokens: ${error}`);
        });

});


server.listen(8888, () => {
    console.log("Open on port: " + PORT)
})