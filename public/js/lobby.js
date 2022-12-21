const lobbies = [];

function join_lobby(code, player, max_rounds) {
    let existing_lobby = get_lobby(code);

    if (existing_lobby) {
        existing_lobby.players.push(player);
    } else {
        const lobby = { code, info: undefined, interval: undefined, players: [], ready_players: 0, current_round: 0, max_rounds, music_info: undefined, time_elapsed: 0, max_time: 30 };
        lobby.players.push(player);
        lobbies.push(lobby);
    }
}

function get_lobby(code) {
    return lobbies.find(lobby => lobby.code === code);
}

function lobby_leave(lobby, player) {
    const index = lobby.players.indexOf(player);
    console.log(index);

    if (index !== -1) {
        lobby.players.splice(index, 1);
    }

    clearInterval(lobby.interval);
}

function sort_players(lobby) {
    console.log("sorting");
    lobby.players = lobby.players.sort(comparator);
}

function comparator(a, b) {
    if (a.score < b.score) {
        return 1;
    }
    if (a.score > b.score) {
        return -1;
    }

    return 0;
}






module.exports = {
    join_lobby,
    get_lobby,
    lobby_leave,
    sort_players
};