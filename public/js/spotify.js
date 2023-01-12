const SpotifyWebApi = require("spotify-web-api-node");

const spotify_data = [];

const spotify_api = new SpotifyWebApi();


function add_spotify(access_token, ip_address) {
    spotify_api.setAccessToken(access_token);

    spotify_api.getMe()
        .then(function (data) {
            console.log('Some information about the authenticated user', data.body);
            spotify_item = { username: data.body.id, ip_address, access_token }
            spotify_data.push(spotify_item);
        }, function (err) {
            console.log('Something went wrong!', err);
        });
}

function get_spotify(ip_address) {
    return spotify_data.find(spotify_item => spotify_item.ip_address === ip_address);
}

function generate_songs(ip_address, lobby) {
    let spotify_item = get_spotify(ip_address);
    let token = spotify_item.access_token;

    spotify_api.setAccessToken(token);

    return new Promise(function (resolve, reject) {
        spotify_api.searchPlaylists(lobby.genre)
            .then(function (data) {
                let id = data.body.playlists.items[1].id;

                spotify_api.getPlaylistTracks(id, {
                    offset: 1,
                    limit: 30,
                    fields: 'items'
                })
                    .then(
                        function (data) {
                            resolve(data.body.items);
                        },
                        function (err) {
                            console.log('Something went wrong!', err);
                        }
                    );

            }, function (err) {
                console.log('Something went wrong!', err);
            });
    });
}

module.exports = {
    add_spotify,
    get_spotify,
    generate_songs
};