# Profitoo Integration Guide

## What Profitoo Team Needs to Do

### When a user clicks your menu, do these 2 things:

---

### Step 1: Call our API

Send a POST request to:

```
POST http://192.168.0.166:5230/predict/session
```

With this JSON body:

```json
{
  "returnUrl": "http://your-profitoo-app-url"
}
```

We will respond with:

```json
{
  "token": "some-unique-id",
  "url": "http://192.168.0.166:3535/predict/some-unique-id"
}
```

---

### Step 2: Redirect the user

Take the `url` from our response and redirect your user to it.

That's it. The user will see our credit risk form, submit it, get a result, and can click **"Back to Profitoo"** to return to your app.

---

## Optional: Pre-fill the form

If you already have some customer data, you can send it in the request:

```json
{
  "returnUrl": "http://your-profitoo-app-url",
  "application": {
    "LOAN_AMOUNT": 15000,
    "KSCORE": 1050
  }
}
```

All fields are optional. Only send what you have.

---

## Important Notes

- **You must call our API first** — the URL with the token is generated dynamically each time
- **Each token works only once** — consumed when the user loads the page
- **Tokens expire after 2 hours** — create a new session if expired
