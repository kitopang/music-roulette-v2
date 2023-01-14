const start_game_button = document.querySelector("#start_button");
const start_game_button2 = document.querySelector("#start_button2")
const lobby_div = document.querySelector('#lobby');
const round_number_div = document.querySelector('#round_number');
const round_div = document.querySelector('#round');
const joined_players_div = document.querySelector('#joined_players_list');
const lobby_number = document.querySelector('#lobby_number');
const player_choices_div = document.querySelector('#player_choices');
const album_image = document.querySelector('#album_image');
const song_title = document.querySelector('#song_title');
const song_artist = document.querySelector('#song_artist');
const play_button = document.querySelector('#play_button');
const music_box = document.querySelector('#music_box');
const myAudio = document.createElement('audio');
const score_div = document.querySelector('#score');
const round_num = document.querySelector('#round_num');
const scoreboard = document.querySelector('#scoreboard');
const end_buttons = document.querySelector('#end_buttons');
const timer = document.querySelector('#time');

const category_header = document.querySelector('#category_header');
const genre_div = document.querySelector('#genre_div');
const genre_selection = document.querySelector('#genre_selection');
const genre_custom_input = document.querySelectorAll('#genre_custom_input');

const modal_button = document.querySelector('#modal_button');

const socket = io();

let song_url;
let chosen_player;
let global_selected_card;
let correct_card;
let all_cards;
let player_is_correct;
let user_ip;

// Get lobby code from URL query string
const lobby = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})


function httpGet() {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", 'https://api.ipify.org', false); // false for synchronous request
    xmlHttp.send(null);
    user_ip = xmlHttp.responseText;
    console.log("http ip" + xmlHttp.responseText);
}

httpGet();


// Update lobby number DOM element
lobby_number.innerText = 'Lobby: ' + lobby.code;

// Handle messages for debugging purposes
socket.on('message', message => {
    console.log(message);
})

// Server --> client; removes player from lobby GUI
socket.on('disconnect_player', player => {
    remove_player_from_lobby(player);
})

// Client --> server; tells server that a new player has joined
socket.emit('join_lobby', lobby.code, user_ip);

// Server --> client; tells client to add a player to lobby GUI
socket.on('join_lobby', player => {
    add_player_to_lobby(player);
})

// Client --> server; tells server to return all the existing players in the lobby
socket.emit('initialize_lobby', lobby.code)

// Server --> client; allows client to populate lobby with players that are already in  
socket.on('initialize_lobby', players => {
    for (player of players) {
        add_player_to_lobby(player);
    }

    lobby_div.classList.remove("d-none");
    setTimeout(function () {
        lobby_div.style.opacity = '1';
    }, 500);
})

socket.on('error', e => {
    modal_button.click();
});

// Server --> client; game has started, so show genre page
socket.on('startgame', start => {
    if (start === 'true') {
        // Hide lobby GUI
        lobby_div.style.opacity = '0';
        end_buttons.style.opacity = '0';
        lobby_number.style.opacity = '0';

        // Show genre selection page
        setTimeout(function () {
            lobby_div.classList.add('d-none');
            category_header.classList.remove('d-none');
            lobby_number.classList.add('d-none');
            genre_div.classList.remove('d-none');
            setTimeout(function () {
                genre_div.style.opacity = '1';
                category_header.style.opacity = '1';
            }, 500);
            timer.style.opacity = '1';
        }, 500);
    }
})

// Server --> client; genre has been selected, so start actual gameplay
socket.on('genre_selection_completed', genre => {
    // Hide genre page
    genre_div.style.opacity = '0';
    category_header.opacity = '0';
    timer.style.opacity = '0';

    // Show timer 
    setTimeout(function () {
        genre_div.classList.add('d-none');
        category_header.classList.add('d-none');
        timer.classList.remove('d-none');

        setTimeout(function () {
            timer.style.opacity = '1';
        }, 500);

    }, 500);

});

// Server --> client; handle a new round beginning
socket.on('new_round', (music_data, player_data, first_round) => {
    render_next_round(music_data, player_data, first_round);
});

