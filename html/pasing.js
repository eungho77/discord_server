const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const {Interaction} = require("discord.js");

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
                level: $(v).find("span").text().replace(/\s/gi, "").split("Lv.")[1],
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
        character_list.sort(arrOrder("itemLevel"))
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
                name: $(v).find("div.card-slot > strong > font").text(),
                stone_count: $(v).find("div.card-slot").attr("data-awake")
            }
            card_list.push(param);
        })

        return card_list
    },
    profile_skill_life: function($) {
        let param = {}
        const life = $("div.profile-skill-life > ul.profile-skill-life__list > li")
        const life_list = []

        life.each(function(i, v){
            param = {
                name: $(v).find("strong").text(),
                level: $(v).find("span").text()
            }
            life_list.push(param)
        })

        return life_list
    },
    profile_collection: async(nickname) => {
        let param = {}
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage()
        await page.setRequestInterception(true)
        page.on('request', function(req) {
            switch (req.resourceType()) {
                case 'stylesheet':
                case 'font':
                case 'image':
                    req.abort()
                    break;
                default:
                    req.continue()
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
                name: $(b).text().replace(/[0-9]/g, "").replace(/\s$/gi, ""),
                count: $(b).find("span").text()
            }

            collection_list.push(param)
        })

        return collection_list
    },
    profile_jewel: async($) => {
        let param = {};
        const jewel = $("div#profile-jewel > ul > li");
        // const jewel2 = $("div#profile-jewel > div.jewel-effect__wrap > div.jewel__wrap > span");
        const jewel_list = [];

        jewel.each(function(i, v) {
            let jewel_name = $(v).find("div.jewel_effect > strong.skill_tit").text()
            let effect = $(v).find("div.jewel_effect > p.skill_detail").text().split(jewel_name)[1].trim()
            let type  = effect.split(" ")[0]
            param = {
                name: jewel_name,
                effect: effect,
                type: (type == "피해") ? "멸화" : "홍염",
                level: $(v).find("div.jewel > span.jewel_level").text()
            };

            jewel_list.push(param)
        })

        return jewel_list
    },
    shop_mari: async($) => {
        let result = [];
        const count = [1, 2]

        for(const a of count){
            let mari_list = [];
            $("div#lui-tab1-"+ a +" > ul > li").each((i, v) => {
                const param = {
                    popularity: ($(v).find('span.icon--shop-popular').text() === "인기") ? $(v).find('span.icon--shop-popular').text() : null,
                    item: $(v).find('div.wrapper > span.item-name').text(),
                    amount: $(v).find('div.wrapper > div.area-amount > span.amount').text()
                };
                mari_list.push(param)
            })
            result.push({
                "mode": true,
                "type": $("div.lui-tab__menu > a:nth-child("+ a +")").text(),
                mari_list: mari_list
            })
        }
        return result
    },
    adventureisland: async (link) => {
        let result = []
        let adventureisland_list = [];

        const browser = await puppeteer.launch({
            // headless: false 브라우저 띄움
            // headless: true 브라우저 띄우지 않음
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
        await page.goto(link)

        await page.waitForSelector('body > bynn-root > mat-sidenav-container > mat-sidenav-content > div > main > bynn-calendar-container > div > bynn-calendar-summary-view > bynn-calendar-compass > div:nth-child(2)')
        await page.waitForTimeout(200) // 0.2초동안 기다린다.

        const content = await page.content();
        const $ = cheerio.load(content)

        const inserted = $('body > bynn-root > mat-sidenav-container > mat-sidenav-content > div > main > bynn-calendar-container > div > bynn-calendar-summary-view > bynn-calendar-compass > div:nth-child(2) > div.ng-star-inserted')
        for(let data of inserted){
            for(let card of $(data).find("bynn-schedule-entry-card.ng-star-inserted")){
                let time_list = []
                for(let time of $(card).find("mat-card > div > div")){
                    if($(time).attr("fxlayout") == "column"){
                        time_list.push($(time).text().trim().split(" ")[0] + " " + $(time).text().trim().split(" ")[1])
                    }
                }
                result = {
                    name : $(card).find("mat-card > div > div:nth-child(1) > div").text().trim(),
                    time : time_list.join(",").trim(),
                    type : $(card).find("mat-card > div > div.ng-star-inserted > img").attr("src").split("/").reverse()[0].split(".")[0]
                }

                adventureisland_list.push(result)
            }
        }
        return adventureisland_list
    },
    dictionary: async(items) => {
        let param = {}
        const browser = await puppeteer.launch({
            // headless: false 브라우저 띄움
            // headless: true 브라우저 띄우지 않음
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        })

        const page = await browser.newPage()
        await page.goto('https://lostark.game.onstove.com/ItemDictionary')
        // const item_type = ["일반", "고급", "희귀", "영웅", "전설", "유물", "고대", "에스더"]

        await page.waitForSelector('input[name=itemdic-name]')
        await page.evaluate((item) => {
            document.querySelector('input[name=itemdic-name]').value = item
        }, items)

        await page.click('.button--itemdic-submit') // 아이템 명을 입력하고 [검색] 버튼을 클릭한다.
        await page.waitForTimeout(500) // 0.5초동안 기다린다.

        await page.click('div.grade > div.lui-select') // 등급 선택
        await page.waitForTimeout(500) // 0.5초동안 기다린다.
        await page.click('div.grade > div.lui-select > div.lui-select__option > label[role=option]:nth-child(6)') // 전설 선택
        await page.waitForTimeout(500) // 0.5초동안 기다린다.

        await page.click('div.main-category > label:nth-child(7)') // 메인 카테고리에 [각인서] 버튼을 클릭한다.
        await page.waitForSelector('div.itemdic-contents') // 페이지 로딩이 될 때까지 기다린다.
        await page.waitForTimeout(500) // 0.5초동안 기다린다.

        const list_total = await page.$eval('#lostark-wrapper > div > main > div > div > div > div.itemdic-contents > div.list > h3 > em', count => {
            return count.textContent
        })

        if(list_total >= 1){
            await page.click('div.list-box > ul > li:nth-child(1)') // 왼쪽 리스트에서 첫번 째 행을 클릭한다.
            await page.waitForSelector('div.itemdic-iteminfo > div.itemdic-iteminfo-wrapper'); // 오른쪽 메뉴 로딩될 때까지 기다린다.
            await page.waitForTimeout(500) // 0.5초 동안 기다린다.

            const content = await page.content()
            const $ = cheerio.load(content)

            const dictionary1 = $("div.list-box > ul > li");
            const dictionary2 = $("div.list-box > ul > li:nth-child(1)");

            const dictionary_list = [];
            let count = 0


            if(dictionary1.length > 1) {
                for(let a of dictionary1) {
                    dictionary_list[count] = $(a).find('a > span.name').text()
                    count++
                }

                param = {
                    name: dictionary_list.join(", "),
                    content: [],
                    count: list_total
                }
            }
            if (dictionary1.length == 1) {
                const name = $(dictionary2).find('a > span.name').text()
                const data = $('div.itemdic-iteminfo-wrapper > div.itemdic-items > div.itemdic-item > div:nth-child(8) > span:nth-child(2) > font')
                for (let a of data) {
                    dictionary_list[count] = $(a).text()
                    count++
                }

                param = {
                    name: name,
                    content: [...new Set(dictionary_list)],
                    count: list_total
                }
            }
        } else {
            param = {
                name: '',
                content: "각인서가 존재하지 않거나 잘못됬을 경우 각인서명까지 치고 스페이스바 한번 눌러서 날려보세요.",
                count: parseInt(list_total)
            }
        }

        return param
    },
}

function  arrOrder(key) {
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