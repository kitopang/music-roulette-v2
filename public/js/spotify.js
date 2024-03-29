const SpotifyWebApi = require("spotify-web-api-node");

// Map data strucutre format --> ip_address : spotify_itme
const spotify_data = new Map();

const spotify_api = new SpotifyWebApi();

// Add a user's access_token and respective ip_address
function add_spotify(access_token, ip_address) {
    console.log("ADDING API")
    spotify_api.setAccessToken(access_token);

    spotify_api.getMe()
        .then(function (data) {
            console.log('Some information about the authenticated user', data.body);
            // Create a spotify object with a person's username, ip address, and their access_token
            spotify_item = { username: data.body.id, access_token };
            spotify_data.set(ip_address, spotify_item);
        }, function (err) {
            console.log('Something went wrong!', err);
        });
}

// Return a spotify object given a client's ip address
function get_spotify(ip_address) {
    //return spotify_data.get(spotify_data.keys().next().value);           // Uncomment this if you want to run locally. 
    return spotify_data.get(ip_address);
}
// Remove a spotify object given a client's ip address
function spotify_leave(ip_address) {
    spotify_data.delete(ip_address);
}

// Search for a playlist given a genre and return it
function generate_songs(ip_address, lobby) {
    let spotify_item = get_spotify(ip_address);

    if (spotify_item) {
        let token = spotify_item.access_token;

        // Use a player's access token
        spotify_api.setAccessToken(token);

        // Create a promise that resolves with a playlists's tracks
        return new Promise(function (resolve, reject) {
            // First, search for playlists matching a genre
            spotify_api.searchPlaylists(lobby.genre, { limit: 3 })
                .then(function (data) {
                    let id = data.body.playlists.items[1].id;
                    console.log(data.body.playlists.items);
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
}

module.exports = {
    add_spotify,
    spotify_leave,
    get_spotify,
    generate_songs
};