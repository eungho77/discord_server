var express = require('express');

const cheerio = require('cheerio');
const axios = require('axios');
const puppeteer = require('puppeteer');
const server_info = require('./server_info/server')

const url = "https://m-lostark.game.onstove.com/Profile/Character";

const app = express();

const getHtml = async (nickname) => {
    try {
        return await axios.get(encodeURI(url + "/" + nickname));
    } catch (e) {
        console.error(e);
    }
};

const profile_ability_basic = function($) {
    const basic = $("div.profile-ability-basic:nth-child(1) > ul > li");
    const basic_array = {}; // 기본 특성

    basic.each(function(i, v){
        basic_array[i] = $(v).find("span:nth-child(2)").text();
    })

    return basic_array;
}

const profile_ability_battle = function($) {
    const battle = $("div.profile-ability-basic:nth-child(2) > ul > li");
    const battle_list = []; // 기본 특성

    battle.each(function(i, v){
        param = {
            name: $(v).find("span:nth-child(1)").text(),
            number: $(v).find("span:nth-child(2)").text()
        }
        battle_list.push(param);
    })

    return battle_list;
}

const profile_ability_engrave = function($) {
    // 특정 캐릭터마다 33333일 수도 있고 333321일 수도 있고 3333일 수도 있기 때문에 리스트로 설정
    const engrave = $("div.profile-ability-engrave > ul > li");
    const engrave_list = []; // 각인 리스트

    engrave.each(function(i, v){
        param = {
            name: $(v).find("span").text().replace(/\s/gi, "").split("Lv.")[0],
            level: "Lv." + $(v).find("span").text().replace(/\s/gi, "").split("Lv.")[1],
            text: $(v).find("div.profile-ability-tooltip > p").text()
        }
        engrave_list.push(param)
    })

    return engrave_list;
}

const expand_character_list = async ($) => {
    const list_nickname = $("div.myinfo__character--wrapper2 > ul > li");
    var character_list = [];

    const promises = list_nickname.map(async (i, v) => {
        const html = await getHtml($(v).text().split(" ")[1]);
        const param = character_list_search(html, $(v).text().split(" ")[1]);

        character_list.push(param)
    });
    await Promise.all(promises)
    return character_list
}

const character_list_search = function(html, nickname) {
    let param = {};

    const $1 = cheerio.load(html.data);
    param.nickname = nickname;
    param.server = $1("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(1) > dd").text().split("@")[1]; // 서버
    param.job = $1("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(2) > dd").text() // 직업
    param.level = $1("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[0]; // 로스트아크 레벨
    param.itemLevel = $1("div.myinfo__contents-level > div.wrapper-define:nth-child(2) > dl.item > dd.level").text(); // 장착 아이템

    return param;
}

const card_tab = function($) {
    const card = $("div#card-tab > ul > li");
    const card_list = [];

    card.each(function(i, v){
        param = {
            card_name: $(v).find("div.card-slot > strong > font").text(),
            card_stone_count: $(v).find("div.card-slot").attr("data-awake")
        }
        card_list.push(param);
    })

    return card_list
}

const profile_skill_life = function($) {
    const life = $("div.profile-skill-life > ul.profile-skill-life__list > li");
    const life_list = [];

    life.each(function(i, v){
        param = {
            life_name: $(v).find("strong").text(),
            life_level: $(v).find("span").text()
        }
        life_list.push(param);
    })

    return life_list
}

const profile_collection = async(nickname) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', function(req) {
        switch (req.resourceType()) {
            case 'stylesheet':
            case 'font':
            case 'image':
                req.abort();
                break;
            default:
                req.continue();
                break;
        }
    });

    await page.goto('https://lostark.game.onstove.com/Profile/Character/'+ nickname);

    const content = await page.content();
    const $ = cheerio.load(content)

    const collection = $("#tab1 > div.lui-tab__menu > a");
    const collection_list = [];

    collection.each(function(a,b){
        param = {
            collection_name: $(b).text().replace(/[0-9]/g, "").replace(/\s$/gi, ""),
            collection_count: $(b).find("span").text()
        }

        collection_list.push(param)
    })

    return collection_list
}

const profile_jewel = async($) => {
    const jewel = $("div#profile-jewel > ul > li");
    // const jewel2 = $("div#profile-jewel > div.jewel-effect__wrap > div.jewel__wrap > span");
    const jewel_list = [];

    jewel.each(function(i, v) {
        param1 = {
            jewel_name: $(v).find("div.jewel_effect > strong.skill_tit").text(),
            jewel_effect: $(v).find("div.jewel_effect > p.skill_detail").text(),
            jewel_level: $(v).find("div.jewel > span.jewel_level").text()
        };

        jewel_list.push(param1)
    })

    return jewel_list
}

const loawa_store_page = async(url, num) => {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.goto(url);
    await page.waitFor(5000)
    await page.click("div.box-category-list > ul.category-list > li:nth-child(" + num + ")");
    await page.waitFor(5000)

    // console.log(await page)
    const content = await page.content();
    return content;
}