// Server --> client; handle data that shows if a player's selection was correct as deemed by the server
socket.on('select', (correct, card_value) => {
    player_is_correct = correct;

    // Find the correct card if you chose a wrong option
    for (let i = 0; i < all_cards.length; i++) {
        if (all_cards[i].innerText === card_value) {
            correct_card = all_cards[i];
            console.log(correct_card.innerText);
        }
    }
});

// Server --> client; if all players have selected their choices, show if answer are correct or not
socket.on('show_results', lobby => {
    if (global_selected_card) {
        if (player_is_correct) {
            // Display correct choice
            global_selected_card.classList.remove("bg-light");
            global_selected_card.classList.add("bg-success");
        } else {
            // Display wrong choice
            global_selected_card.classList.remove("bg-light");
            global_selected_card.classList.add("bg-danger");

            // Display correct choice
            correct_card.classList.remove("bg-transparent");
            correct_card.classList.add("bg-success");
        }
    }

    all_cards = undefined;
    correct_card = undefined;
    global_selected_card = undefined;
    player_is_correct = undefined;

    round_num.innerText = "Round " + (lobby.current_round + 1) + "/10";
    myAudio.pause();
    show_leaderboard(lobby);
})

// Server --> client; handle game ending
socket.on('end_game', lobby => {
    end_buttons.classList.remove('d-none');
    end_buttons.style.opacity = '100';
});

// Server --> client; handle timer updates
socket.on('update_time', seconds => {
    timer.innerText = "Time: " + seconds;
});

// Auxillary function that adds a player to lobby GUI and modifies DOM 
function add_player_to_lobby(player) {
    let entry = document.createElement('p');
    entry.classList.add('list-group-item');
    entry.classList.add('bg-transparent');
    entry.classList.add('border');
    entry.classList.add('border-light');
    entry.classList.add('text-light', 'p-3', 'fw-bold', 'h5', 'm-0');
    entry.innerText = player.username;

    joined_players_div.appendChild(entry);
}

// Auxillary function that removes a player to lobby GUI and modifies DOM 
function remove_player_from_lobby(player) {
    const player_elements = joined_players_div.children;

    for (let i = 0; i < player_elements.length; i++) {
        if (player_elements[i].innerText === player.username) {
            player_elements[i].remove();
        }
    }
}

// Auxillary function that updates leaderboard with players and scores
function show_leaderboard(lobby, end_game) {
    let all_players = lobby.players;

    // Clear old leaderboard
    while (scoreboard.firstChild) {
        scoreboard.removeChild(scoreboard.firstChild);
    }

    // Add each leaderboard element
    for (let i = 0; i < all_players.length; i++) {
        let list_element = document.createElement('li');
        let name = document.createElement('p');
        let score = document.createElement('p');

        list_element.classList.add('justify-content-between', 'd-flex', 'text-light', 'list-group-item', 'bg-transparent', 'border', 'border-light', 'text-light', 'pt-3');
        name.classList.add('h5');
        score.classList.add('h5');

        name.innerText = all_players[i].username;
        score.innerText = all_players[i].score;

        list_element.append(name, score);
        scoreboard.append(list_element);
    }

    setTimeout(function () {
        // Hide leaderboard
        round_div.style.opacity = '0';
        score_div.classList.remove('d-none');

        // Display round number
        setTimeout(function () {
            round_div.classList.add('d-none');
            score_div.style.opacity = '1';
            setTimeout(function () {
                score_div.style.opacity = '0';
                setTimeout(function () {
                    score_div.classList.add('d-none');
                }, 1000);
            }, 1000);
        }, 1000);
    }, 1000);
}

// After leaderboard has been updated and shown, render next round
function render_next_round(music_data, player_data, first_round) {
    // Remove old music choices
    while (player_choices_div.firstChild) {
        player_choices_div.removeChild(player_choices_div.firstChild);
    }

    play_button.value = "false";

    // Set the song to be displayed
    set_random_song(music_data[0].track);
    // Add new music choices
    populate_cards(music_data);

    // Show the round
    setTimeout(function () {
        round_number_div.classList.remove('d-none');
        setTimeout(function () {
            round_number_div.style.opacity = '1';
            setTimeout(function () {
                round_number_div.style.opacity = '0';
                setTimeout(function () {
                    round_number_div.classList.add('d-none');
                    round_div.classList.remove('d-none');
                    setTimeout(function () {
                        round_div.style.opacity = '1';
                    }, 500)
                }, 500)
            }, 1000);
        }, 500);

    }, 1000);
}

