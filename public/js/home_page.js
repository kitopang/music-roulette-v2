const create_game_div = document.querySelector('#create_game');
const create_game_input = document.querySelector('#create_game_input');
const join_game_div = document.querySelector('#join_game');
const right_arrow = document.querySelector('#right_arrow');


game_codes = new Set();


create_game_div.addEventListener("click", () => {
    create_game_input.children[0].value = create_game_code();
    create_game_input.submit();

});

create_game_input.children[0].addEventListener("keypress", function (event) {
    // If the user presses the "Enter" key on the keyboard
    if (event.key === "Enter") {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click

        right_arrow.click();
    }
});

function create_game_code() {
    var seq = (Math.floor(Math.random() * 10000) + 10000).toString().substring(1);

    if (game_codes.has(seq)) {
        create_game_code();
    } else {
        game_codes.add(seq);
    }

    return seq
}
