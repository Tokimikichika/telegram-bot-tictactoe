const TelegramApi = require('node-telegram-bot-api')

const token = '6948898827:AAHYfzsWy1RvNrT-jrV9Mc0ytQylYkK7Q_U'

const bot = new TelegramApi(token, { polling: true });

const board = [
  [' ', ' ', ' '],
  [' ', ' ', ' '],
  [' ', ' ', ' '],
];

const activeGames = {};

let gameBoardString = '';

function displayBoard() {
  gameBoardString = '';
  for (let row of board) {
    gameBoardString += row.join(' | ') + '\n';
    gameBoardString += '---------\n';
  }
  return gameBoardString;
}

function checkForWin(symbol) {
  for (let i = 0; i < 3; i++) {
    if (
      (board[i][0] === symbol && board[i][1] === symbol && board[i][2] === symbol) ||
      (board[0][i] === symbol && board[1][i] === symbol && board[2][i] === symbol)
    ) {
      return true;
    }
  }

  if (
    (board[0][0] === symbol && board[1][1] === symbol && board[2][2] === symbol) ||
    (board[0][2] === symbol && board[1][1] === symbol && board[2][0] === symbol)
  ) {
    return true;
  }

  return false;
}

function isGameDraw() {
  for (let row of board) {
    if (row.includes(' ')) {
      return false;
    }
  }
  return true;
}

function botMove(chatId) {
  let bestMove = minimax(board, 'O');
  board[bestMove.row][bestMove.col] = 'O';
  // bot.sendMessage(chatId, 'Ход бота:\n' + gameBoardString);
}

function minimax(board, playerSymbol) {
  if (checkForWin('X')) {
    return { score: -10 };
  } else if (checkForWin('O')) {
    return { score: 10 };
  } else if (isGameDraw()) {
    return { score: 0 };
  }

  let availableMoves = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === ' ') {
        let move = {};
        move.row = i;
        move.col = j;
        board[i][j] = playerSymbol;

        if (playerSymbol === 'O') {
          let result = minimax(board, 'X');
          move.score = result.score;
        } else {
          let result = minimax(board, 'O');
          move.score = result.score;
        }

        board[i][j] = ' ';

        availableMoves.push(move);
      }
    }
  }

  let bestMove;
  if (playerSymbol === 'O') {
    let bestScore = -Infinity;
    for (let move of availableMoves) {
      if (move.score > bestScore) {
        bestScore = move.score;
        bestMove = move;
      }
    }
  } else {
    let bestScore = Infinity;
    for (let move of availableMoves) {
      if (move.score < bestScore) {
        bestScore = move.score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

function resetGame() {
  board[0] = [' ', ' ', ' '];
  board[1] = [' ', ' ', ' '];
  board[2] = [' ', ' ', ' '];
  gameBoardString = displayBoard();
}

function sendInlineKeyboard(chatId) {
  const inlineKeyboard = {
    inline_keyboard: [
      [
        { text: board[0][0], callback_data: '0 0' },
        { text: board[0][1], callback_data: '0 1' },
        { text: board[0][2], callback_data: '0 2' },
      ],
      [
        { text: board[1][0], callback_data: '1 0' },
        { text: board[1][1], callback_data: '1 1' },
        { text: board[1][2], callback_data: '1 2' },
      ],
      [
        { text: board[2][0], callback_data: '2 0' },
        { text: board[2][1], callback_data: '2 1' },
        { text: board[2][2], callback_data: '2 2' },
      ],
    ],
  };

  bot.sendMessage(chatId, 'Выберите ячейку для вашего хода:\n', {
    reply_markup: JSON.stringify(inlineKeyboard),
  });
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const text = 'Добро пожаловать в игру в крестики-нолики! Чтобы начать, введите /play';
  bot.sendMessage(chatId, text);
});

bot.onText(/\/play/, (msg) => {
  const chatId = msg.chat.id;
  if (activeGames[chatId]) {
    bot.sendMessage(chatId, 'У вас уже есть активная игра. Завершите ее, чтобы начать новую.');
    return;
  };
  const text = 'Игра началась! Вот игровое поле:';
  
  resetGame();
  bot.sendMessage(chatId, text + '\n' + gameBoardString, {
    reply_markup: JSON.stringify({ remove_keyboard: true }),
  });
  sendInlineKeyboard(chatId);
  activeGames[chatId] = {
    board: JSON.parse(JSON.stringify(board)), // Создаем копию игрового поля
  };
});

bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  const playerSymbol = 'X';

  if (!activeGames[chatId]) {
    bot.sendMessage(chatId, 'У вас нет активной игры. Начните новую игру с помощью команды /play.');
    return;
  }

  const coordinates = data.split(' ');
  if (coordinates.length === 2) {
    const row = parseInt(coordinates[0]);
    const col = parseInt(coordinates[1]);

    if (row >= 0 && row < 3 && col >= 0 && col < 3 && board[row][col] === ' ') {
      board[row][col] = playerSymbol;

      if (checkForWin(playerSymbol)) {
        bot.sendMessage(chatId, `Поздравляем! Игрок ${playerSymbol} победил! Начнем новую игру.`);
        resetGame();
      } else if (isGameDraw()) {
        bot.sendMessage(chatId, 'Игра завершилась вничью. Начнем новую игру.');
        resetGame();
      } else {
        botMove(chatId);
        if (checkForWin('O')) {
          bot.sendMessage(chatId, 'Бот победил! Начнем новую игру.');
          resetGame();
        } else if (isGameDraw()) {
          bot.sendMessage(chatId, 'Игра завершилась вничью. Начнем новую игру.');
          resetGame();
        }
      }
      sendInlineKeyboard(chatId);
    } else {
      bot.sendMessage(chatId, 'Некорректный ход. Попробуйте снова.');
    }
  }
});

bot.on('polling_error', (error) => {
  console.log(error);
});

console.log('Бот запущен');
