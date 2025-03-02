document.addEventListener('DOMContentLoaded', function() {
    const apiKey = 'AIzaSyCb1zegvzf0iSjF6BkWrIA3KJQTfzhq3FQ'; // **REPLACE WITH YOUR ACTUAL API KEY**
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const chatDisplay = document.getElementById('chat-display');
    const messageInput = document.getElementById('message-input');
    const sendButton = document.getElementById('send-button');
    const gameBoardElement = document.getElementById('game-board');
    const newGameButton = document.getElementById('new-game-button');

    let gameBoard = [];
    const boardSize = 10;
    let currentPlayer = 'user';
    let gameActive = false;

    function initializeGameBoard() {
        gameBoard = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
        currentPlayer = 'user';
        gameActive = true;
        renderGameBoard();
        displayMessage("New game started. You are 'O', Gemini is 'X'. Your turn.", 'gemini');
        enableGameInteraction();
        // disableChatInput();  **REMOVED: Do not disable chat input anymore **
    }

    function renderGameBoard() {
        gameBoardElement.innerHTML = '';
        gameBoardElement.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;

        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                const cell = document.createElement('div');
                cell.classList.add('game-cell');
                cell.dataset.row = row;
                cell.dataset.col = col;

                if (gameBoard[row][col] === 'O') {
                    cell.textContent = 'O';
                    cell.classList.add('user-piece');
                } else if (gameBoard[row][col] === 'X') {
                    cell.textContent = 'X';
                    cell.classList.add('gemini-piece');
                }

                cell.addEventListener('click', handleCellClick);
                gameBoardElement.appendChild(cell);
            }
        }
    }

    function handleCellClick(event) {
        if (!gameActive || currentPlayer !== 'user') return;

        const cell = event.target;
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);

        if (gameBoard[row][col] === null) {
            gameBoard[row][col] = 'O';
            renderGameBoard();

            if (checkWinCondition('O')) {
                endGame('user');
                return;
            }

            if (isBoardFull()) {
                endGame('draw');
                return;
            }

            currentPlayer = 'gemini';
            disableGameInteraction();
            geminiTurn(); // Call Gemini's turn immediately (API call will handle delay)
        }
    }

    function geminiTurn(retryCount = 0) { // Added retryCount parameter with default 0
        if (!gameActive || currentPlayer !== 'gemini') return;

        displayMessage("Gemini is thinking...", 'gemini');

        const boardString = gameBoard.map(row => row.map(cell => cell || '.').join('')).join('\n');

        const geminiPrompt = `
You are playing 4-in-a-row on a 10x10 board as 'X'. The game board is a 10 row by 10 column grid. Rows are numbered 0 to 9 from top to bottom, and columns are numbered 0 to 9 from left to right.

The current game board state is represented below:

\`\`\`
${boardString}
\`\`\`

In this representation:
- '.' indicates an empty cell.
- 'O' represents the opponent's pieces (User).
- 'X' represents your pieces (Gemini).

**Your Task:**
1.  **Analyze the current board state.**
2.  **Choose ONE valid move for 'X'.** A valid move is placing 'X' in an **empty cell** (represented by '.') on the 10x10 board. You can choose any empty cell. There is no gravity.
3.  **Provide your move and reasoning in JSON format ONLY.**

**Response Format (JSON):**
\`\`\`json
{
  "move": "row,column",  // e.g., "3,5" for row 3, column 5
  "explanation": "Your concise reasoning for this move."
}
\`\`\`

**Constraints and Instructions:**
- **Board Size:** Remember you are playing on a **10x10 board**. Rows and columns are numbered 0 to 9.
- **Valid Move:** Choose an **empty cell** ('.') to place your 'X'. Do not choose a cell already occupied by 'O' or 'X'.
- **Strategic Play:** Aim to win by getting 4 'X's in a row (horizontally, vertically, or diagonally) or block the opponent ('O') from winning.
- **JSON ONLY:**  **Respond ONLY with valid JSON in the specified format.** Do not include any extra text, comments, or explanations outside the JSON block.

Example Response (Valid):
\`\`\`json
{
  "move": "7,2",
  "explanation": "This move creates a potential diagonal line of three 'X's and blocks a possible horizontal win for 'O'."
}
\`\`\`

Provide your JSON response now for the best move for 'X'.
`;

        const requestData = {
            contents: [{
                parts: [{"text": geminiPrompt}]
            }]
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        }) // ** fetch() promise starts here **
        .then(response => { // ** .then() for successful response **
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => { // ** .then() for processing JSON data **
            console.log("Gemini API Response (Move - Full Data):", data);
            let geminiResponseText;
            if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text) {
                geminiResponseText = data.candidates[0].content.parts[0].text;
                console.log("Gemini API Response (Move - Text):", geminiResponseText);

                // ** START - JSON Cleaning Code ADDED HERE **
                if (geminiResponseText.startsWith('```json') && geminiResponseText.endsWith('```')) {
                    geminiResponseText = geminiResponseText.substring(7, geminiResponseText.length - 3).trim(); // Remove ```json and ``` and trim whitespace
                    console.log("Gemini Response Text - Cleaned:", geminiResponseText); // Log cleaned text
                }
                // ** END - JSON Cleaning Code ADDED HERE **


                try { // ** Innermost try...catch for JSON.parse() **
                    const geminiMoveResponse = JSON.parse(geminiResponseText);
                    if (geminiMoveResponse && geminiMoveResponse.move) {
                        const [row, col] = geminiMoveResponse.move.split(',').map(Number);
                        const explanation = geminiMoveResponse.explanation || "Gemini move.";

                        console.log("Gemini Move Response - Parsed:", geminiMoveResponse); // Log parsed response object
                        console.log("Gemini Move - Row:", row, ", Col:", col); // Log extracted row and col

                        if (row >= 0 && row < boardSize && col >= 0 && col < boardSize && gameBoard[row][col] === null) {
                            gameBoard[row][col] = 'X';
                            renderGameBoard();
                            displayMessage(`Gemini played at row ${row}, column ${col}.`, 'gemini');
                            displayMessage(`Reasoning: ${explanation}`, 'gemini');

                            if (checkWinCondition('X')) {
                                endGame('gemini');
                                return;
                            }

                            if (isBoardFull()) {
                                endGame('draw');
                                return;
                            }

                            currentPlayer = 'user';
                            enableGameInteraction();
                        } else {
                            console.error("Gemini returned an invalid move:", geminiMoveResponse);
                            console.log("Invalid Move Details - Row:", row, ", Col:", col); // Log row and col when invalid
                            console.log("Board State at Invalid Move:", gameBoard); // Log the game board state
                            displayMessage("Gemini returned an invalid move. Gemini forfeits turn.", 'gemini');
                            currentPlayer = 'user';
                            enableGameInteraction();
                        }

                    } else {
                        console.error("Gemini response missing 'move' or invalid format:", geminiMoveResponse);
                        displayMessage("Gemini's response was not understood. Gemini forfeits turn.", 'gemini');
                        currentPlayer = 'user';
                        enableGameInteraction();
                    }

                } catch (e) { // JSON Parsing Error - Retry Logic Added
                    console.error("Error parsing Gemini JSON response:", e);
                    console.error("Gemini Response Text causing error:", geminiResponseText);
                    displayMessage("Gemini returned an invalid response format (JSON parsing error).", 'gemini');
                    displayMessage("Raw Gemini Response (for debugging - check console): " + geminiResponseText, 'gemini');

                    if (retryCount < 2) { // Limit retries to 2 (adjust as needed)
                        console.log(`Retrying Gemini API request (retry count: ${retryCount + 1})...`);
                        displayMessage(`Retrying Gemini request... (${retryCount + 1}/2)`, 'gemini'); // Inform user of retry
                        setTimeout(() => geminiTurn(retryCount + 1), 1000); // Retry after 1 second
                        return; // Important: Exit current function to prevent further execution
                    } else {
                        console.error("Max retries reached. Ending game due to Gemini error.");
                        displayMessage("Max retries reached. Gemini is having trouble. Game Over.", 'gemini');
                        endGame('gemini_error'); // End game after retries fail
                        return;
                    }
                }
            } else {
                displayMessage("Error getting move from Gemini API - No response text.", 'gemini');
                endGame('gemini_error');
            }
        })
        .catch(error => {
            console.error("Fetch error (Gemini Move):", error);
            displayMessage("Error communicating with Gemini API to get move (Fetch Error).", 'gemini');
            endGame('gemini_error');
        })
        .finally(() => {
            if (gameActive && currentPlayer === 'gemini') {
                currentPlayer = 'user';
                enableGameInteraction();
            }
        });
    }


    function checkWinCondition(player) {
        const directions = [
            { dx: 1, dy: 0 },    // Horizontal
            { dx: 0, dy: 1 },    // Vertical
            { dx: 1, dy: 1 },    // Diagonal (top-left to bottom-right)
            { dx: 1, dy: -1 }   // Diagonal (top-right to bottom-left)
        ];

        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (gameBoard[row][col] === player) {
                    for (const dir of directions) {
                        let count = 1;
                        for (let i = 1; i < 4; i++) {
                            const checkRow = row + i * dir.dy;
                            const checkCol = col + i * dir.dx;

                            if (checkRow >= 0 && checkRow < boardSize && checkCol >= 0 && checkCol < boardSize && gameBoard[checkRow][checkCol] === player) {
                                count++;
                            } else {
                                break;
                            }
                        }
                        if (count >= 4) {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }


    function isBoardFull() {
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (gameBoard[row][col] === null) {
                    return false;
                }
            }
        }
        return true;
    }


    function endGame(winner) {
        gameActive = false;
        // enableChatInput();  **REMOVED: Do not re-enable chat input specifically at game end. It's always enabled now.**
        disableGameInteraction();

        let message = '';
        if (winner === 'user') {
            message = "Congratulations! You won!";
        } else if (winner === 'gemini') {
            message = "Gemini wins! Better luck next time.";
        } else if (winner === 'draw') {
            message = "It's a draw! The board is full.";
        } else if (winner === 'gemini_error') {
            message = "Game ended due to an error from Gemini."; // Specific message for Gemini errors
        }
        displayMessage(message, 'gemini');
    }


    function displayMessage(message, sender) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message');
        messageElement.classList.add(`${sender}-message`);
        messageElement.textContent = message;
        chatDisplay.appendChild(messageElement);
        chatDisplay.scrollTop = chatDisplay.scrollHeight;
    }

    function enableGameInteraction() {
        gameBoardElement.classList.remove('disabled');
    }

    function disableGameInteraction() {
        gameBoardElement.classList.add('disabled');
    }

    function disableChatInput() {
        // messageInput.disabled = true;  **REMOVED: Do not disable chat input anymore **
        // sendButton.disabled = true;    **REMOVED: Do not disable chat input anymore **
    }

    function enableChatInput() {
        // messageInput.disabled = false; **REMOVED:  No need to explicitly enable, it's always enabled now.**
        // sendButton.disabled = false;   **REMOVED: No need to explicitly enable, it's always enabled now.**
    }


    // Event listeners
    newGameButton.addEventListener('click', initializeGameBoard);

    sendButton.addEventListener('click', function() {
        const messageText = messageInput.value;
        sendMessageToGemini(messageText);
        messageInput.value = '';
    });

    messageInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            const messageText = messageInput.value;
            sendMessageToGemini(messageText);
            messageInput.value = '';
        }
    });

    function sendMessageToGemini(messageText) { // For regular chat messages
        if (!messageText.trim()) return;
        displayMessage(messageText, 'user');

        const requestData = {
            contents: [{
                parts: [{"text": messageText}]
            }]
        };

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Gemini API Response (Chat):", data);
            let geminiResponseText = "Error getting response.";
            if (data && data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
                geminiResponseText = data.candidates[0].content.parts[0].text;
            }
            displayMessage(geminiResponseText, 'gemini');
        })
        .catch(error => {
            console.error("Fetch error (Chat):", error);
            displayMessage("Error communicating with Gemini API.", 'gemini');
        });
    }


    // Initial setup (you can choose to start a game immediately on page load if you want)
    // initializeGameBoard();

});
