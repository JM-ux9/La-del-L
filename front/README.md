# Astro Starter Kit: Minimal

```sh
npm create astro@latest -- --template minimal
```

> 🧑‍🚀 **Seasoned astronaut?** Delete this file. Have fun!

## 🚀 Project Structure

Inside of your Astro project, you'll see the following folders and files:

```text
/
├── public/
├── src/
│   └── pages/
│       └── index.astro
└── package.json
```

Astro looks for `.astro` or `.md` files in the `src/pages/` directory. Each page is exposed as a route based on its file name.

There's nothing special about `src/components/`, but that's where we like to put any Astro/React/Vue/Svelte/Preact components.

Any static assets, like images, can be placed in the `public/` directory.

## 🧞 Commands

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Installs dependencies                            |
| `npm run dev`             | Starts local dev server at `localhost:4321`      |
| `npm run build`           | Build your production site to `./dist/`          |
| `npm run preview`         | Preview your build locally, before deploying     |
| `npm run astro ...`       | Run CLI commands like `astro add`, `astro check` |
| `npm run astro -- --help` | Get help using the Astro CLI                     |

## MercadoPago checkout

Set `PUBLIC_MERCADOPAGO_PUBLIC_KEY` in `front/.env` to the public key for the
same Mercado Pago application configured in the backend. For local testing, use
the application's test public key here and its matching test Access Token in
`p26-back/.env`. Do not expose the Access Token in the frontend.

The Card Payment Brick tokenizes card details in the browser. The backend then
creates the order with Checkout API at `http://localhost:8000/v1/orders`; set
`PUBLIC_API_URL` to change the API host. The order uses the amount stored in the
database, not the amount submitted by the browser.

Orders that require additional verification or asynchronous processing remain
pending. Configure the Mercado Pago **Order** webhook to call
`/v1/mercadopago/webhook` and set its generated secret as
`MERCADOPAGO_WEBHOOK_SECRET` in the backend. A localhost server is not publicly
reachable by Mercado Pago, so use an HTTPS tunnel for local webhook testing.

## 👀 Want to learn more?

Feel free to check [our documentation](https://docs.astro.build) or jump into our [Discord server](https://astro.build/chat).
