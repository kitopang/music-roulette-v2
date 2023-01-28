const lobbies = new Map();

// Add a player to a lobby
function join_lobby(code, player, max_rounds) {
    let existing_lobby = get_lobby(code);

    // If lobby exists, add player to lobby
    if (existing_lobby) {
        existing_lobby.players.push(player);
    } else {
        // If lobby doesn't exist, create it
        // music_array --> holds all of the songs that are to be selected form
        // four_random_songs --> holds 4 random songs that were selected from music_array
        // visited_sogns --> holds all songs that have already been selected as the answer to prevent duplicates from occuring
        // interval --> holds the timer object that is unique to each lobby
        // correct song --> holds the correct song object that will be compared against player answers
        const lobby = { info: undefined, interval: undefined, players: [], ready_players: 0, current_round: 0, max_rounds, music_array: [], time_elapsed: 0, max_time: 30, genre: undefined, four_random_songs: [], visited_songs: new Set(), correct_song: undefined };
        lobby.players.push(player);

        lobbies.set(code, lobby)
    }
}

// Return lobby object given its code
function get_lobby(code) {
    return lobbies.get(code);
}

// Remove player form lobby if they leave
function lobby_leave(code, player) {
    const lobby = get_lobby(code);
    if (lobby) {
        const index = lobby.players.indexOf(player);

        // Remove player from player array within libby
        if (index >= 0) {
            lobby.players.splice(index, 1);
        }

        // Remove timer 
        clearInterval(lobby.interval);

        // Delete entire lobby if it's empty
        if (lobby.players.length === 0) {
            lobbies.delete(code);
        }
    }

    console.log("Open lobbies: ");
    console.log(lobbies);
}

function sort_players_by_score(lobby) {
    lobby.players.sort(comparator);
}

function comparator(a, b) {
    return b.score - a.score;
}

module.exports = {
    join_lobby,
    get_lobby,
    lobby_leave,
    sort_players_by_score
};