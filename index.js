var express = require('express');

const cheerio = require('cheerio');
const { server_port, url } = require('./config.json')
const { parsing } = require('./html/pasing')
const { logger } = require('./logger/logger')

const app = express();

/* GET home page. */
app.get('/api/info/:username/:nickname', async (req, res) => {
    let param = {}

    // 서버 점검 알림
    const loa = await parsing.getHtml("https://m-lostark.game.onstove.com")
    const $ = cheerio.load(loa.data)

    const mode = $( "head > title").text() != "로스트아크 - 서비스 점검" ? true : false

    try {
        if(mode) {
            const loa_profile = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/profiles") // 기본 정보, 성향, 전투
            const loa_skills = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/combat-skills") // 스킬
            const loa_equipment = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/equipment") // 장비
            const loa_avatars = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/avatars") // 아바타
            const loa_engrave = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/engravings") // 각인
            const loa_cards = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/cards") // 카드
            const loa_gems = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/gems") // 보석
            const loa_expand = await parsing.getData(url + "/characters/" + req.params.nickname + "/siblings") // 보유 캐릭터
            const loa_collectibles = await parsing.getData(url + "/armories/characters/" + req.params.nickname + "/collectibles") // 수집품

            if(req.params.nickname === loa_profile.data.CharacterName) {
                param.search = true
                param.nickname = loa_profile.data.CharacterName // 닉네임
                param.server = loa_profile.data.ServerName // 서버
                param.guild = loa_profile.data.GuildName // 길드
                param.townName = loa_profile.data.TownName // 영지 이름
                param.townLevel = loa_profile.data.TownLevel // 영지 레벨
                param.pvpLevel = loa_profile.data.PvpGradeName // pvp 레벨
                param.job = loa_profile.data.CharacterClassName // 직업
                param.expedition = loa_profile.data.ExpeditionLevel // 원정대 레벨
                param.level = loa_profile.data.CharacterLevel // 로스트아크 평균 레벨
                param.max_item_level = loa_profile.data.ItemMaxLevel // 로스트아크 최대 레벨
                param.avg_item_level = loa_profile.data.ItemAvgLevel // 장착 아이템
                param.image = loa_profile.data.CharacterImage // 장착 아이템
                param.mode = mode
                param.basic = { // 기본 특성
                    attack : loa_profile.data.Stats[6].Value, // 공격력
                    hp : loa_profile.data.Stats[7].Value // 체력
                }

                try {
                    param.battle = parsing.profile_battle(loa_profile.data.Stats) // 치명, 특화, 제압, 신속, 인내, 숙련
                    param.tendencies = parsing.profile_tendencies(loa_profile.data.Tendencies) // 성향
                    param.skills = parsing.profile_skills(loa_skills.data) // 스킬
                    param.equipment = parsing.profile_equipment(loa_equipment.data) // 장비
                    param.avatars = parsing.profile_avatars(loa_avatars.data) // 아바타
                    param.engrave = parsing.profile_ability_engrave(loa_engrave.data) // 각인
                    param.card = parsing.card_tab(loa_cards.data) // 카드
                    param.expand = parsing.expand_character_list(loa_expand.data) // 보유 캐릭터
                    param.collectibles = parsing.profile_collection(loa_collectibles.data) // 보유 캐릭터
                    param.jewel = parsing.profile_jewel(loa_gems.data) // 보석

                    logger.info('Discord 닉네임 : ' + req.params.username + '님이 [검색] "명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname.trim() + '] 조회 / 성공')
                    logger.debug(param)
                } catch (e) {
                    console.log(e)
                    logger.debug(e)
                }
            } else {
                param.mode = mode;
                param.search = false
                param.content = "닉네임이 존재하지 않거나 잘못됬을 경우 닉네임까지 치고 스페이스바 한번 눌러서 날려보세요."

                logger.error('Discord 닉네임 : ' + req.params.username + '님이 [검색] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname.trim() + '] 조회 / 닉네임 불일치')
                logger.debug(param)
            }
        } else {
            param.mode = mode
            param.title = "서버 점검 중입니다."

            logger.error('Discord 닉네임 : ' + req.params.username + '님이 [검색] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname.trim() + '] 조회 / 서버 점검')
            logger.debug(param)
        }
    } catch (e) {
        console.log(e)
    }


    res.send(param)
});

