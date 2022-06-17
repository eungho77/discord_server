const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");

const parsing = {
    getHtml: async (url) => {
        try {
            return await axios.get(encodeURI(url));
        } catch (e) {
            console.error(e);
        }
    },

    getData: async (url) => {
        try {
            return await axios.get(encodeURI(url));
        } catch (e) {
            console.error(e);
        }
    },

    profile_ability_basic: function($) {
        const basic = $("div.profile-ability-basic:nth-child(1) > ul > li");
        const basic_array = {}; // 기본 특성

        basic.each(function (i, v) {
            basic_array[i] = $(v).find("span:nth-child(2)").text();
        })

        return basic_array;
    },

    profile_ability_battle: function($) {
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
    },

    profile_ability_engrave: function($) {
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
    },

    expand_character_list: async ($) => {
        const list_nickname = $("div.myinfo__character--wrapper2 > ul > li");
        var character_list = [];

        const promises = list_nickname.map(async (i, v) => {
            const html = await parsing.getHtml("https://m-lostark.game.onstove.com/Profile/Character/"  + $(v).text().split(" ")[1]);
            const param = parsing.character_list_search(html, $(v).text().split(" ")[1]);

            character_list.push(param)
        });
        await Promise.all(promises)
        character_list.sort(arrOrder("level"))
        return character_list
    },

    character_list_search: function(html, nickname) {
        let param = {};

        const $1 = cheerio.load(html.data);
        param.nickname = nickname;
        param.server = $1("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(1) > dd").text().split("@")[1]; // 서버
        param.job = $1("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(2) > dd").text() // 직업
        param.level = $1("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[0]; // 로스트아크 레벨
        param.itemLevel = $1("div.myinfo__contents-level > div.wrapper-define:nth-child(2) > dl.item > dd.level").text(); // 장착 아이템

        return param;
    },

    card_tab: function($) {
        const card = $("div#card-tab > ul > li");
        const card_list = [];

        card.each(function (i, v) {
            param = {
                card_name: $(v).find("div.card-slot > strong > font").text(),
                card_stone_count: $(v).find("div.card-slot").attr("data-awake")
            }
            card_list.push(param);
        })

        return card_list
    },

    profile_skill_life: function($) {
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
    },

    profile_collection: async(nickname) => {
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
    },

    profile_jewel: async($) => {
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
}

function arrOrder(key) {
    return function (a, b) {
        if (a[key] > b[key]) {
            return -1;
        }
        if (a[key] < b[key]) {
            return 1;
        }
    }
}

module.exports = {
    parsing
}