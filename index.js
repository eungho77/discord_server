var express = require('express');

const cheerio = require('cheerio');
const { server_port } = require('./config.json')
const { parsing } = require('./html/pasing')
const { logger } = require('./logger/logger')

const app = express();

/* GET home page. */
app.get('/api/info/:username/:nickname', async (req, res) => {
    let param = {}
    const html = await parsing.getHtml("https://m-lostark.game.onstove.com/Profile/Character/" + req.params.nickname)
    const $ = cheerio.load(html.data)

    // 서버 점검 알림
    const loa = await parsing.getHtml("https://m-lostark.game.onstove.com")
    const $1 = cheerio.load(loa.data)

    const mode = $1( "head > title").text() != "로스트아크 - 서비스 점검" ? true : false

    if(mode) {
        param.nickname = $("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[1];
        if(param.nickname) {
            param.search = true
            param.server = $("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(1) > dd").text().split("@")[1] // 서버
            param.job = $("dd.myinfo__character > div.wrapper-define > dl.define:nth-child(2) > dd").text() // 직업
            param.expedition = $("div.myinfo__contents-level > div.wrapper-define:nth-child(1) > dl.define > dd.level").text() // 원정대
            param.level = $("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[0] // 로스트아크 레벨
            param.itemLevel = $("div.myinfo__contents-level > div.wrapper-define:nth-child(2) > dl.item > dd.level").text() // 장착 아이템
            param.mode = mode;

            let basic_array = parsing.profile_ability_basic($) // 최대 생명력, 전투 공격력
            let battle_array = parsing.profile_ability_battle($) // 치명, 특화, 제압, 신속, 인내, 숙련
            let engrave_array = parsing.profile_ability_engrave($) // 각인
            let jewel_array = await parsing.profile_jewel($) // 카드
            let card_array = parsing.card_tab($) // 카드
            let expand_array = await parsing.expand_character_list($) // 보유 캐릭터


            // 기본 특성
            param.basic = {
                attack: basic_array[0], // 전투 공격력
                hp: basic_array[1] // 최대 생명력
            };

            param.battle = battle_array
            param.engrave = engrave_array // 각인 효과
            param.card = card_array // 카드
            param.expand = expand_array // 보유 캐릭터
            param.jewel = jewel_array // 보석

            logger.info('Discord 닉네임 : ' + req.params.username + '님이 [검색] "명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname.trim() + '] 조회 / 성공')
        } else {
            param.mode = mode;
            param.search = false
            param.content = "닉네임이 존재하지 않거나 잘못됬을 경우 닉네임까지 치고 스페이스바 한번 눌러서 날려보세요."

            logger.error('Discord 닉네임 : ' + req.params.username + '님이 [검색] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname.trim() + '] 조회 / 닉네임 불일치')
        }
    } else {
        param.mode = mode
        param.title = "서버 점검 중입니다."

        logger.error('Discord 닉네임 : ' + req.params.username + '님이 [검색] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname.trim() + '] 조회 / 서버 점검')
    }

    res.send(param)
});

app.get('/api/internal_stability/:username/:nickname', async (req, res) => {
    const param = {};
    const html = await parsing.getHtml("https://m-lostark.game.onstove.com/Profile/Character/" + req.params.nickname);
    const $ = cheerio.load(html.data);

    // 서버 점검 알림
    const loa = await parsing.getHtml("https://m-lostark.game.onstove.com")
    const $1 = cheerio.load(loa.data)

    const mode = $1( "head > title").text() != "로스트아크 - 서비스 점검" ? true : false
    if(mode) {
        const nickname = $("dd.myinfo__character > button.myinfo__character--button2").text().split(" ")[1]
        if(nickname) {
            let life_arryy = parsing.profile_skill_life($) // 생활스킬
            let collection_arary = await parsing.profile_collection(req.params.nickname)

            param.search = true
            param.life = life_arryy // 생활스킬
            param.collection = collection_arary
            param.mode = mode

            logger.info('Discord 닉네임 : ' + req.params.username + '님이 [내실] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname + '] 조회 / 성공')
        } else {
            param.mode = mode
            param.search = false
            param.content = "닉네임이 존재하지 않거나 잘못됬을 경우 닉네임까지 치고 스페이스바 한번 눌러서 날려보세요."

            logger.error('Discord 닉네임 : ' + req.params.username + '님이 [내실] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname + '] 조회 / 닉네임 불일치')
        }
    } else {
        param.mode = mode
        param.title = "서버 점검 중입니다."

        logger.error('Discord 닉네임 : ' + req.params.username + '님이 [내실] 명령어를 썼습니다. / 로스트아크 닉네임 : [' + req.params.nickname + '] 조회 / 서버 점검')
    }

    res.send(param)
});

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

    logger.info('Discord 닉네임 : ' + req.params.username + '님이 [스케줄] 명령어를 썼습니다. / 성공')

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

    Challenge.date = Challenge_date
    Challenge.raid = Challenge_raid_list
    Challenge.abyss = Challenge_raid_abyss

    logger.info('Discord 닉네임 : ' + req.params.username + '님이 [도전] 명령어를 썼습니다. / 성공')

    res.send(Challenge)
});

app.get('/api/shop/search/:username/:items', async (req, res) => {
    let param = await parsing.getData("http://152.70.248.4:5000/tradeplus/" + req.params.items)

    const data = param.data
    console.log(data)
    let result = {}

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
    const $ = cheerio.load(html.data)
    const result = await parsing.shop_mari($)

    logger.info('Discord 닉네임 : ' + req.param.username + '님이 [마리샵] 명령어를 썼습니다. / 성공')

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

        param.search = true
        param.result = dictionary
        param.mode = mode

        logger.info('Discord 닉네임 : ' + req.params.username + '님이 [사전] 명령어를 썼습니다. / 사전 검색 : [' + req.params.items + '] 조회 / 성공')
    } else {
        param.mode = mode
        param.title = "서버 점검 중입니다."

        logger.error('Discord 닉네임 : ' + req.params.username + '님이 [사전] 명령어를 썼습니다. / 사전 아이템 : [' + req.params.items + '] 조회 / 서버 점검')
    }

    res.send(param)
})

app.get('/api/adventureisland', async (req, res) => {
    const html = await parsing.getHtml("https://loawa.com/")
    const $ = cheerio.load(html.data)
    const result = await parsing.adventureisland($)

    res.send(result)
});

var server = app.listen(server_port, function()  {
    var host = server.address().address;
    var port  = server.address().port;

    console.log('Server is working : PORT - ', port);
})

