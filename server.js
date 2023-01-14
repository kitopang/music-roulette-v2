//https://www.youtube.com/watch?v=Bk90lT6ne3g
//https://www.youtube.com/watch?v=Bk90lT6ne3g

// Author: Kito Tanaka Pang
// github.com/kitopang


//let local_ip = "http://localhost:8888/";        // This is the IP of the machine this server is running on
//let local_ip = "http://192.168.0.104:8888/"
let local_ip = "https://music--roulette.herokuapp.com/";        // This is the IP of the machine this server is running on

const express = require('express');
const path = require('path');
const http = require('http');
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server)

const ready_players = new Set();
const total_rounds = 15;

const IP = require('ip');


app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'views')));
const { player_join, player_leave, get_player } = require('./public/js/players');
const { add_spotify, get_spotify, spotify_leave, generate_songs } = require('./public/js/spotify');
const { join_lobby, lobby_leave, get_lobby, sort_players_by_score } = require('./public/js/lobby');

const PORT = process.env.PORT || 3000;

// Allow express to use HTML as its view engine
app.engine('html', require('ejs').renderFile);
app.set('views', path.join(__dirname, '/views'));


app.get('/lobby.html', (req, res) => {
    console.log("joined lobby!!!");
});


// Handle a user entering the game homescreen
io.on('connection', socket => {
    var socketId = socket.id;

    console.log("connected!");

    // ***** THE FOLLOWING HANDLES THE LOBBY SYSTEM ***** //
    // Handle a player joining a game lobby
    socket.on('join_lobby', (code, user_ip) => {
        try {
            console.log(user_ip);
            const spotify_item = get_spotify(user_ip);
            const player = player_join(socket.id, spotify_item.username, user_ip, code, spotify_item.access_token, 0, undefined);

            // Add player to existing lobby or create a new lobby 
            join_lobby(code, player, 10);

            // Add player to lobby on socket.io side
            socket.join(player.lobby_code)

            // Convey player join information to client side
            socket.to(player.lobby_code).emit('message', spotify_item.username + ' has joined the lobby');
            //socket.to(player.lobby_code).emit('join_lobby', player);
        } catch (e) {
            socket.emit('error', e)
            console.log("----------- An error has been caught: -----------")
            console.log(e);
        }
    })

    // Return all players in a current lobby to a client
    socket.on('initialize_lobby', (code) => {
        let lobby = get_lobby(code);

        if (lobby) {
            socket.emit('initialize_lobby', lobby.players)
        }
    })

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log("socket disconnect id: " + socket.id);
        let player = get_player(socket.id);

        if (player) {
            // Let lobby know that player has left 
            socket.to(player.lobby_code).emit('disconnect_player', player);
            // Remove player from socket.io lobby
            socket.leave(player.lobby_code);

            // Remove player from lobby and player lists 
            lobby_leave(player.lobby_code, player)
            player_leave(socket.id);
        }
    });

    //Listen for start command
    socket.on('startgame', (start) => {
        let player = get_player(socket.id);
        let lobby = get_lobby(player.lobby_code);

        // Signal the lobbies to start their games
        io.in(player.lobby_code).emit('startgame', start);
    });

    // Listen for genre selection by a player
    socket.on('genre_selected', async (genre, user_ip) => {
        let player = get_player(socket.id);
        let lobby = get_lobby(player.lobby_code);

        // Update entire lobby's genre object
        lobby.genre = genre;

        // Tell players to continue
        io.in(player.lobby_code).emit('genre_selection_completed', genre);

        // Generate songs and add it to the lobby's music array. Use await to make async call blocking (not asynchronous) 
        let generated_songs = await generate_songs(user_ip, lobby);
        lobby.music_array = generated_songs;

        // Recursive call to start the rounds 
        game_timer(lobby, socket);
    });

    // ***** THE FOLLOWING HANDLES GAMEPLAY ***** //
    // If a user selects a song choice, do stuff
    socket.on('ready', (song_selection) => {
        let player = get_player(socket.id);
        console.log("PLAYER INFO --------")
        console.log(player);
        let lobby = get_lobby(player.lobby_code);

        // Increase number of ready players 
        lobby.ready_players++;

        // If song selection matches the correct song, then emit true to client 

        if (song_selection.trim() === lobby.correct_song.track.name.trim()) {
            console.log("good");
            // Calculate score using a simliar algorithim that Kahoot uses
            let score = Math.floor((1 - ((lobby.time_elapsed / lobby.max_time) / 2)) * 1000);
            player.score += score;
            socket.emit('select', true, lobby.correct_song.track.name);
        } else {
            // If song selection doesn't match current song, then emit false to client
            player.score += 0;
            socket.emit('select', false, lobby.correct_song.track.name);
        }

        // If all players have chosen a song, then continue to next round
        if (lobby.ready_players === lobby.players.length) {
            setTimeout(function () {
                initiate_next_round(lobby, player, socket);
            }, 800);
        }
    });
})


