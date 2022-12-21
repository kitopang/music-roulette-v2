const create_game_div = document.querySelector('#create_game');
const create_game_input = document.querySelector('#create_game_input');
const join_game_div = document.querySelector('#join_game');

game_codes = []

create_game_div.addEventListener("click", () => {
    create_game_input.children[0].value = create_game_code();
    create_game_input.submit();
});

function create_game_code() {
    var seq = (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);

    if (game_codes.includes(seq)) {
        create_game_code();
    } else {
        game_codes.push(seq);
    }

    return seq
}
