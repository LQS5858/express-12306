import baseServices from './baseService'
import axios from 'axios'
import _ from 'lodash'
import { ua } from '../config'

export default class checkUser extends baseServices {
    constructor() {
        super()
    }

    async checkUser (body) {
        const { token } = body || {}
        const obj = await axios.post('https://kyfw.12306.cn/otn/login/checkUser', { _json_att: null }, {
            headers: {
                Cookie: token,
                "Content-Type": "application/x-www-form-urlencoded",
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
        const { messages = '', data } = obj?.data || {}
        const { flag } = data || {}
        if (!flag) return this.fail('失败', messages)
        return this.success('成功', data)
    }
}