import { Elysia } from 'elysia'
import { bearer } from '../src'

import { describe, expect, it } from 'bun:test'

const req = (path: string) => new Request(path)

const app = new Elysia()
    .use(bearer())
    .get('/sign', ({ bearer }) => bearer, {
        beforeHandle({ bearer, set }) {
            if (!bearer) {
                set.status = 400
                set.headers[
                    'WWW-Authenticate'
                ] = `Bearer realm='sign', error="invalid_request"`

                return 'Unauthorized'
            }
        }
    })
    .listen(8080)

const nonRFC = new Elysia()
    .use(
        bearer({
            extract: {
                body: 'a',
                header: 'a',
                query: 'a'
            }
        })
    )
    .get('/sign', ({ bearer }) => bearer, {
        beforeHandle({ bearer, set }) {
            if (!bearer) {
                set.status = 400
                set.headers[
                    'WWW-Authenticate'
                ] = `Bearer realm='sign', error="invalid_request"`

                return 'Unauthorized'
            }
        }
    })
    .listen(8080)

describe('Bearer', () => {
    it('parse bearer from header', async () => {
        const res = await app
            .handle(
                new Request('/sign', {
                    headers: {
                        Authorization: 'Bearer saltyAom'
                    }
                })
            )
            .then((r) => r.text())

        expect(res).toBe('saltyAom')
    })

    it("don't parse empty Bearer header", async () => {
        const res = await app.handle(
            new Request('/sign', {
                headers: {
                    Authorization: 'Bearer '
                }
            })
        )

        expect(res.status).toBe(400)
    })

    it('parse bearer from query', async () => {
        const res = await app
            .handle(new Request('/sign?access_token=saltyAom'))
            .then((r) => r.text())

        expect(res).toBe('saltyAom')
    })

    it('parse bearer from custom header', async () => {
        const res = await nonRFC
            .handle(
                new Request('/sign', {
                    headers: {
                        Authorization: 'a saltyAom'
                    }
                })
            )
            .then((r) => r.text())

        expect(res).toBe('saltyAom')
    })

    it('parse bearer from custom query', async () => {
        const res = await nonRFC
            .handle(new Request('/sign?a=saltyAom'))
            .then((r) => r.text())

        expect(res).toBe('saltyAom')
    })
})
