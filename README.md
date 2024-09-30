# @elysiajs/node

### This plugin is in an experimental state (under heavy development), and SHOULD NOT BE USED on production

Plugin for [elysia](https://github.com/elysiajs/elysia) using Elysia on NodeJS

## Installation
```bash
bun add @elysiajs/node
```

## Example
```typescript
import { Elysia } from 'elysia'
import { node } from '@elysiajs/node'

const app = new Elysia()
    .get('/', () => 'hi')
    .use(node(8080, (socket) => {
        console.log(`Node server running at http://localhost:${port}`)
    }))
```
