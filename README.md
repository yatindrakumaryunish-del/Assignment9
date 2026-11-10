# CampusEats Catalogue — Secured (Node + Express + JWT + bcrypt)

A REST API for the CampusEats menu, secured as per the CS543 *API Security Tutorial*:

- **Passwords** are hashed with `bcryptjs` (never stored in plain text)
- **`POST /login`** checks the password and returns a signed **JWT** (expires in 1 hour)
- **`auth` middleware** = authentication (who are you?) -> `401`
- **`requireRole` middleware** = authorization (are you allowed?) -> `403`
- **Validation** (is the data clean?) -> `422`

## Run

    npm install
    node server.js

Open http://localhost:3000

Optional (recommended): keep the secret out of code.

    JWT_SECRET=some-long-random-string node server.js        # Linux / macOS
    $env:JWT_SECRET="some-long-random-string"; node server.js  # Windows PowerShell

See `.env.example`. If `JWT_SECRET` is not set, a dev secret is used and a warning is printed.

## Demo users

| Email | Password | Role |
|---|---|---|
| asha@campus.edu | customer123 | customer |
| mealhub@campus.edu | resto123 | restaurant |

## Routes

| Method | Route | Who | Success | Errors |
|---|---|---|---|---|
| POST | `/login` | anyone | 200 `{token, role, email}` | 401 bad login, 422 missing fields |
| GET | `/items` (`?veg=true/false`) | any logged-in user | 200 | 401 |
| GET | `/items/:id` | any logged-in user | 200 | 401, 404 |
| POST | `/items` | restaurant, admin | 201 | 401, 403, 422 |
| DELETE | `/items/:id` | restaurant, admin | 204 | 401, 403, 404 |

Send the token as `Authorization: Bearer <token>`.

## Try it with curl

    # 1. no token -> 401
    curl -i localhost:3000/items

    # 2. log in as the restaurant -> JWT
    curl -X POST localhost:3000/login -H "Content-Type: application/json" \
         -d '{"email":"mealhub@campus.edu","password":"resto123"}'

    # 3. read the menu with the token -> 200
    curl -i localhost:3000/items -H "Authorization: Bearer $TOKEN"

    # 4. restaurant adds a dish -> 201
    curl -X POST localhost:3000/items -H "Authorization: Bearer $RESTO" \
         -H "Content-Type: application/json" -d '{"name":"Masala Dosa","price":60}'

    # 5. customer tries the same -> 403 Forbidden
    curl -i -X POST localhost:3000/items -H "Authorization: Bearer $CUST" \
         -H "Content-Type: application/json" -d '{"name":"Hack Burger","price":99}'

Or just run everything in one go (server must be running): `bash test-api.sh`

## 401 vs 403

- **401 Unauthorized** = I don't know who you are (no / bad / expired token)
- **403 Forbidden** = I know you, but you can't do this (wrong role)

## Security checklist (from the tutorial)

- [x] Passwords hashed with bcrypt, never plaintext
- [x] Secret read from `process.env.JWT_SECRET`; token has an expiry (`1h`)
- [x] Authenticate (401) before authorize (403)
- [x] Validation kept separate from security (422)
- [ ] Object-level check (IDOR) — needs per-user data such as orders (next step)
- [ ] HTTPS in production (deploy-time setting)

## Project structure

    server.js        API: login, auth, requireRole, items routes
    public/          web page (login, menu, add / remove dishes by role)
    test-api.sh      curl script covering the tutorial's 401 / 200 / 201 / 403 steps
    .env.example     environment variables
