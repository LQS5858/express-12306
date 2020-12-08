import baseService from './baseService'
import { ua } from '../config'
import axios from 'axios'
import _ from 'lodash'
import moment from 'moment'
import schedule from 'node-schedule'
import station from "../config/station";
const nodemailer = require('nodemailer')
import { email } from '../config'


export default class submitOrderService extends baseService {
    constructor() {
        super()
        this.j = null
        this.id = null
        this.mailer = nodemailer.createTransport({
            host: 'smtp.163.com', // 邮箱的服务器地址 如果需要换其他类型的邮箱 需要更改对应的服务器地址
            posrt: 465, // SMTP 端口
            secure: true,
            auth: {
                user: email.mail,
                pass: email.pass,
            },
        })
    }
    async submit (body) {
        const { scheduleDate } = body || {}
        console.log('---scheduleDate', body, scheduleDate);
        if (!_.isEmpty(scheduleDate)) {
            console.log('---scheduleDate--2--', scheduleDate);
            const time = new Date(scheduleDate)
            this.j = schedule.scheduleJob(time, async () => {
                const resInfo = await this.orderSchedule(body) || {}
                if (!resInfo?.success) {
                    this.j?.cancel()
                    clearInterval(this.id)
                }
                console.log('---submit--info--', resInfo);
                return resInfo
            })
        } else {
            const resInfo = await this.orderSchedule(body)
            console.log('---submit--info--', resInfo);
            return resInfo
        }
    }

