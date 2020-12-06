import bodyParser from 'body-parser'
import { route, POST, GET, before } from 'awilix-express'


@route('/query')
export default class ticketApi {
    constructor({ queryService }) {
        this.queryService = queryService
    }


    @route('/ticket')
    @GET()
    @before([bodyParser.json()])
    async queryTicket (req, res) {
        const { success, data, message } = await this.queryService.findPage(req.query) || {}
        if (success) {
            return res.success(data)
        }
        return res.fail(null, message)
    }
}