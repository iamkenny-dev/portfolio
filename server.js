const path = require("node:path");
const express = require("express");
const nodemailer = require("nodemailer");
const { rateLimit } = require("express-rate-limit");

const { GMAIL_USER, GMAIL_APP_PASSWORD, CONTACT_TO, PORT = 3000 } = process.env;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !CONTACT_TO) {
  console.error(
    "Missing GMAIL_USER, GMAIL_APP_PASSWORD or CONTACT_TO. Fill them in .env.",
  );
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

const app = express();
app.disable("x-powered-by");
if (process.env.TRUST_PROXY) app.set("trust proxy", 1);

// ---------- Website ----------
// Only these files are public. Serving the whole folder would expose server.js.
const publicFiles = {
  "/": "index.html",
  "/style.css": "style.css",
  "/script.js": "script.js",
};

for (const [route, file] of Object.entries(publicFiles)) {
  app.get(route, (req, res) => res.sendFile(path.join(__dirname, file)));
}

// ---------- Contact form ----------
const LIMITS = { name: 100, email: 254, message: 5000 };
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value, maxLength) {
  if (typeof value !== "string") return "";
  const text = value.trim();
  return text.length <= maxLength ? text : "";
}

app.post(
  "/api/contact",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many messages. Please try again later." },
  }),
  express.json({ limit: "16kb" }),
  async (req, res) => {
    const body = req.body ?? {};

    // People never see this field, so anything in it came from a bot.
    // Reply as if it worked so the bot doesn't try another way.
    if (body.website) return res.json({ ok: true });

    const name = clean(body.name, LIMITS.name);
    const email = clean(body.email, LIMITS.email);
    const message = clean(body.message, LIMITS.message);

    if (!name || /[\r\n]/.test(name) || !EMAIL_PATTERN.test(email) || !message) {
      return res.status(400).json({ error: "Please check the form and try again." });
    }

    try {
      await transporter.sendMail({
        from: { name: "Portfolio contact form", address: GMAIL_USER },
        to: CONTACT_TO,
        replyTo: { name, address: email },
        subject: `New message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\n\n${message}`,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error("Could not send contact email:", error.message);
      res.status(502).json({ error: "Something went wrong. Please try again." });
    }
  },
);

// Turns bad JSON and oversized requests into a normal form error.
app.use((error, req, res, next) => {
  res.status(error.status ?? 500).json({ error: "Please check the form and try again." });
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
});
