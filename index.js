const TelegramApi = require('node-telegram-bot-api')

const token = '6362367021:AAEVwbVsChw5IwF7EFGeGDwfNcL-dlz-TPo'

const bot = new TelegramApi(token, {polling: true})

  const board = [
    [' ', ' ', ' '],
    [' ', ' ', ' '],
    [' ', ' ', ' '],
  ];
  
  // Текущего состояния игрового поля
  function displayBoard() {
    let boardString = '';
    for (let row of board) {
      boardString += row.join(' | ') + '\n';
      boardString += '---------\n';
    }
    return boardString;
  }
  
  // Ход бота (минимакс - алгоритм с нулевой суммой)
  function botMove() {
    let bestMove = minimax(board, 'O'); // Тута 'O' - символ бота
    board[bestMove.row][bestMove.col] = 'O';
  }
  
  // Рекурсивного поиска лучшего хода - тот самый минимакс
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
  
          board[i][j] = ' '; // Отмена хода
  
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
  
  // Проверки есть ли победитель
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
  
  // есть ли ничья
  function isGameDraw() {
    for (let row of board) {
      if (row.includes(' ')) {
        return false;
      }
    }
    return true;
  }
  function resetGame() {
    board = [
      [' ', ' ', ' '],
      [' ', ' ', ' '],
      [' ', ' ', ' '],
    ];
  }


  function sendInlineKeyboard(chatId) {
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '0 0', callback_data: '0 0' },
          { text: '0 1', callback_data: '0 1' },
          { text: '0 2', callback_data: '0 2' },
        ],
        [
          { text: '1 0', callback_data: '1 0' },
          { text: '1 1', callback_data: '1 1' },
          { text: '1 2', callback_data: '1 2' },
        ],
        [
          { text: '2 0', callback_data: '2 0' },
          { text: '2 1', callback_data: '2 1' },
          { text: '2 2', callback_data: '2 2' },
        ],
      ],
    };
  
    bot.sendMessage(chatId, 'Выберите ячейку для вашего хода:', {
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
        const text = 'Игра началась! Вот игровое поле:';
        bot.sendMessage(chatId, text + '\n' + displayBoard());
        sendInlineKeyboard(chatId);
      });
      
      bot.on('callback_query', (callbackQuery) => {
        const chatId = callbackQuery.message.chat.id;
        const data = callbackQuery.data;
        const playerSymbol = 'X';
      
        const coordinates = data.split(' ');
        if (coordinates.length === 2) {
          const row = parseInt(coordinates[0]);
          const col = parseInt(coordinates[1]);
      
          if (row >= 0 && row < 3 && col >= 0 && col < 3 && board[row][col] === ' ') {
            board[row][col] = playerSymbol;
            bot.sendMessage(chatId, 'Ход принят. Вот текущее состояние игры:\n' + displayBoard());
      
            if (checkForWin(playerSymbol)) {
              bot.sendMessage(chatId, `Поздравляем! Игрок ${playerSymbol} победил! Начнем новую игру.`);
              resetGame(); 
            } else if (isGameDraw()) {
              bot.sendMessage(chatId, 'Игра завершилась вничью. Начнем новую игру.');
              resetGame(); 
            } else {
              botMove();
              if (checkForWin('O')) {
                bot.sendMessage(chatId, 'Бот победил! Начнем новую игру.');
                resetGame(); 
              } else if (isGameDraw()) {
                bot.sendMessage(chatId, 'Игра завершилась вничью. Начнем новую игру.');
                resetGame(); 
              } else {
                sendInlineKeyboard(chatId);
              }
            }
          } else {
            bot.sendMessage(chatId, 'Некорректный ход. Попробуйте снова.');
            sendInlineKeyboard(chatId);
          }
        }
      });
      
      function resetGame() {
        board = [
          [' ', ' ', ' '],
          [' ', ' ', ' '],
          [' ', ' ', ' '],
        ];
      }
      bot.onText(/\/reset/, (msg) => {
        const chatId = msg.chat.id;
        resetGame()
        bot.sendMessage(chatId, 'Игра обнулена. Вот новое игровое поле:\n' + displayBoard());
        sendInlineKeyboard(chatId);
      });
 
      bot.on('polling_error', (error) => {
        console.log(error);
      });
      
      console.log('Бот запущен');