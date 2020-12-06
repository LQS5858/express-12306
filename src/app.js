var express = require('express');
var createError = require('http-errors')
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser')
var lessMiddleware = require('less-middleware');
var logger = require('morgan');
import { Lifetime, asClass } from 'awilix'
import { scopePerRequest, loadControllers } from 'awilix-express'
import container from './container'
import BaseMiddleware from './middleware/base'
import { port } from './config'

var app = express();

app.use(logger('dev'));

app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser());
app.use(bodyParser.json({
    limit: '50mb'
}))
app.use(lessMiddleware(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'public')));
app.use(scopePerRequest(container))
app.use(BaseMiddleware(app))
app.use('/v3', loadControllers('routers/*Api.js', {
    cwd: __dirname,
    lifetime: Lifetime.SINGLETON
}))
app.use(function (req, res, next) {
    next(createError(404))
})

app.use(function (err, req, res, next) {
    res.locals.message = err.message
    console.log('--error--', err);
    res.locals.error = req.app.get('env') === 'development' ? err : {}
    res.status(err.status || 500)
    res.send(err)
})

export default async function run () {
    container.loadModules(['./services/*Service.js'], {
        formatName: 'camelCase',
        register: asClass,
        cwd: path.resolve(__dirname)
    })
    app.listen(port, '0.0.0.0', err => {
        if (err) {
            console.log('--启动服务失败--', err);
            return
        }
        console.log('Listening at http://localhost:', port);
    })
}