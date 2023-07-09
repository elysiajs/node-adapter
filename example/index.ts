import { Elysia, t, ws } from 'elysia'
import { node } from '../src'

const app = new Elysia()
    .use(ws())
    .ws('/a', {
        message(ws, message) {
            ws.send(message)
        }
    })
    .get('/', () => 'Hi')
    .get('/id/:id', (c) => {
        c.set.headers['x-powered-by'] = 'benchmark'

        return `${c.params.id} ${c.query.name}`
    })
    .post('/', ({ body }) => 'hi')
    .post('/mirror', ({ body }) => body, {
        type: 'json'
    })
    .use(
        node(8080, (port) => {
            console.log('Listening at :8080')
        })
    )
