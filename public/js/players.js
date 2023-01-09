const players = [];

function player_join(socket_id, username, lobby_code, access_token, score, correct) {
    const player = { socket_id, username, lobby_code, access_token, score, correct };

    players.push(player);

    console.log(players);

    return player;
}

function player_leave(socket_id) {
    const index = players.findIndex(player => player.socket_id === socket_id);

    if (index !== -1) {
        players.splice(index, 1);
    }
}


function get_player(socket_id) {
    return players.find(player => player.socket_id === socket_id);
}




module.exports = {
    player_join,
    player_leave,
    get_player,
};