import baseServices from './baseService'
import axios from 'axios'
import _ from 'lodash'
import { ua } from '../config'
import { token } from 'morgan'

export default class passengerInfoService extends baseServices {
    constructor() {
        super()
    }

    async getPassengerInfo (body) {
        const { token } = body || {}

        const res = await axios.get('https://kyfw.12306.cn/otn/confirmPassenger/initDc', {
            headers: {
                Cookie: token,
                'User-Agent': ua
            }
        })
        const REPEAT_SUBMIT_TOKEN = await this.formatData(res.data)
        const passener = await axios.post('https://kyfw.12306.cn/otn/confirmPassenger/getPassengerDTOs', { REPEAT_SUBMIT_TOKEN, _json_att: null }, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                'User-Agent': ua,
                Cookie: token
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
        const { data, messages } = passener?.data || {}
        const { noLogin, normal_passengers, exMsg } = data || {}
        console.log('--passenger--', data, exMsg);

        if (!_.isEmpty(normal_passengers)) {
            return this.success('成功', data)
        } else {
            return this.fail(exMsg)
        }
    }
    async formatData (data) {
        const globalRepeatSubmitTokenRegx = /globalRepeatSubmitToken.*=.*/gi
        let REPEAT_SUBMIT_TOKEN = data.match(globalRepeatSubmitTokenRegx)[0]
        REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.split('=')[1]
        REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/\\/gi, '')
        REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/;/gi, '')
        REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/\s/gi, '')
        REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/\\/gi, '')
        REPEAT_SUBMIT_TOKEN = REPEAT_SUBMIT_TOKEN && REPEAT_SUBMIT_TOKEN.replace(/'/gi, '')
        console.log('---token--', REPEAT_SUBMIT_TOKEN);
        return REPEAT_SUBMIT_TOKEN
    }

}