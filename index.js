const TelegramApi = require('node-telegram-bot-api');
const http = require('http');

const token = '6362367021:AAEVwbVsChw5IwF7EFGeGDwfNcL-dlz-TPo';
const bot = new TelegramApi(token, { polling: true });

const activeGames = {};

const PORT = process.env.PORT || 3000; 
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('The Telegram bot is running.'); 
});

server.listen(PORT, () => {
  console.log(`HTTP server is running on port ${PORT}`);
});
// function displayBoard(board) {
//   let gameBoardString = '';
//   for (let row of board) {
//     gameBoardString += row.join(' | ') + '\n';
//     gameBoardString += '---------\n';
//   }
//   return gameBoardString;
// }

function checkForWin(board, symbol) {
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
function isGameDraw(board) {
  for (const row of board) {
    if (row.includes(' ')) {
      return false;
    }
  }
  return true;
}

function resetGame(chatId) {
  activeGames[chatId] = {
    board: [
      [' ', ' ', ' '],
      [' ', ' ', ' '],
      [' ', ' ', ' '],
    ],
    currentPlayer: 'X', 
  };
}

function sendInlineKeyboard(chatId, board) {
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

  bot.sendMessage(chatId, 'Сделайте ваш ход:', {
    reply_markup: JSON.stringify(inlineKeyboard),
  });
}

function minimax(board, playerSymbol) {
  if (checkForWin(board, 'X')) {
    return { score: -10 };
  } else if (checkForWin(board, 'O')) {
    return { score: 10 };
  } else if (isGameDraw(board)) {
    return { score: 0 };
  }

  const availableMoves = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (board[i][j] === ' ') {
        const move = { row: i, col: j };
        board[i][j] = playerSymbol;

        const result = minimax(board, playerSymbol === 'O' ? 'X' : 'O');
        move.score = result.score;

        board[i][j] = ' '; 
        availableMoves.push(move); 
      }
    }
  }

  let bestMove;
  if (playerSymbol === 'O') {
    let bestScore = -Infinity;
    for (const move of availableMoves) {
      if (move.score > bestScore) {
        bestScore = move.score;
        bestMove = move;
      }
    }
  } else {
    let bestScore = Infinity;
    for (const move of availableMoves) {
      if (move.score < bestScore) {
        bestScore = move.score;
        bestMove = move;
      }
    }
  }

  return bestMove;
}

// Ход бота
function botMove(chatId) {
  const board = activeGames[chatId].board;
  const bestMove = minimax(board, 'O'); 
  board[bestMove.row][bestMove.col] = 'O'; 
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Привет! Для начала игры введите /play.');
});

bot.onText(/\/play/, (msg) => {
  const chatId = msg.chat.id;

  if (activeGames[chatId]) {
    bot.sendMessage(chatId, 'Игра уже запущена. Завершите текущую игру, чтобы начать новую.');
    return;
  }

  resetGame(chatId); // Сбрасываем игру для данного chatId
  sendInlineKeyboard(chatId, activeGames[chatId].board); 
});

// Обработка callback_query
bot.on('callback_query', (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;

  if (!activeGames[chatId]) {
    bot.sendMessage(chatId, 'Нет активной игры. Начните новую игру с помощью /play.');
    return;
  }

  const coordinates = callbackQuery.data.split(' ');
  const row = parseInt(coordinates[0]);
  const col = parseInt(coordinates[1]);

  const currentGame = activeGames[chatId];

  if (currentGame.board[row][col] !== ' ') {
    bot.sendMessage(chatId, 'Эта ячейка уже занята. Выберите другую.');
    return;
  }

  // Ход игрока
  currentGame.board[row][col] = 'X';

  if (checkForWin(currentGame.board, 'X')) {
    bot.sendMessage(chatId, 'Поздравляем! Вы выиграли! Начнем новую игру.');
    resetGame(chatId);
    sendInlineKeyboard(chatId, activeGames[chatId].board); 
    return;
  }

  if (isGameDraw(currentGame.board)) {
    bot.sendMessage(chatId, 'Игра закончилась ничьей. Начнем новую игру.');
    resetGame(chatId);
    sendInlineKeyboard(chatId, activeGames[chatId].board); 
    return;
  }

  // Ход бота
  botMove(chatId);

  if (checkForWin(currentGame.board, 'O')) {
    bot.sendMessage(chatId, 'Бот победил! Начнем новую игру.');
    resetGame(chatId);
    sendInlineKeyboard(chatId, activeGames[chatId].board); 
    return;
  }

  if (isGameDraw(currentGame.board)) {
    bot.sendMessage(chatId, 'Игра закончилась ничьей. Начнем новую игру.');
    resetGame(chatId);
    sendInlineKeyboard(chatId, activeGames[chatId].board); 
    return;
  }

  sendInlineKeyboard(chatId, currentGame.board);
});

bot.on('polling_error', (error) => {
  console.error('Ошибка опроса:', error);
});

console.log('Бот запущен');