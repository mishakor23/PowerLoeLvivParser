const axios = require('axios');
const cheerio = require('cheerio');

// URL страницы
const url = 'https://poweron.loe.lviv.ua/';

async function checkUpdates() {
    const response = await axios.get(url);
    console.log(response);
    const html = response.data;
    const $ = cheerio.load(html);
    console.log($);
}