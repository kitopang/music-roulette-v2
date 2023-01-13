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

let song_url;
let chosen_player;
let global_selected_card;
let player_is_correct;


const lobby = Qs.parse(location.search, {
    ignoreQueryPrefix: true
})

lobby_number.innerText = 'Lobby: ' + lobby.code;
console.log(lobby.code);

const socket = io();

socket.on('message', message => {
    console.log(message);
})

socket.on('disconnect_player', player => {
    remove_player_from_lobby(player);
})

socket.emit('join_lobby', lobby.code);

socket.on('join_lobby', player => {
    add_player_to_lobby(player);
})

socket.emit('initialize_lobby', lobby.code)

socket.on('initialize_lobby', players => {
    for (player of players) {
        add_player_to_lobby(player);
    }
})

socket.on('startgame', start => {
    if (start === 'true') {
        lobby_div.style.opacity = '0';
        end_buttons.style.opacity = '0';
        lobby_number.style.opacity = '0';


        setTimeout(function () {
            lobby_div.classList.add('d-none');
            category_header.classList.remove('d-none');
            lobby_number.classList.add('d-none');
            genre_div.classList.remove('d-none');
            //timer.classList.remove('d-none');
            timer.style.opacity = '1';
        }, 500);
    }

    console.log(start)
})

socket.on('genre_selection_completed', genre => {
    genre_div.style.opacity = '0';
    category_header.opacity = '0';
    timer.style.opacity = '0';

    setTimeout(function () {
        genre_div.classList.add('d-none');
        category_header.classList.add('d-none');
        timer.classList.remove('d-none');

        setTimeout(function () {
            timer.style.opacity = '1';
        }, 500);

    }, 500);

});


socket.on('new_round', (music_data, player_data, first_round) => {
    console.log(music_data);
    render_next_round(music_data, player_data, first_round);
});

socket.on('select', (correct) => {
    player_is_correct = correct;
});

socket.on('show_results', lobby => {
    if (global_selected_card) {
        if (player_is_correct) {
            global_selected_card.classList.remove("bg-light");
            global_selected_card.classList.add("bg-success");
        } else {
            global_selected_card.classList.remove("bg-light");
            global_selected_card.classList.add("bg-danger");
        }
    }
    global_selected_card = undefined;
    player_is_correct = undefined;

    round_num.innerText = "Round " + (lobby.current_round + 1) + "/10";
    myAudio.pause();
    show_leaderboard(lobby);
})

socket.on('end_game', lobby => {
    end_buttons.classList.remove('d-none');
    end_buttons.style.opacity = '100';
});

socket.on('update_time', seconds => {
    timer.innerText = "Time: " + seconds;
});

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

function remove_player_from_lobby(player) {
    const player_elements = joined_players_div.children;

    for (let i = 0; i < player_elements.length; i++) {
        if (player_elements[i].innerText === player.username) {
            player_elements[i].remove();
        }
    }
}


function show_leaderboard(lobby, end_game) {
    let all_players = lobby.players;

    while (scoreboard.firstChild) {
        scoreboard.removeChild(scoreboard.firstChild);
    }

    all_players.sort();

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
        round_div.style.opacity = '0';
        score_div.classList.remove('d-none');

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

function update_time(seconds) {

}

function render_next_round(music_data, player_data, first_round) {

    while (player_choices_div.firstChild) {
        player_choices_div.removeChild(player_choices_div.firstChild);
    }

    play_button.value = "false";
    set_random_song(music_data[0].track);
    populate_cards(music_data);


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

// replace player_data with song_data. 
function populate_cards(music_data) {
    shuffle(music_data);

    let current_row;
    let index = 0;
    for (let i = 0; i < 4; i++) {
        let song = music_data[i];


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

    let player_cards = document.querySelectorAll('#player_card');
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
                    console.log("SENDING " + selected_card.innerText)
                    socket.emit('ready', selected_card.innerText);

                }, 1000);
            }
        });
    }
}

function remove_selection(player_card) {
    let text = player_card.firstChild;
    player_card.classList.remove('bg-light', 'border-dark');
    player_card.classList.add('bg-transparent', 'border-light');
    text.classList.remove('text-dark');
    text.classList.add('text-light');
    player_card.value = "false";
}

function set_random_song(music_data) {
    album_image.setAttribute('src', music_data.album.images[0].url);
    song_title.innerText = "Rel. " + music_data.album.release_date.substring(0, 4);
    song_url = music_data.preview_url;
}

// Fishker-Yates Unbiased Shuffle Algo
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

play_button.addEventListener("click", () => {
    myAudio.setAttribute('src', song_url);

    if (play_button.value === "false") {
        myAudio.play();
        play_button.value = "true";
    } else {
        myAudio.pause();
        play_button.value = "false";
    }
})


start_game_button.addEventListener("click", () => {
    socket.emit('startgame', 'true');
    console.log("emits");
});

start_game_button2.addEventListener("click", () => {
    socket.emit('startgame', 'true');
});

genre_selection.addEventListener("click", function (e) {
    if (e.target.type === "button") {
        genre_custom_input[0].value = e.target.innerText;
        genre_custom_input[1].click();
    }
});

genre_custom_input[1].addEventListener("click", () => {
    console.log(genre_custom_input[0].value);
    socket.emit('genre_selected', genre_custom_input[0].value);
});