// Add new music choices given 4 random songs
function populate_cards(music_data) {
    let current_row;
    let index = 0;

    // Shuffle songs so that each player has a different arrangement of choices
    shuffle(music_data);

    // Add each song to the DOM
    for (let i = 0; i < 4; i++) {
        let song = music_data[i];

        // Create two columns of songs. This allows for more than 4 choices to be shown in the future. 
        if ((index % 2) === 0) {
            current_row = document.createElement("div");
            current_row.classList.add('row', 'mt-3');

            let entry = document.createElement("div");
            entry.classList.add('border', 'border-light', 'col', 'p-4', 'm-2', 'text-center')
            entry.setAttribute('id', 'player_card')
            entry.setAttribute('value', 'false');
            let text = document.createElement("h4");
            // Change inner text to song name instead
            text.innerText = song.track.name;
            text.classList.add('text-light', 'fw-bold');

            player_choices_div.append(current_row);
            current_row.append(entry);
            entry.append(text);
        } else {
            let entry = document.createElement("div");
            entry.classList.add('bg-transparent', 'border', 'border-light', 'col', 'p-4', 'm-2', 'text-center')
            entry.setAttribute('id', 'player_card');
            entry.setAttribute('value', 'false');
            let text = document.createElement("h4");
            text.innerText = song.track.name;
            text.classList.add('text-light', 'fw-bold');

            current_row.append(entry);
            entry.append(text);
        }

        index++;
    }

    // Add listeners to each card
    let player_cards = document.querySelectorAll('#player_card');
    all_cards = player_cards;
    for (let index = 0; index < 4; index++) {
        let selected_card = player_cards[index];
        let text = selected_card.firstChild;

        // Listener for player card selection
        selected_card.addEventListener("click", () => {
            if (!global_selected_card) {
                selected_card.classList.remove('bg-transparent', 'border-light');
                selected_card.classList.add('bg-light', 'border-dark');
                text.classList.remove('text-light');
                text.classList.add('text-dark');
                selected_card.value = "true";

                global_selected_card = selected_card;

                setTimeout(function () {
                    // Send player card selection to server to be evaluated
                    socket.emit('ready', selected_card.innerText);
                }, 1000);
            }
        });
    }
}

// Handle the case where a player changes their mind 
function remove_selection(player_card) {
    let text = player_card.firstChild;
    player_card.classList.remove('bg-light', 'border-dark');
    player_card.classList.add('bg-transparent', 'border-light');
    text.classList.remove('text-dark');
    text.classList.add('text-light');
    player_card.value = "false";
}

// Update the selected song in DOM
function set_random_song(music_data) {
    album_image.setAttribute('src', music_data.album.images[0].url);
    song_title.innerText = "Rel. " + music_data.album.release_date.substring(0, 4);
    song_url = music_data.preview_url;
}

// Fishker-Yates Unbiased Shuffle Algorithm
function shuffle(array) {
    let currentIndex = array.length, randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

// Event listener for the play button
music_box.addEventListener("click", () => {
    myAudio.setAttribute('src', song_url);

    if (play_button.value === "false") {
        myAudio.play();
        play_button.value = "true";
    } else {
        myAudio.pause();
        play_button.value = "false";
    }
})

// Event listener for the start button in lobby page
start_game_button.addEventListener("click", () => {
    socket.emit('startgame', 'true');
    console.log("emits");
});

// start_game_button2.addEventListener("click", () => {
//     socket.emit('startgame', 'true');
// });

// Event listener for the genre selection presets
genre_selection.addEventListener("click", function (e) {
    if (e.target.type === "button") {
        genre_custom_input[0].value = e.target.innerText;
        genre_custom_input[1].click();
    }
});

// Event listener for the genre custom input
genre_custom_input[1].addEventListener("click", () => {
    console.log(genre_custom_input[0].value);
    socket.emit('genre_selected', genre_custom_input[0].value, user_ip);
});

