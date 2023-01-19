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
const hint = document.querySelector('#hint');
const play_button = document.querySelector('#play_button');
const music_box = document.querySelector('#music_box');
const myAudio = document.createElement('audio');
const scoreboard_container = document.querySelector('#score');
const round_num = document.querySelector('#round_num');
const scoreboard = document.querySelector('#scoreboard');
const end_buttons = document.querySelector('#end_buttons');
const timer = document.querySelector('#time');
const category_header = document.querySelector('#category_header');
const genre_div = document.querySelector('#genre_div');
const genre_selection = document.querySelector('#genre_selection');
const genre_custom_input = document.querySelectorAll('#genre_custom_input');
const modal_button = document.querySelector('#modal_button');
const player_cards = document.querySelectorAll('#player_card');
const genre_indicator = document.querySelector('#genre_indicator');
const modal_text = document.querySelector("#modal_text");
const btnradio1 = document.querySelector('#btnradio1');
const btnradio2 = document.querySelector('#btnradio2');
const btnradio3 = document.querySelector('#btnradio3');
const return_btn = document.querySelector('#return');
const volume_range = document.querySelector('#volume_range');


const socket = io();

let deactivated = false;
let song_url;
let chosen_player;
let global_selected_card;
let correct_card;
let all_cards;
let player_is_correct;
let user_ip;
let rounds = 5;
let playing;

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
socket.on('initialize_lobby', (players, lobby) => {
    for (player of players) {
        add_player_to_lobby(player);
    }

    // Initialize round number for first run
    lobby_div.classList.remove("d-none");
    setTimeout(function () {
        lobby_div.style.opacity = '1';

        // DEBUGGING
        // round_div.classList.remove('d-none');
        //round_div.style.opacity = '1';
    }, 300);
})

// Handle server error
socket.on('error', e => {
    if (e === "spotify") {
        modal_text.innerText = "Couldn't find songs for selected genre. Try different keywords and check spelling."
    } else {
        modal_text.innerText = "An unknown error occured. Try restarting app and signing in to Spotify."
    }
    modal_button.click();
});

// Handle round number selection in lobby screen
socket.on('round_num_sel', num => {
    // Turn off onclicklistener to prevent infinite loop
    deactivated = true;
    if (num === 5) {
        btnradio1.click();
    } else if (num === 10) {
        btnradio2.click();
    } else {
        btnradio3.click();
    }

    // Turn it back on so a user can click again
    deactivated = false;
})

// Server --> client; game has started, so show genre page
socket.on('startgame', lobby => {
    // Send round number text
    round_num.innerText = "Round " + (lobby.current_round + 1) + "/" + lobby.max_rounds;

    // Hide lobby GUI
    lobby_div.style.opacity = '0';
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
        }, 300);
        timer.style.opacity = '1';
    }, 300);
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
        genre_indicator.innerText = genre;

        setTimeout(function () {
            timer.style.opacity = '1';
            genre_indicator.style.opacity = '1';
        }, 300);

    }, 300);

});

// Server --> client; handle a new round beginning
socket.on('new_round', (music_data, player_data, first_round) => {
    render_next_round(music_data, player_data, first_round);
});

// Server --> client; handle data that shows if a player's selection was correct as deemed by the server
socket.on('select', (correct, correct_card_value) => {
    player_is_correct = correct;

    if (correct == false) {
        // Find the correct card if you chose a wrong option
        for (let i = 0; i < player_cards.length; i++) {
            if (player_cards[i].innerText === correct_card_value) {
                correct_card = player_cards[i];
            }
        }
    }
});