// app.get('/api/internal_stability/:username/:nickname', async (req, res) => {
//     const param = {};
//     const html = await parsing.getHtml("https://m-lostark.game.onstove.com/Profile/Character/" + req.params.nickname);
//     const $ = cheerio.load(html.data);
//
//     // 서버 점검 알림
//     const loa = await parsing.getHtml("https://m-lostark.game.onstove.com")
//     const $1 = cheerio.load(loa.data)
//
//     const mode = $1( "head > title").text() != "로스트아크 - 서비스 점검" ? true : false
//     if(mode) {
//         const nickname = $("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[1]
//         if(nickname) {
//             let life_arryy = parsing.profile_skill_life($) // 생활스킬
//             let collection_arary = await parsing.profile_collection(req.params.nickname)
//
//             try {
//                 param.search = true
//                 param.life = life_arryy // 생활스킬
//                 param.collection = collection_arary
//                 param.mode = mode
//
//                 logger.info('Discord 닉네임 : ' + req.params.username + '님이 [내실] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname + '] 조회 / 성공')
//                 logger.debug(collection_arary)
//             } catch (e) {
//                 logger.debug(e)
//             }
//         } else {
//             param.mode = mode
//             param.search = false
//             param.content = "닉네임이 존재하지 않거나 잘못됬을 경우 닉네임까지 치고 스페이스바 한번 눌러서 날려보세요."
//
//             logger.error('Discord 닉네임 : ' + req.params.username + '님이 [내실] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname + '] 조회 / 닉네임 불일치')
//             logger.debug(param)
//
//         }
//     } else {
//         param.mode = mode
//         param.title = "서버 점검 중입니다."
//
//         logger.error('Discord 닉네임 : ' + req.params.username + '님이 [내실] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname + '] 조회 / 서버 점검')
//         logger.debug(param)
//     }
//
//     res.send(param)
// });

app.get('/api/inven/timer/:username', async (req, res) => {
    let html = await parsing.getHtml("https://m.inven.co.kr/lostark/timer/");
    const $ = cheerio.load(html.data)
    let lostarkTimer_list = [];

    const lostarkTimer = $('#lostarkTimer > div > div.bosslist > div > ul > li');
    let param = {};

    lostarkTimer.each(function(i, v) {
        param = {
            name: $(v).find("a.info > span.npcname").text().replace(/\s$/gi, ""),
            time: $(v).find("a.info > span.gentime").text().replace(/\s$/gi, "")
        }
        lostarkTimer_list.push(param)
    })

    try {
        logger.info('Discord 닉네임 : ' + req.params.username + '님이 [스케줄] 명령어를 썼습니다. / 성공')
        logger.debug(lostarkTimer_list)
    } catch (e) {
        logger.debug(e)
    }

    res.send(lostarkTimer_list)
});

app.get('/api/inven/timer1/', async (req, res) => {
    let html = await parsing.getHtml("https://m.inven.co.kr/lostark/timer/");
    const $ = cheerio.load(html.data)
    let lostarkTimer_list = [];

    const lostarkTimer = $('#lostarkTimer > div > div.bosslist > div > ul > li');
    let param = {};

    lostarkTimer.each(function(i, v) {
        param = {
            name: $(v).find("a.info > span.npcname").text().replace(/\s$/gi, ""),
            time: $(v).find("a.info > span.gentime").text().replace(/\s$/gi, "")
        }
        lostarkTimer_list.push(param)
    })

    try {
        logger.info('[스케줄] 명령어를 썼습니다. / 성공')
        logger.debug(lostarkTimer_list)
    } catch (e) {
        logger.debug(e)
    }

    res.send(lostarkTimer_list)
});

app.get('/api/inven/challenge/:username', async (req, res) => {
    let html = await parsing.getHtml("https://lostark.inven.co.kr/")
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

    try {
        Challenge.date = Challenge_date
        Challenge.raid = Challenge_raid_list
        Challenge.abyss = Challenge_raid_abyss

        logger.info('Discord 닉네임 : ' + req.params.username + '님이 [도전] 명령어를 썼습니다. / 성공')
        logger.debug(Challenge)
    } catch (e) {
        logger.debug(e)
    }

    res.send(Challenge)
});

