const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();

console.log("🚀 Bot pornit...");

// 🌐 WEB SERVER (Render wake-up)
app.get('/', (req, res) => {
    res.send("Bot activ");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Web server pornit");
});

// 🤖 WHATSAPP CLIENT
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu'
        ]
    }
});

const GROUPS = [
    "Mihai Bravu",
    "Pipera Plaza",
    "DN1 - Balotesti",
    "Baneasa",
    "Promenada Bucuresti",
    "Colosseum",
    "Obor",
    "Afi B.Noi",
    "Veranda",
    "Ph Shopping City",
    "Ph Centru",
    "Ph AFI",
    "Ph Sud",
    "Targoviste"
];

let cachedChats = [];

function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function parseNumber(str) {
    if (str.includes(",")) {
        return parseFloat(str.replace(/\./g, "").replace(",", "."));
    }

    if (str.includes(".")) {
        const parts = str.split(".");
        if (parts[1] && parts[1].length === 3) {
            return parseFloat(str.replace(/\./g, ""));
        } else {
            return parseFloat(str);
        }
    }

    return parseFloat(str);
}

// 📱 QR
client.on('qr', qr => {
    console.log("📱 SCANEAZĂ QR:");
    qrcode.generate(qr, { small: true });
});

// ✅ READY
client.on('ready', async () => {
    console.log("✅ Bot conectat!");
    cachedChats = await client.getChats();
    console.log("Scrie 'raport'");
});

// 🔥 RAPORT
client.on('message_create', async msg => {

    if (!msg.fromMe) return;
    if (!msg.body || msg.body.toLowerCase() !== "raport") return;

    console.log("📊 Generez raport...");

    let report = "";

    for (let groupName of GROUPS) {

        const chat = cachedChats.find(c =>
            c.isGroup && normalize(c.name).includes(normalize(groupName))
        );

        if (!chat) {
            report += `${groupName} -NU\n`;
            continue;
        }

        let messages = await chat.fetchMessages({ limit: 40 });
        messages.sort((a, b) => b.timestamp - a.timestamp);

        let found = null;

        for (let m of messages) {

            let content = m.body || m.caption;
            if (!content) continue;

            const lines = content.split("\n");

            for (let l of lines) {

                const norm = normalize(l);

                if (norm.includes("total") && norm.includes("vanz")) {

                    if (
                        norm.includes("discount") ||
                        norm.includes("kg") ||
                        norm.includes("seif") ||
                        norm.includes("procent")
                    ) continue;

                    const match = l.match(/(\d[\d.,]*)/);

                    if (match) {

                        const number = parseNumber(match[1]);

                        const val = number / 1000;
                        found = Math.floor(val * 10) / 10;

                        break;
                    }
                }
            }

            if (found) break;
        }

        report += `${groupName} -${found || "NU"}\n`;
    }

    console.log(report);
    await msg.reply(report);
});

client.initialize();
