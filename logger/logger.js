const winston = require('winston')
const util = require('util')
const winstonDaily = require('winston-daily-rotate-file')

const logDir = __dirname+'/logs'  // logs 디렉토리 하위에 로그 파일 저장
const { combine, timestamp, printf } = winston.format

// Define log format
const logFormat = printf(info => {
    return `${info.timestamp} ${info.level}: ${util.format('%o', info.message)}`
});

const COMMON_OPT = {
    handleExceptions: true,
    json: false,
    format: combine(
        timestamp(),
        printf(({ level, message, timestamp }) => {
            level = level.toUpperCase()
            return util.format('%o', message).trim().split('\n').map((line) => {
                return `${timestamp} [${level}]: ${line}`
            }).join('\n')
        })
    )
}

/*
 * Log Level
 * error: 0, warn: 1, info: 2, http: 3, verbose: 4, debug: 5, silly: 6
 */
const logger = winston.createLogger({
    format: combine(
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss',
        }),
        logFormat,
    ),
    transports: [
        // info 레벨 로그를 저장할 파일 설정
        new winstonDaily({
            level: 'info',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir,
            filename: `%DATE%.log`,
            maxFiles: 30,  // 30일치 로그 파일 저장
            zippedArchive: true,
        }),
        // error 레벨 로그를 저장할 파일 설정
        new winstonDaily({
            level: 'error',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/error',  // error.log 파일은 /logs/error 하위에 저장
            filename: `%DATE%.error.log`,
            maxFiles: 30,
            zippedArchive: true,
        }),
        new winstonDaily({
            ...COMMON_OPT,
            level: 'debug',
            datePattern: 'YYYY-MM-DD',
            dirname: logDir + '/debug',  // error.log 파일은 /logs/error 하위에 저장
            filename: `%DATE%.debug.log`,
            maxFiles: 30,
            zippedArchive: true,
        })
    ],
});

// Production 환경이 아닌 경우(dev 등)
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),  // 색깔 넣어서 출력
            winston.format.simple(),  // `${info.level}: ${info.message} JSON.stringify({ ...rest })` 포맷으로 출력
        )
    }));
}

module.exports = { logger };