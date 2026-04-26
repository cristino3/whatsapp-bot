const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');

const app = express();

console.log("🚀 Bot FINAL pornit...");

// 🌐 WEB SERVER (pt Render + wake-up)
app.get('/', (req, res) => {
    res.send("✅ Bot WhatsApp activ");
});

app.listen(process.env.PORT || 3000, () => {
    console.log("🌐 Web server pornit");
});

// 🤖 WHATSAPP CLIENT
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
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

// 🔧 normalize text
function normalize(text) {
    return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

// 🔧 parse număr corect
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
    console.log("🚀 GATA! Scrie 'raport'");
});

// 🔥 COMANDA RAPORT
client.on('message_create', async msg => {

    if (!msg.fromMe) return;
    if (msg.body.toLowerCase() !== "raport") return;

    console.log("\n📊 Pornesc raportul...\n");

    let report = "";

    for (let groupName of GROUPS) {

        console.log(`🔎 ${groupName}`);

        const chat = cachedChats.find(c =>
            c.isGroup && normalize(c.name).includes(normalize(groupName))
        );

        if (!chat) {
            report += `${groupName} -NU\n`;
            continue;
        }

        let messages = await chat.fetchMessages({ limit: 40 });

        // 🔥 SORTARE CORECTĂ (cel mai recent primul)
        messages.sort((a, b) => b.timestamp - a.timestamp);

        let found = null;

        for (let m of messages) {

            // 🔥 text + caption (pt poze)
            let content = m.body || m.caption;
            if (!content) continue;

            const lines = content.split("\n");

            for (let l of lines) {

                const norm = normalize(l);

                if (
                    norm.includes("total") &&
                    norm.includes("vanz")
                ) {

                    // ignoră totaluri greșite
                    if (
                        norm.includes("discount") ||
                        norm.includes("kg") ||
                        norm.includes("seif") ||
                        norm.includes("procent") ||
                        norm.includes("21")
                    ) continue;

                    const match = l.match(/(\d[\d.,]*)/);

                    if (match) {

                        const number = parseNumber(match[1]);

                        // 🔥 în mii, fără rotunjire
                        const val = number / 1000;
                        found = Math.floor(val * 10) / 10;

                        console.log(`💰 ${groupName}: ${found}`);
                        break;
                    }
                }
            }

            if (found) break;
        }

        report += `${groupName} -${found || "NU"}\n`;
    }

    console.log("\n📤 TRIMIT:\n");
    console.log(report);

    await msg.reply(report);
});

client.initialize();