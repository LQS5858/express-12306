
import baseService from './baseService'
import axios from 'axios'
import { ua } from '../config'
export default class queryService extends baseService {
    constructor() {
        super()
    }

    async findPage (body) {
        const { train_date = '2020-11-14', from_station, to_station, token } = body || {}
        const obj = await axios.get(`https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=${train_date}&leftTicketDTO.from_station=${from_station}&leftTicketDTO.to_station=${to_station}&purpose_codes=ADULT`, {
            headers: {
                'User-Agent': ua,
                "Content-Type": "application/x-www-form-urlencoded",
                Cookie: 'JSESSIONID=DAA492DA158492E86EAAC13CF99E31F2; tk=508PW1lz0I1PTngMyPjARf73rzSBgLHezzFxHwsdL1L0; _jc_save_wfdc_flag=dc; _jc_save_fromStation=%u6DF1%u5733%2CSZQ; _jc_save_toStation=%u7941%u9633%u5317%2CQVQ; RAIL_EXPIRATION=1607224614130; RAIL_DEVICEID=ejaFamwVlvOqT88DNSBzCf681V8DlUZosygCagbEhnwHMFyj6TP7LwHzssXuGARcUicToDKJ81vnKUzf_-F1176FIXp5CCUb6iMs6UkCV0uR_Te76GtLP7HzGpi43HoQQR-aH2hVF6lc_oabNDk06p69gV_stQB1; _jc_save_toDate=2020-12-03; BIGipServerotn=2296905994.24610.0000; BIGipServerpassport=887619850.50215.0000; route=6f50b51faa11b987e576cdb301e545c4; uKey=22628a78079cc736507779d290eeb5bd6e12a41134f5c0621bd6b84208689710; current_captcha_type=Z; _jc_save_fromDate=2020-12-05',
            }
        })
        console.log('--查询余票url--', `https://kyfw.12306.cn/otn/leftTicket/query?leftTicketDTO.train_date=${train_date}&leftTicketDTO.from_station=${from_station}&leftTicketDTO.to_station=${to_station}&purpose_codes=ADULT`);
        console.log('---余票返回--', obj.data);
        const { messages = '', data, httpstatus } = obj?.data || {}
        if (!httpstatus) {
            return this.fail('查询余票失败', messages)
        }
        const { result } = data || {}
        if (messages) {
            return this.fail('查询余票失败', messages)
        }
        return this.success('查询余票成功', result)
    }
}