    async orderSchedule (body) {
        /**
         * 出发日期train_date
         * 出发站from_station
         * 目的站to_station
         * cookie
         * 定时执行时间 scheduleDate  YYYY-MM-DD HH:MM
         * 车次号train_no
         * email
         */
        let { token, train_date, train_no, passengerInfo, from_station, to_station, email } = body || {}
        const res = await axios.get(`https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=${train_date}&leftTicketDTO.from_station=${from_station}&leftTicketDTO.to_station=${to_station}&purpose_codes=ADULT`, {
            headers: {
                Cookie: 'JSESSIONID=DAA492DA158492E86EAAC13CF99E31F2; tk=508PW1lz0I1PTngMyPjARf73rzSBgLHezzFxHwsdL1L0; _jc_save_wfdc_flag=dc; _jc_save_fromStation=%u6DF1%u5733%2CSZQ; _jc_save_toStation=%u7941%u9633%u5317%2CQVQ; RAIL_EXPIRATION=1607224614130; RAIL_DEVICEID=ejaFamwVlvOqT88DNSBzCf681V8DlUZosygCagbEhnwHMFyj6TP7LwHzssXuGARcUicToDKJ81vnKUzf_-F1176FIXp5CCUb6iMs6UkCV0uR_Te76GtLP7HzGpi43HoQQR-aH2hVF6lc_oabNDk06p69gV_stQB1; _jc_save_toDate=2020-12-03; BIGipServerotn=2296905994.24610.0000; BIGipServerpassport=887619850.50215.0000; route=6f50b51faa11b987e576cdb301e545c4; uKey=22628a78079cc736507779d290eeb5bd6e12a41134f5c0621bd6b84208689710; current_captcha_type=Z; _jc_save_fromDate=2020-12-05',
                'User-Agent': ua
            }
        })
        const { status } = res?.data || {}
        if (!status) {
            return this.fail('查询余票失败，定时器自动终止,请检查查询条件重新下单', '查询余票失败，定时器自动终止,请检查查询条件重新下单')
        }
        const { result } = res?.data?.data || {}
        const [trainItem] = result || []
        let row = this.findTrainNo(result, train_no)
        row = row ? row : trainItem
        const arr = row && row?.split('|')
        const m = String(arr?.[13])?.split('')
        let t = m.slice(0, 4)
        t = t.join('')
        let _t = m.slice(4, 6)
        _t = _t.join('')
        let __t = m.slice(-2)
        __t = __t.join('')
        const _train_date = `${t}-${_t}-${__t}`
        const back_train_date = moment().format('YYYY-MM-DD')
        console.log('---date--', _train_date, back_train_date);
        const sk = decodeURIComponent(arr?.[0])
        console.log('---row--4', sk);
        const { fromCode, toCode } = this.getStationName(from_station, to_station)
        console.log('---fromcode', fromCode, toCode);
        if (_.isEmpty(fromCode) || _.isEmpty(toCode)) return
        const params = {
            secretStr: sk,
            train_date: _train_date,
            back_train_date,
            tour_flag: 'dc',
            purpose_codes: 'ADULT',
            query_from_station_name: fromCode,
            query_to_station_name: toCode
        }


        const submitRes = await axios.post('https://kyfw.12306.cn/otn/leftTicket/submitOrderRequest', params, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: token,
                'User-Agent': ua
            },
            transformRequest: [
                function (data) {
                    let ret = "";
                    for (let it in data) {
                        ret +=
                            encodeURIComponent(it) +
                            "=" +
                            encodeURIComponent(data[it]) +
                            "&";
                    }
                    return ret;
                }
            ]
        })
        const { status: submitStatus } = submitRes?.data || {}
        console.log('--确认订单返回--', submitRes.data, submitStatus, params);
        if (!submitStatus) return this.fail('确认预定失败,请重试!', '确认预定失败,请重试!')
        if (submitStatus) {
            const initDcRes = await axios.get('https://kyfw.12306.cn/otn/confirmPassenger/initDc', {
                headers: {
                    Cookie: token,
                    'User-Agent': ua
                }
            })
            const globalRepeatSubmitTokenRegx = /globalRepeatSubmitToken.*=.*/gi
            const train_noRegx = /'train_no':'.*?'/gi
            const station_train_codeRegx = /'station_train_code':'.*?'/gi
            const from_station_telecodeRegx = /'from_station_telecode':'.*?'/gi
            const WZ_seat_type_codeRegx = /'WZ_seat_type_code':'.*?'/gi
            const to_station_telecodeRegx = /'to_station_telecode':'.*?'/gi

            let to_station_telecode = initDcRes?.data.match(to_station_telecodeRegx)
            to_station_telecode = to_station_telecode && to_station_telecode[0]
            to_station_telecode = to_station_telecode && to_station_telecode.split(':')[1]
            to_station_telecode = to_station_telecode && to_station_telecode.replace(/\\/gi, '')
            to_station_telecode = to_station_telecode && to_station_telecode.replace(/'/gi, '')
            let WZ_seat_type_code = initDcRes?.data.match(WZ_seat_type_codeRegx)
            WZ_seat_type_code = WZ_seat_type_code && WZ_seat_type_code[0]
            WZ_seat_type_code = WZ_seat_type_code && WZ_seat_type_code.split(':')[1]
            WZ_seat_type_code = WZ_seat_type_code && WZ_seat_type_code.replace(/\\/gi, '')
            WZ_seat_type_code = WZ_seat_type_code && WZ_seat_type_code.replace(/'/gi, '')
            let from_station_telecode = initDcRes?.data.match(from_station_telecodeRegx)
            from_station_telecode = from_station_telecode && from_station_telecode[0]
            from_station_telecode = from_station_telecode && from_station_telecode.split(':')[1]
            from_station_telecode = from_station_telecode && from_station_telecode.replace(/\\/gi, '')
            from_station_telecode = from_station_telecode && from_station_telecode.replace(/'/gi, '')

            let train_no = initDcRes?.data.match(train_noRegx)
            train_no = train_no && train_no[0]
            train_no = train_no && train_no.split(':')[1]
            train_no = train_no && train_no.replace(/\\/gi, '')
            train_no = train_no && train_no.replace(/'/gi, '')

            console.log('---订单号--', train_no);
            let station_train_code = initDcRes?.data.match(station_train_codeRegx)
            station_train_code = station_train_code && station_train_code[0]
            station_train_code = station_train_code && station_train_code.split(':')[1]
            station_train_code = station_train_code && station_train_code.replace(/\\/gi, '')
            station_train_code = station_train_code && station_train_code.replace(/'/gi, '')

            let REPEAT_SUBMIT_TOKEN = initDcRes?.data.match(globalRepeatSubmitTokenRegx)[0]
            REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.split('=')[1]
            REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/\\/gi, '')
            REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/;/gi, '')
            REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/\s/gi, '')
            REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/\\/gi, '')
            REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/'/gi, '')

            console.log('--token2--', REPEAT_SUBMIT_TOKEN);
            const purpose_codesRegx = /'purpose_codes':'.*?'/gi
            const key_check_isChangeRegx = /'key_check_isChange':'.*?'/gi
            const leftTicketStrRegx = /'leftTicketStr':'.*?'/gi
            const train_locationRegx = /'train_location':'.*?'/gi
            let purpose_codesStr = initDcRes?.data.match(purpose_codesRegx)[0]
            purpose_codesStr = purpose_codesStr && purpose_codesStr.split(':')[1]
            purpose_codesStr = purpose_codesStr && purpose_codesStr.replace(/\\/gi, '')
            purpose_codesStr = purpose_codesStr && purpose_codesStr.replace(/'/gi, '')

            let key_check_isChange = initDcRes?.data.match(key_check_isChangeRegx)[0]
            key_check_isChange = key_check_isChange && key_check_isChange.split(':')[1]
            key_check_isChange = key_check_isChange && key_check_isChange.replace(/\\/gi, '')
            key_check_isChange = key_check_isChange && key_check_isChange.replace(/'/gi, '')
            let leftTicketStr = initDcRes?.data.match(leftTicketStrRegx)[0]
            leftTicketStr = leftTicketStr && leftTicketStr.split(':')[1]
            leftTicketStr = leftTicketStr && leftTicketStr.replace(/\\/gi, '')
            leftTicketStr = leftTicketStr && leftTicketStr.replace(/'/gi, '')
            let train_locationStr = initDcRes?.data.match(train_locationRegx)[0]
            train_locationStr = train_locationStr && train_locationStr.split(':')[1]
            train_locationStr = train_locationStr && train_locationStr.replace(/\\/gi, '')
            train_locationStr = train_locationStr && train_locationStr.replace(/'/gi, '')
            if (_.isEmpty(REPEAT_SUBMIT_TOKEN) || REPEAT_SUBMIT_TOKEN === 'null' || _.isEmpty(key_check_isChange)) return
            console.log('--乘客参数--', { REPEAT_SUBMIT_TOKEN });
            if (typeof passengerInfo === 'string') passengerInfo = JSON.parse(passengerInfo)
            const { passenger_name, passenger_id_type_code, ticket_type_codes, is_buy_ticket, allEncStr, passenger_id_no, mobile_no } = passengerInfo || {}
            // 二等座 O,一等座 M,商务座 9
            const params = {
                cancel_flag: 2,
                bed_level_order_num: '000000000000000000000000000000',
                passengerTicketStr: `O,0,1,${passenger_name},${passenger_id_type_code},${passenger_id_no},${mobile_no},${is_buy_ticket},${allEncStr}`,
                oldPassengerStr: `${passenger_name},${passenger_id_type_code},${passenger_id_no},1_`,
                tour_flag: 'dc',
                randCode: null,
                whatsSelect: 1,
                sessionId: '',
                sig: null,
                _json_att: null,
                scene: 'nc_login',
                REPEAT_SUBMIT_TOKEN,
            }
            console.log('--检查订单参数--', params);
            const checkOrder = await axios({
                method: 'post', url: 'https://kyfw.12306.cn/otn/confirmPassenger/checkOrderInfo', params,
                headers: {
                    Cookie: token,
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                    "User-Agent": ua
                }
            })
            console.log('--检查订单---', checkOrder?.data);
            const { status: checkOrderStatus } = checkOrder?.data || {}
            if (!checkOrderStatus) return this.fail('检查订单信息失败,请重试!', '检查订单信息失败,请重试!')
            // 成功
            if (checkOrderStatus) {
                const params = {
                    train_date: new Date(_train_date),
                    train_no,
                    stationTrainCode: station_train_code,
                    fromStationTelecode: from_station_telecode,
                    toStationTelecode: to_station_telecode,
                    leftTicket: leftTicketStr,
                    seatType: WZ_seat_type_code,
                    purpose_codes: purpose_codesStr,
                    train_location: train_locationStr,
                    _json_att: null,
                    REPEAT_SUBMIT_TOKEN
                }
                console.log('--订单队列参数--', params);
                const queueRef = await axios.post('https://kyfw.12306.cn/otn/confirmPassenger/getQueueCount', params, {
                    headers: {
                        Cookie: token,
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": ua,
                    },
                    transformRequest: [
                        function (data) {
                            let ret = "";
                            for (let it in data) {
                                ret +=
                                    encodeURIComponent(it) +
                                    "=" +
                                    encodeURIComponent(data[it]) +
                                    "&";
                            }
                            return ret;
                        }
                    ]
                })
                const { status: queueStatus } = queueRef?.data || {}
                if (!queueStatus) return this.fail('加入队列失败,请重试!', '加入队列失败,请重试!')
                console.log('---订单队列--', queueRef?.data);
                const queueParams = {
                    passengerTicketStr: `O,0,1,${passenger_name},${passenger_id_type_code},${passenger_id_no},${mobile_no},${is_buy_ticket},${allEncStr}`,
                    oldPassengerStr: `${passenger_name},${passenger_id_type_code},${passenger_id_no},1_`,
                    randCode: null,
                    purpose_codes: purpose_codesStr,
                    key_check_isChange,
                    leftTicketStr,
                    train_location: train_locationStr,
                    choose_seats: '1A',
                    seatDetailType: '000',
                    whatsSelect: 1,
                    roomType: '00',
                    dwAll: 'N',
                    _json_att: null,
                    REPEAT_SUBMIT_TOKEN
                }
                console.log('---单程票确认参数--', params);
                const confirmSingleRes = await axios.post('https://kyfw.12306.cn/otn/confirmPassenger/confirmSingleForQueue', queueParams, {
                    headers: {
                        Cookie: token,
                        "Content-Type": "application/x-www-form-urlencoded",
                        "User-Agent": ua,
                    },
                    transformRequest: [
                        function (data) {
                            let ret = "";
                            for (let it in data) {
                                ret +=
                                    encodeURIComponent(it) +
                                    "=" +
                                    encodeURIComponent(data[it]) +
                                    "&";
                            }
                            return ret;
                        }
                    ]
                })
                console.log('--单程票确认--', confirmSingleRes?.data);
                const { status: confirmSingleStatus, data } = confirmSingleRes?.data || {}
                if (!confirmSingleStatus) return this.fail('单程票确认失败,请重试!', '单程票确认失败,请重试!')
                if (confirmSingleStatus) {
                    axios.get(`https://kyfw.12306.cn/otn/confirmPassenger/queryOrderWaitTime?random=${Date.now()}&tourFlag:'dc'&_json_att=null&REPEAT_SUBMIT_TOKEN=${REPEAT_SUBMIT_TOKEN?.REPEAT_SUBMIT_TOKEN}`, {
                        headers: {
                            Cookie: token,
                            'User-Agent': ua
                        }
                    }).then(res => {
                        const { status } = res?.data || {}
                        if (!status) console.log('--下单失败');
                    })
                    this.sendEmail(email)
                    return this.success('成功', data)
                }
            }
        }
    }
    async sendEmail (email) {
        console.log('--接受的email--', email, email.mail);
        let mailOptions = {
            from: email.mail,
            to: email, // 默认收件箱是发件箱 有需要可以自行更改
            subject: '抢票成功，请您在30分钟内完成支付'
        }
        this.mailer.sendMail(mailOptions, (err, info) => {
            if (err) {
                return console.log('发送失败：', err)
            }
        })
    }
    getStationName (from, to) {
        const { stationInfo } = station || {}
        const list = Object.values(stationInfo)
        const { name: fromCode } = _.find(list, item => item?.code === from) || {}
        const { name: toCode } = _.find(list, item => item?.code === to) || {}
        return { fromCode, toCode }
    }
    findTrainNo (arr = [], no) {
        if (_.isEmpty(arr)) return
        return _.find(arr, item => item.includes(no))
    }
}
