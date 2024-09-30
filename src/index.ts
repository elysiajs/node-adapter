import {
    App,
    type us_listen_socket,
    type HttpRequest,
    type HttpResponse
} from 'uWebSockets.js'

import {
    Elysia,
    mapResponse,
    mapEarlyResponse,
    NotFoundError,
    type Context,
    type HTTPMethod,
    type InternalRoute
} from 'elysia'
import { parse } from 'fast-querystring'

const readStream = (req: HttpRequest, res: HttpResponse) =>
    new Promise<Buffer>((resolve, reject) => {
        try {
            let data = Buffer.from('')
            res.onData((chunk, isLast) => {
                if (isLast) resolve(Buffer.concat([data, Buffer.from(chunk)]))
                else data = Buffer.concat([data, Buffer.from(chunk)])
            }).onAborted(() => reject(''))
        } catch (err) {
            reject(err)
        }
    })

const toResponse = async (res: HttpResponse, response: Response) => {
    res.writeStatus(response.status.toString())
    for (const [key, value] of response.headers.entries())
        res.writeHeader(key, value)

    res.end((await response.text()) ?? 'Empty')
}

export const node =
    (port: number, callback: (socket: us_listen_socket) => any = () => {}) =>
    (app: Elysia) => {
        // @ts-ignore
        const routes: InternalRoute<any>[] = app.routes

        const server = App()

        for (const { method, path, composed: handle } of routes) {
            // @ts-ignore
            app.compile()

            const ids = path
                .split('/')
                .filter((name) => name.startsWith(':'))
                .map((name, index) => [name.slice(1), index] as const)

            server[method.toLowerCase() as 'get'](path, async (res, req) => {
                const q = req.getQuery()
                const query = q ? parse(q) : {}
                const headers: Record<string, string> = {}

                req.forEach((key, value) => {
                    headers[key] = value
                })

                const params: Record<string, string> = {}

                for (const [name, index] of ids)
                    params[name] = req.getParameter(index)

                const request = new Request(`http://a.aa${path}`, {
                    body:
                        method !== 'GET' && method !== 'HEAD'
                            ? await readStream(req, res)
                            : undefined,
                    headers,
                    method
                })

                const set: Context['set'] = {
                    status: 200,
                    headers: {}
                }

                const context = {
                    ...app.decorators,
                    set,
                    params,
                    store: app.store,
                    request,
                    query
                } as Context

                for (let i = 0; i < app.event.request.length; i++) {
                    const onRequest = app.event.request[i]
                    let response = onRequest(context)
                    if (response instanceof Promise) response = await response

                    response = mapEarlyResponse(response, set)
                    if (response) {
                        return void toResponse(res, response)
                    }
                }

                try {
                    return void toResponse(res, await handle(context))
                } catch (error) {
                    return void toResponse(
                        res,
                        // @ts-ignore
                        await app.handleError({ request, set }, error as Error)
                    )
                }
            })
        }

        server.any('/*', async (res, req) => {
            const path = req.getUrl()
            const method = req.getMethod()
            const query = parse(req.getQuery())
            const headers: Record<string, string> = {}

            req.forEach((key, value) => {
                headers[key] = value
            })

            const request = new Request(`http://a.aa${path}`, {
                method,
                body:
                    method !== 'get' && method !== 'head'
                        ? await readStream(req, res)
                        : undefined,
                headers
            })

            const set: Context['set'] = {
                status: 200,
                headers: {}
            }

            const response = mapResponse(
                // @ts-ignore
                await app.handleError({ request, set }, new NotFoundError()),
                set
            )

            await toResponse(
                res,
                // @ts-ignore
                await app.handleError({ request, set }, new NotFoundError())
            )
        })

        server.listen(port, (port) => {
            if (port) callback(callback)
        })

        return app
    }

export default node
