import bodyParser from 'body-parser'
import { route, POST, GET, before } from 'awilix-express'


@route('/passenger')
export default class passengerInfoApi {
    constructor({ passengerInfoService }) {
        this.passengerInfoService = passengerInfoService
    }
    @route('/findPage')
    @POST()
    @before([bodyParser.json()])
    async findPage (req, res) {
        const { success, data, message } = await this.passengerInfoService.getPassengerInfo(req.body)
        if (success) {
            return res.success(data)
        }
        return res.fail(null, message)
    }
}