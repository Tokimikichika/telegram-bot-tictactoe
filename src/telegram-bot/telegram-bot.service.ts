import { Injectable, OnModuleInit } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import * as http from 'http';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: TelegramBot;
  private activeGames: Record<number, any> = {};

  constructor() {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not provided!');
    }
    this.bot = new TelegramBot(token, { polling: true }) as TelegramBot;
  }

  onModuleInit() {
    this.startBot();
  }

  private startBot() {
    const PORT = process.env.PORT || 3000;
    const server = http.createServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('The Telegram bot is running.');
    });

    server.listen(PORT, () => {
      console.log(`HTTP server is running on port ${PORT}`);
    });

    this.bot.onText(/\/start/, (msg) => {
      const chatId = msg.chat.id;
      this.bot.sendMessage(chatId, 'Привет! Для начала игры введите /play.');
    });

    this.bot.onText(/\/play/, (msg) => {
      const chatId = msg.chat.id;
      if (this.activeGames[chatId]) {
        this.bot.sendMessage(chatId, 'Игра уже запущена. Завершите текущую игру, чтобы начать новую.');
        return;
      }
      this.resetGame(chatId);
      this.sendInlineKeyboard(chatId, this.activeGames[chatId].board);
    });

    this.bot.on('callback_query', (callbackQuery) => {
      const chatId = callbackQuery.message.chat.id;
      if (!this.activeGames[chatId]) {
        this.bot.sendMessage(chatId, 'Нет активной игры. Начните новую игру с помощью /play.');
        return;
      }

      const coordinates = callbackQuery.data.split(' ');
      const row = parseInt(coordinates[0]);
      const col = parseInt(coordinates[1]);

      const currentGame = this.activeGames[chatId];

      if (currentGame.board[row][col] !== ' ') {
        this.bot.sendMessage(chatId, 'Эта ячейка уже занята. Выберите другую.');
        return;
      }

      currentGame.board[row][col] = 'X';

      if (this.checkForWin(currentGame.board, 'X')) {
        this.bot.sendMessage(chatId, 'Поздравляем! Вы выиграли! Начнем новую игру.');
        this.resetGame(chatId);
        this.sendInlineKeyboard(chatId, this.activeGames[chatId].board);
        return;
      }

      if (this.isGameDraw(currentGame.board)) {
        this.bot.sendMessage(chatId, 'Игра закончилась ничьей. Начнем новую игру.');
        this.resetGame(chatId);
        this.sendInlineKeyboard(chatId, this.activeGames[chatId].board);
        return;
      }

      this.botMove(chatId);

      if (this.checkForWin(currentGame.board, 'O')) {
        this.bot.sendMessage(chatId, 'Бот победил! Начнем новую игру.');
        this.resetGame(chatId);
        this.sendInlineKeyboard(chatId, this.activeGames[chatId].board);
        return;
      }

      if (this.isGameDraw(currentGame.board)) {
        this.bot.sendMessage(chatId, 'Игра закончилась ничьей. Начнем новую игру.');
        this.resetGame(chatId);
        this.sendInlineKeyboard(chatId, this.activeGames[chatId].board);
        return;
      }

      this.sendInlineKeyboard(chatId, currentGame.board);
    });

    this.bot.on('polling_error', (error) => {
      console.error('Ошибка опроса:', error);
    });

    console.log('Бот запущен');
  }

  private resetGame(chatId: number) {
    this.activeGames[chatId] = {
      board: [
        [' ', ' ', ' '],
        [' ', ' ', ' '],
        [' ', ' ', ' '],
      ],
      currentPlayer: 'X',
    };
  }

  private sendInlineKeyboard(chatId: number, board: string[][]) {
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

    this.bot.sendMessage(chatId, 'Сделайте ваш ход:', {
      reply_markup: inlineKeyboard,
    });
  }

  private checkForWin(board: string[][], symbol: string): boolean {
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

  private isGameDraw(board: string[][]): boolean {
    for (const row of board) {
      if (row.includes(' ')) {
        return false;
      }
    }
    return true;
  }

  private botMove(chatId: number) {
    const board = this.activeGames[chatId].board;
    const bestMove = this.minimax(board, 'O');
    board[bestMove.row][bestMove.col] = 'O';
  }

  private minimax(board: string[][], playerSymbol: string): { row: number; col: number; score: number } {
    if (this.checkForWin(board, 'X')) {
        return { row: -1, col: -1, score: -10 };
    } else if (this.checkForWin(board, 'O')) {
        return { row: -1, col: -1, score: 10 };
    } else if (this.isGameDraw(board)) {
        return { row: -1, col: -1, score: 0 };
    }

    const availableMoves = [];
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (board[i][j] === ' ') {
                const move = { row: i, col: j, score: 0 }; // добавили начальное значение для score
                board[i][j] = playerSymbol;

                const result = this.minimax(board, playerSymbol === 'O' ? 'X' : 'O');
                move.score = result.score; // теперь TypeScript знает, что score существует

                board[i][j] = ' ';
                availableMoves.push(move);
            }
        }
    }

    let bestMove: { row: number; col: number; score: number } | undefined;
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

    return bestMove!;
}

}
