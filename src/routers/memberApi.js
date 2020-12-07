import bodyParser from 'body-parser'
import { route, POST, GET, before } from 'awilix-express'
@route('/member')

export default class memberApi {
    constructor({ memberService }) {
        this.memberService = memberService
    }

    @route('/checkUser')
    @POST()
    @before([bodyParser.json()])
    async checkUser (req, res) {
        /**
         * params{
         * token //登录cookie
         * }
         */
        const { success, data, message } = await this.memberService.checkUser(req.body)
        if (success) {
            return res.success(data)
        }
        return res.fail(null, message)
    }
}