app.get('/api/shop/search/:username/:items', async (req, res) => {
    let param = await parsing.getData("https://lostarkapi.ga/tradeplus/" + req.params.items)

    const data = param.data
    let result = {}

    try{
        if(data.Result == 'Success') {
            if (data.Data.length > 1) {
                result.mode = true
                result.total = data.Data.length
                result.items = data.Data
            }
            if (data.Data.length == 1) {
                result.mode = true
                result.items = data.FirstItem
                result.total = data.Data.length
            }
            logger.info('Discord 닉네임 : ' + req.params.username + '님이 [상점] 명령어를 썼습니다. / 검색 : [' + req.params.items + '] 조회 / 성공')
            logger.debug(data)
        }
    } catch (e) {
        logger.debug(e)
    }

    if(data.Result == 'Failed') {
        result.mode = false
        result.items = '아이템이 없거나 아바타명일경우 검색 불가능합니다.'
        result.total = 0

        logger.error('Discord 닉네임 : ' + req.params.username + '님이 [상점] 명령어를 썼습니다. / 검색 : [' + req.params.items + '] 조회 / 실패')
    }

    res.send(result)
});

app.get('/api/shop/mari/:username', async (req, res) => {
    const html = await parsing.getHtml("https://lostark.game.onstove.com/Shop#mari")
    let result

    // 서버 점검 알림
    const loa = await parsing.getHtml("https://m-lostark.game.onstove.com")
    const $1 = cheerio.load(loa.data)

    const mode = $1( "head > title").text() != "로스트아크 - 서비스 점검" ? true : false

    if(mode) {
        const $ = cheerio.load(html.data)
        const data = await parsing.shop_mari($)
        try {
            result = {
                mode: mode,
                result: data
            }
            logger.info('Discord 닉네임 : ' + req.param.username + '님이 [마리샵] 명령어를 썼습니다. / 성공')
            logger.debug(data)
        } catch (e) {
            logger.debug(e)
        }

    } else {
        result = {
            mode: mode,
            title : "서버 점검 중입니다."
        }
        logger.error('Discord 닉네임 : ' + req.params.username + '님이 [마리샵] 명령어를 썼습니다. / 서버 점검')
    }

    res.send(result)
});

app.get('/api/loa/dictionary/:username/:items', async (req, res) => {
    // 서버 점검 알림
    const loa = await parsing.getHtml("https://m-lostark.game.onstove.com")
    const $1 = cheerio.load(loa.data)

    let param = {}

    const mode = $1( "head > title").text() != "로스트아크 - 서비스 점검" ? true : false
    if(mode) {
        let dictionary = await parsing.dictionary(req.params.items)
        try {
            param.search = true
            param.result = dictionary
            param.mode = mode

            logger.info('Discord 닉네임 : ' + req.params.username + '님이 [사전] 명령어를 썼습니다. / 사전 검색 : [' + req.params.items + '] 조회 / 성공')
            logger.debug(dictionary)
        } catch (e) {
            logger.debug(e)
        }
    } else {
        param.mode = mode
        param.title = "서버 점검 중입니다."

        logger.error('Discord 닉네임 : ' + req.params.username + '님이 [사전] 명령어를 썼습니다. / 사전 아이템 : [' + req.params.items + '] 조회 / 서버 점검')
    }

    res.send(param)
})

app.get('/api/adventureisland/:username', async (req, res) => {
    const content = await parsing.adventureisland("https://ark.bynn.kr/calendar/summary")
    try{
        logger.info('Discord 닉네임 : ' + req.params.username + '님이 [모험섬] 명령어를 썼습니다. / 성공')
        logger.debug(content)

        res.send(content)
    } catch (e) {
        logger.debug(e)
    }
});

var server = app.listen(server_port, function()  {
    var host = server.address().address;
    var port  = server.address().port;

    console.log('Server is working : PORT - ', port);
})