// ***** Helper functions for the above socket conditionals ***** //
// Start game timer and initiate rounds. Each round is a recursive call. 
function game_timer(lobby, socket) {
    let seconds = 0;
    let player = get_player(socket.id);

    // Choose a four random songs that players have to guess and update lobby info
    let four_random_songs = choose_random_song(lobby);
    lobby.four_random_songs = four_random_songs;
    lobby.correct_song = four_random_songs[0];

    let first_round = lobby.current_round === 0

    // Base case: the max number of rounds is played. 
    if (lobby.current_round >= lobby.max_rounds - 1) {
        io.in(player.lobby_code).emit('end_game', lobby)
        return;
    }

    // Signal to the lobbies that a new round is being run. Pass in the randomly selected song
    io.in(player.lobby_code).emit('new_round', four_random_songs, lobby.players, first_round);

    // Set a timer for each round that runs for a specified amount of time
    let interval = setInterval(function () {
        // Send server time to clients to update their HTML DOM elements
        io.in(player.lobby_code).emit('update_time', lobby.max_time - seconds);
        lobby.time_elapsed = seconds;
        seconds++;

        // If max time is reached, then continue to next round
        if (seconds === lobby.max_time) {
            // Once timer completes, call helper function to setup new round
            initiate_next_round(lobby, player, socket);
        }
    }, 1000);

    // Save this specific timer instance so each lobby has a unique timer
    lobby.interval = interval;
}

// Helper function to initiate next round
function initiate_next_round(lobby, player, socket) {
    // Sort players so player cards appear the same for every lobby

    // Reset the number of ready players and increment round count
    lobby.ready_players = 0;
    lobby.current_round++;

    // Reset timer
    clearInterval(lobby.interval);
    lobby.time_elapsed = 0;

    // Signal clients to show the scoreboard 
    // Sort players by score so the highest score appears at top of scoreboard
    sort_players_by_score(lobby);
    io.in(player.lobby_code).emit('show_results', lobby);

    setTimeout(function () {
        // Recursive call -- run next round after a few seconds 
        game_timer(lobby, socket);
    }, 2500);
}

// Choose a random song by finding a random index in player and song lists
function choose_random_song(lobby) {
    let visited_set = new Set();
    let four_random_songs = [];
    let index = 0;

    // Algorithm to choose four distinct random songs, with the first one being a song that hasn't been chosen to be the answer before
    while (index < 4) {
        var x = Math.floor(Math.random() * (lobby.music_array.length));
        // Check to see if randomly chosen index is different, otherwise choose again
        if (!visited_set.has(x)) {
            visited_set.add(x);
            // If we're adding the first song to the array, make sure it hasn't already been chosen before
            if (index == 0 && !lobby.visited_songs.has(x)) {
                lobby.visited_songs.add(x);
                four_random_songs.push(lobby.music_array[x]);
                index++;
                // If we're not adding the first song to the array, you can choose anything
            } else if (index != 0) {
                four_random_songs.push(lobby.music_array[x]);
                index++;
            }
        }
    }
    return four_random_songs;
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
    let ip

    // Get real client ID using headers (circumvent Heroku rerouting)
    var ipAddr = req.headers["x-forwarded-for"];
    if (ipAddr) {
        var list = ipAddr.split(",");
        ip = list[list.length - 1];
    } else {
        ip = req.socket.remoteAddress;
    }

    console.log('client ip: ' + ip);

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
            add_spotify(access_token, ip)
            res.render('home_page.html')


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


server.listen(process.env.PORT || 8888)