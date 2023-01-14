const SpotifyWebApi = require("spotify-web-api-node");

const spotify_data = [];

const spotify_api = new SpotifyWebApi();

// Add a user's access_token and respective ip_address
function add_spotify(access_token, ip_address) {
    console.log("ADDING API")
    spotify_api.setAccessToken(access_token);

    spotify_api.getMe()
        .then(function (data) {
            console.log('Some information about the authenticated user', data.body);
            // Create a spotify object with a person's username, ip address, and their access_token
            spotify_item = { username: data.body.id, ip_address, access_token }
            spotify_data.push(spotify_item);
        }, function (err) {
            console.log('Something went wrong!', err);
        });
}

// Return a spotify object given a client's ip address
function get_spotify(ip_address) {
    console.log(spotify_data);
    console.log(ip_address);
    return spotify_data.find(spotify_item => spotify_item.ip_address === ip_address);
}

function spotify_leave(ip_address) {
    let spotify_object = get_spotify(ip_address);
    let index = spotify_data.indexOf(spotify_object);

    if (index >= 0) {
        spotify_data.splice(index, 1)
    }

}

// Search for a playlist given a genre and return it
function generate_songs(ip_address, lobby) {
    let spotify_item = get_spotify(ip_address);
    let token = spotify_item.access_token;

    // Use a player's access token
    spotify_api.setAccessToken(token);

    // Create a promise that resolves with a playlists's tracks
    return new Promise(function (resolve, reject) {
        // First, search for playlists matching a genre
        spotify_api.searchPlaylists(lobby.genre)
            .then(function (data) {
                let id = data.body.playlists.items[1].id;
                // Second, get the songs within this playlist
                spotify_api.getPlaylistTracks(id, {
                    offset: 1,
                    limit: 30,
                    fields: 'items',
                    market: 'US'
                })
                    .then(
                        function (data) {
                            // Return the resulting data
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