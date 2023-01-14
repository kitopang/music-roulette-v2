// Map data strucutre format --> socket_id : player
const players = new Map();

// Handle a player joining a lobby
function player_join(socket_id, username, ip_address, lobby_code, access_token, score, correct) {
    const player = { username, ip_address, lobby_code, access_token, score, correct };

    players.set(socket_id, player);
    return player;
}

// Handle a player leaving a lobby
function player_leave(socket_id) {
    players.delete(socket_id);
}

// Return player object given their socket id
function get_player(socket_id) {
    return players.get(socket_id);
}




module.exports = {
    player_join,
    player_leave,
    get_player,
};