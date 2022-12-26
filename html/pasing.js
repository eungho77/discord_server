const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
// const {Interaction} = require("discord.js");
const { jmt_key } = require('../config.json')

const parsing = {
    getHtml: async (url) => {
        try {
            return await axios.get(encodeURI(url))
        } catch (e) {
            console.error(e)
        }
    },
    getData: async (url) => {
        try {
            return await axios.get(encodeURI(url),
                {
                    headers : {
                        Authorization : jmt_key
                    }
                }
            );
        } catch (e) {
            console.error(e)
        }
    },
    postData: async (url) => {
        try {
            return await axios.post(encodeURI(url))
        } catch (e) {
            console.error(e)
        }
    },
    profile_battle: function(data) {
        const battle_list = [] // 기본 특성
        let count = 0

        while(true) {
            param = {
                name : data[count].Type,
                number : data[count].Value
            }
            battle_list.push(param)
            if(count == data.length - 3) {
                break
            }
            count++
        }

        return battle_list;
    },
    profile_tendencies: function(data) {
        const tendencies_list = [] // 기본 특성
        let count = 0

        for(let tendencies of data) {
            param = {
                name : tendencies.Type,
                number : tendencies.Point + "/" + tendencies.MaxPoint
            }
            tendencies_list.push(param)
        }

        return tendencies_list
    },
    profile_skills: function(data) {
        const skills_list = [] // 스킬 설명
        let skills_detail_list = [] // 상세 스킬

        for(let skill of data) {
            if(skill.Level >= 5) {
                for(let skill_detail of skill.Tripods) {
                    if(skill_detail.IsSelected){
                        skill_detail = {
                            slot: skill_detail.Slot,
                            name: skill_detail.Name,
                            level: skill_detail.Level
                        }
                        skills_detail_list.push(skill_detail)
                    }
                }
                param = {
                    name: skill.Name,
                    level: skill.Level,
                    detail: skills_detail_list
                }
                skills_list.push(param)
                skills_detail_list = []
            }
        }

        return skills_list
    },
    profile_equipment: function(data) {
        const equipment_list = []

        for(let equipment of data) {
            param = {
                type : equipment.Type,
                name : "[" + equipment.Grade + "] " + equipment.Name
            }
            equipment_list.push(param)
        }

        return equipment_list

    },
    profile_avatars: function(data) {
        const avatars_list = []

        for(let avatars of data) {
            param = {
                type : avatars.Type,
                name : "[" + avatars.Grade + "] " + avatars.Name
            }
            avatars_list.push(param)
        }

        return avatars_list

    },
    profile_ability_engrave: function(data) {
        const engrave_list = [] // 각인 리스트

        for(let engrave of data.Effects) {
            param = {
                name : engrave.Name.split(" Lv. ")[0],
                level : engrave.Name.split(" Lv. ")[1]
            }
            engrave_list.push(param)
        }

        return engrave_list
    },
    expand_character_list: function(data) {
        const character_list = [] // 보유 캐릭터 리스트

        for(let expand_character of data){
            param = {
                nickname : expand_character.CharacterName, // 닉네임
                server : expand_character.ServerName, // 서버
                job : expand_character.CharacterClassName, // 직업
                level : expand_character.CharacterLevel, // 로스트아크 레벨
                max_item_level : expand_character.ItemMaxLevel, // 로스트아크 최대 레벨
                avg_item_level : expand_character.ItemAvgLevel // 장착 아이템
            }
            character_list.push(param)
        }

        return character_list
    },
    card_tab: function(data) {
        const card_list = []

        for(let card of data.Cards) {
            param = {
                name : card.Name,
                stone_count : card.AwakeCount
            }
            card_list.push(param)
        }

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
    profile_collection: function (data) {
        const collection_list = [];

        for(let collection of data){
            param = {
                name: collection.Type,
                count: collection.Point
            }

            collection_list.push(param)
        }

        return collection_list
    },
    profile_jewel: function(data) {
        const jewel_list = [];
        // let count = 0

        for(let Gems of data.Gems) {
            for(let Effects of data.Effects){
                if(Gems.Slot == Effects.GemSlot) {
                    param = {
                        name: Effects.Name,
                        effect: Effects.Description,
                        type: (Effects.Description.split(" ")[0] == "피해") ? "멸화" : "홍염",
                        level: "Lv." + Gems.Level
                    };

                    jewel_list.push(param)
                }
            }
        }

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