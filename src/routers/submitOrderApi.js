import { route, POST, GET, before } from 'awilix-express'

import bodyParser from 'body-parser'


@route('/ticket')

export default class submitOrderApi {
    constructor({ submitOrderService }) {
        this.submitOrderService = submitOrderService
    }

    @route('/submit')
    @POST()
    @before([bodyParser.json()])
    async submit (req, res) {
        const { success, message, data, error } = await this.submitOrderService.submit(req.body) || {}
        if (success) {
            return res.success(data)
        }
        return res.fail(null, error)
    }
}