// Server --> client; if all players have selected their choices, show if answer are correct or not
socket.on('show_results', lobby => {
    if (global_selected_card) {
        if (player_is_correct == true) {
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

    correct_card = undefined;
    global_selected_card = undefined;
    player_is_correct = undefined;

    round_num.innerText = "Round " + (lobby.current_round + 1) + "/" + lobby.max_rounds;
    myAudio.pause();
});

socket.on('show_leaderboard', (lobby) => {
    last_round = lobby.current_round >= lobby.max_rounds;
    show_leaderboard(lobby, last_round);
})

// Server --> client; handle game ending
socket.on('end_game', lobby => {
    end_buttons.classList.remove('d-none');
    setTimeout(function () {
        end_buttons.style.opacity = '100';
    }, 100);
});

socket.on('reset_lobby', () => {
    reset_cards();
    genre_custom_input[0].value = "";
    hint.classList.remove('d-none');
    end_buttons.style.opacity = '0';
    scoreboard_container.style.opacity = '0';
    timer.style.opacity = '0';

    setTimeout(function () {
        end_buttons.classList.add("d-none");
        scoreboard_container.classList.add("d-none");
        timer.classList.add("d-none");
        lobby_div.classList.remove("d-none");
        lobby_number.classList.remove("d-none");
        setTimeout(function () {
            lobby_div.style.opacity = "1";
            lobby_number.style.opacity = "1";
        }, 500);
    }, 500);
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
function show_leaderboard(lobby, last_round) {
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

        name.innerHTML = all_players[i].username + "&nbsp;&nbsp;&nbsp;";

        let score_span = document.createElement('span');
        let increment_span = document.createElement('span');
        score_span.innerText = all_players[i].score;
        increment_span.innerHTML = "+" + all_players[i].score_increase;

        if (all_players[i].score_increase > 0) {
            increment_span.style.color = "#43A047";
        } else {
            increment_span.style.color = "#dc3545";
        }

        score.append(score_span);
        name.append(increment_span);
        list_element.append(name, score);
        scoreboard.append(list_element);
    }


    // Hide round
    round_div.style.opacity = '0';
    scoreboard_container.classList.remove('d-none');

    // Display scoreboard
    setTimeout(function () {
        round_div.classList.add('d-none');
        scoreboard_container
            .style.opacity = '1';
        // If it's the last round, don't hide scoreboard
        if (!last_round) {
            setTimeout(function () {
                scoreboard_container
                    .style.opacity = '0';
                setTimeout(function () {
                    scoreboard_container
                        .classList.add('d-none');
                    reset_cards();
                }, 500);
            }, 1600);
        }
    }, 500);
}

// After leaderboard has been updated and shown, render next round
function render_next_round(music_data, player_data, first_round) {
    // Remove old music choices

    playing = "false";

    // Set the song to be displayed
    set_random_song(music_data[0].track);
    // Add new music choices
    populate_cards(music_data);

    // Show the round
    setTimeout(function () {
        round_number_div.classList.remove('d-none');
        setTimeout(function () {
            round_number_div.style.opacity = '1';

            // If first_round, show the round_number div for slightly longer so the hint can be read. 
            if (first_round) {
                setTimeout(function () {
                    round_number_div.style.opacity = '0';
                    setTimeout(function () {
                        round_number_div.classList.add('d-none');
                        round_div.classList.remove('d-none');
                        setTimeout(function () {
                            round_div.style.opacity = '1';
                            // Hide hint for subsequent rounds
                            hint.classList.add('d-none');
                            music_box.children[0].click();
                        }, 300)
                    }, 300)
                }, 2000);
            } else {
                setTimeout(function () {
                    round_number_div.style.opacity = '0';
                    setTimeout(function () {
                        round_number_div.classList.add('d-none');
                        round_div.classList.remove('d-none');
                        setTimeout(function () {
                            round_div.style.opacity = '1';
                            music_box.children[0].click();
                        }, 300)
                    }, 300)
                }, 1000);
            }
        }, 300);

    }, 1000);
}

// Add new music choices given 4 random songs
function populate_cards(music_data) {
    let current_row;
    let index = 0;

    // Shuffle songs so that each player has a different arrangement of choices
    shuffle(music_data);

    // Add each song to the DOM
    for (let index = 0; index < 4; index++) {
        player_cards[index].children[0].innerText = music_data[index].track.name;
    }
}

function reset_cards() {
    for (let index = 0; index < player_cards.length; index++) {
        player_cards[index].setAttribute("class", "");
        player_cards[index].children[0].setAttribute("class", "")
        player_cards[index].classList.add("border", "border-light", "col", "p-4", "m-2", "text-center");
        player_cards[index].children[0].classList.add("text-light", "fw-bold")
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
music_box.children[0].addEventListener("click", () => {
    myAudio.setAttribute('src', song_url);

    if (playing === "false") {
        myAudio.play();
        playing = "true";
    } else {
        myAudio.pause();
        playing = "false";
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

// Event listener for player card choices
for (let index = 0; index < 4; index++) {
    let selected_card = player_cards[index];
    let text = selected_card.children[0];

    // Listener for player card selection
    selected_card.addEventListener("click", () => {
        if (!global_selected_card) {
            selected_card.classList.remove('bg-transparent', 'border-light');
            selected_card.classList.add('bg-light', 'border-dark');
            text.classList.remove('text-light');
            text.classList.add('text-dark');
            selected_card.value = "true";

            global_selected_card = selected_card;

            // Send player card selection to server to be evaluated
            socket.emit('ready', selected_card.innerText);
        }
    });
}

btnradio1.addEventListener("click", () => {
    if (!deactivated) {
        // Change 5 to 1 for debugging --> will only run one round
        socket.emit('round_num_sel', 5);
    }
});

btnradio2.addEventListener("click", () => {
    if (!deactivated) {
        socket.emit('round_num_sel', 10);
    }
});

btnradio3.addEventListener("click", () => {
    if (!deactivated) {
        socket.emit('round_num_sel', 15);
    }
});

return_btn.addEventListener("click", () => {
    socket.emit('reset_lobby');
});

volume_range.oninput = function () {
    myAudio.volume = volume_range.value / 100;
};