const loa_inven = async(url) => {
    const html = await axios.get(encodeURI(url));

    return html
}

/* GET home page. */
app.get('/api/info', async (req, res) => {
    const param = {};
    const html = await getHtml(req.query.nickname);
    const $ = cheerio.load(html.data);

    param.nickname = $("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[1]; // 로스트아크 닉네임
    param.server = $("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(1) > dd").text().split("@")[1]; // 서버
    param.job = $("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(2) > dd").text() // 직업
    param.expedition = $("div.myinfo__contents-level > div.wrapper-define:nth-child(1) > dl.define > dd.level").text(); // 원정대
    param.level = $("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[0]; // 로스트아크 레벨
    param.itemLevel = $("div.myinfo__contents-level > div.wrapper-define:nth-child(2) > dl.item > dd.level").text(); // 장착 아이템

    let basic_array = profile_ability_basic($); // 최대 생명력, 전투 공격력
    let battle_array = profile_ability_battle($); // 치명, 특화, 제압, 신속, 인내, 숙련
    let engrave_array = profile_ability_engrave($); // 각인
    let jewel_array = await profile_jewel($); // 카드
    let card_array = card_tab($); // 카드
    let expand_array = await expand_character_list($); // 보유 캐릭터


    // 기본 특성
    param.basic = {
        attack: basic_array[0], // 전투 공격력
        hp: basic_array[1] // 최대 생명력
    };

    param.battle = battle_array;
    param.engrave = engrave_array; // 각인 효과
    param.card = card_array; // 카드
    param.expand = expand_array // 보유 캐릭터
    param.jewel = jewel_array; // 보석

    console.log(param.nickname + "님이 조회하셨습니다.");
    console.log(param)

    res.send(param)
});

app.get('/api/internal_stability', async (req, res) => {
    const param = {};
    const html = await getHtml(req.query.nickname);
    const $ = cheerio.load(html.data);

    let life_arryy = profile_skill_life($); // 생활스킬
    let collection_arary = await profile_collection(req.query.nickname)

    param.life = life_arryy; // 생활스킬
    param.collection = collection_arary;

    console.log(req.query.nickname + "님이 조회하셨습니다.");
    console.log(param)

    res.send(param)
});

// app.get('/api/store/imprint', async (req, res) => {
//     let store_page = await loawa_store_page("https://loawa.com/shop/trade-shop", 2);
//     const $ = cheerio.load(store_page)
//     let store_list = [];
//
//     const table_tr = $('div.shop-list-detail > table.table > tbody > tr');
//
//     table_tr.each(function(i, v) {
//         param = {
//             store_name: $(v).find("td:nth-child(4)").text().replace(/\s$/gi, ""),
//             store_price: $(v).find("td:nth-child(5)").text().replace(/\s$/gi, "").substring(1)
//         }
//         store_list.push(param)
//     })
//
//     console.log(store_list)
//
//     res.send(store_list)
// });

app.get('/api/inven/timer', async (req, res) => {
    let html = await loa_inven("https://m.inven.co.kr/lostark/timer/");
    const $ = cheerio.load(html.data)
    let lostarkTimer_list = [];

    const lostarkTimer = $('#lostarkTimer > div > div.bosslist > div > ul > li');

    lostarkTimer.each(function(i, v) {
        param = {
            name: $(v).find("a.info > span.npcname").text().replace(/\s$/gi, ""),
            time: $(v).find("a.info > span.gentime").text().replace(/\s$/gi, "")
        }
        lostarkTimer_list.push(param)
    })

    console.log(lostarkTimer_list)

    res.send(lostarkTimer_list)
});

app.get('/api/inven/challenge', async (req, res) => {
    let html = await loa_inven("https://lostark.inven.co.kr/")
    const $ = cheerio.load(html.data)
    let Challenge_raid_list = []
    let Challenge_raid_abyss = []
    let Challenge = {}

    const Challenge_date = $('div.challengeRaidAbyssWrap > div.head > h2.title').text()
    const Challenge_raid = $('div.challengeRaidAbyssWrap > div.content > ul.list > li.raid')
    const Challenge_abyss = $('div.challengeRaidAbyssWrap > div.content > ul.list > li.abyss')

    Challenge_raid.each(function(i, v) {
        param = {
            name: $(v).find("a > p.txt").text()
        }
        Challenge_raid_list.push(param)
    })

    Challenge_abyss.each(function(i, v) {
        param = {
            name: $(v).find("a > p.txt").text()
        }
        Challenge_raid_abyss.push(param)
    })

    Challenge.date = Challenge_date
    Challenge.raid = Challenge_raid_list
    Challenge.abyss = Challenge_raid_abyss


    res.send(Challenge)
});

var server = app.listen(server_info.port, function()  {
    var host = server.address().address;
    var port  = server.address().port;

    console.log('Server is working : PORT - ', port);
})
