const puppeteer = require('puppeteer');
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Замените на токен вашего бота и ID чата
const token = '7081841214:AAFLGOW8MIftgHXpo1PmuXcuXF49FYGI7CQ';
const chatId = '218563302';

const bot = new TelegramBot(token, { polling: true });

const url = 'https://poweron.loe.lviv.ua/';
const className = 'power-off__top';

let previousText = '';
let previousImageSrc = '';

// Функция для получения текста и первой картинки с сайта
async function getTextAndImageFromSite() {
  const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  try {
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForSelector(`.${className}`, { timeout: 60000 });

      const { text, imageSrc } = await page.evaluate(className => {
          const element = document.querySelector(`.${className}`);
          if (!element) {
              console.error(`Элемент с классом ${className} не найден`);
              return { text: '', imageSrc: '' };
          }

          let text = '';
          let imageSrc = '';
          let stop = false;

          const imgElements = element.getElementsByTagName('img');
          if (imgElements.length > 0) {
              imageSrc = imgElements[0].src; // Получаем src первого изображения
              console.log(`Найденное изображение: ${imageSrc}`);
          }
          
          element.childNodes.forEach((node, index) => {
            console.log(`Узел ${index}:`, node);
              if (stop) return;

              if (node.nodeType === Node.ELEMENT_NODE) {
                console.log(`Тип узла: ${node.tagName}`);
                  if (node.tagName === 'IMG') {
                      const src = node.src;
                      if (src) {
                          imageSrc = src;
                          console.log(`Найденное изображение: ${src}`);
                      }
                      stop = true; // Останавливаем поиск после первого изображения
                  } else {
                      text += node.innerText.trim() + ' ';
                  }
              } else if (node.nodeType === Node.TEXT_NODE) {
                  text += node.textContent.trim() + ' ';
              }
          });

          console.log('Текст:', text);
          console.log('Изображение:', imageSrc);
          
          return { text: text.trim(), imageSrc };
      }, className);

      return { text, imageSrc };
  } catch (error) {
      console.error('Ошибка при получении текста и картинки:', error);
      return { text: '', imageSrc: '' };
  } finally {
      await browser.close();
  }
}

// Функция для проверки обновлений
async function checkForUpdates() {
    try {
        const { text: currentText, imageSrc: currentImageSrc } = await getTextAndImageFromSite();

        if (currentText !== previousText || currentImageSrc !== previousImageSrc) {
            if (currentText !== previousText) {
                previousText = currentText;
                await bot.sendMessage(chatId, `Обновленный текст:\n${currentText}`);
            }

            if (currentImageSrc !== previousImageSrc) {
                previousImageSrc = currentImageSrc;
                
                if (currentImageSrc) {
                    const response = await axios({ url: currentImageSrc, responseType: 'arraybuffer' });
                    const imagePath = path.join(__dirname, 'temp_image.jpg');
                    fs.writeFileSync(imagePath, response.data);

                    await bot.sendPhoto(chatId, imagePath);

                    fs.unlinkSync(imagePath);
                } else {
                    console.error('Изображение не найдено');
                }
            }
        } else {
          await bot.sendMessage(chatId, 'Графики без изменений');
        }
    } catch (error) {
        console.error('Ошибка при проверке обновлений:', error);
    }
}

function checkTheBotIsAlive() {
  bot.sendMessage(chatId, `I'm still alive`);
}

// Запуск проверки каждые 5 минут (300000 миллисекунд)
setInterval(checkForUpdates, 300000);
setInterval(checkTheBotIsAlive, 3600000);
// Первый запуск
checkForUpdates();