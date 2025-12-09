// ================================
// IMPORTURI
// ================================
const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require("discord.js");
const fs = require("fs-extra");
const fetch = require("node-fetch");
const crypto = require("crypto");

// ================================
// ENV VARS (Render)
// ================================
const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ================================
// STORAGE SESSION ID
// ================================
const DATA_FILE = "./data.json";
if (!fs.existsSync(DATA_FILE)) fs.writeJsonSync(DATA_FILE, { session_id: "" });

function getData() { return fs.readJsonSync(DATA_FILE); }
function saveData(obj) { fs.writeJsonSync(DATA_FILE, obj); }

// ================================
// DISCORD CLIENT
// ================================
const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================================
// SLASH COMMANDS
// ================================
const commands = [
    new SlashCommandBuilder()
        .setName("set_session_id")
        .setDescription("Salvează session ID-ul TikTok")
        .addStringOption(opt =>
            opt.setName("session")
                .setDescription("Session ID TikTok")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("new_username")
        .setDescription("Schimbă username-ul TikTok")
        .addStringOption(opt =>
            opt.setName("username")
                .setDescription("Noul username")
                .setRequired(true)
        ),

    new SlashCommandBuilder()
        .setName("check_session")
        .setDescription("Verifică dacă session ID-ul este valid")
].map(c => c.toJSON());

const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("✔ Comenzi înregistrate în Discord");
    } catch (error) {
        console.error("❌ Eroare la înregistrarea comenzilor:", error);
    }
})();

// ======================================================
// =============== X GORGON FULL JS PORT =================
// ======================================================

function hexString(num) {
    let s = num.toString(16);
    return s.length < 2 ? "0" + s : s;
}

function rbit(num) {
    let b = num.toString(2).padStart(8, "0");
    return parseInt([...b].reverse().join(""), 2);
}

function reverseHex(num) {
    let s = num.toString(16).padStart(2, "0");
    return parseInt(s[1] + s[0], 16);
}

class XG {
    constructor(debug) {
        this.length = 0x14;
        this.debug = debug;
        this.hex_CE0 = [
            0x05, 0x00, 0x50,
            Math.floor(Math.random() * 256),
            0x47, 0x1e, 0x00,
            Math.floor(Math.random() * 256) & 0xf0
        ];
    }

    addr_BA8() {
        let arr = Array.from({ length: 256 }, (_, i) => i);
        let tmp = "";
        
        for (let i = 0; i < 256; i++) {
            let A = i === 0 ? 0 : tmp ? tmp : arr[i - 1];
            let B = this.hex_CE0[i % 8];
            
            if (A === 0x05 && i !== 1 && tmp !== 0x05) {
                A = 0;
            }
            
            let C = (A + i + B) % 256;
            tmp = C < i ? C : "";
            let D = arr[C];
            arr[i] = D;
            arr[C] = i;
        }
        
        return arr;
    }

    initial(debug, arr) {
        let tmp = [];
        let temp = [...arr];

        for (let i = 0; i < this.length; i++) {
            let A = debug[i];
            let B = tmp.length ? tmp[tmp.length - 1] : 0;
            let C = (arr[i + 1] + B) % 256;

            tmp.push(C);

            let D = temp[C];
            temp[i + 1] = D;

            let E = (D * 2) % 256;
            let F = temp[E];
            debug[i] = A ^ F;
        }

        return debug;
    }

    calculate(debug) {
        for (let i = 0; i < this.length; i++) {
            let A = debug[i];
            let B = reverseHex(A);
            let C = debug[(i + 1) % this.length];
            let D = B ^ C;
            let E = rbit(D);
            let F = E ^ this.length;
            let G = (~F) & 0xFF;
            debug[i] = G;
        }
        return debug;
    }

    main() {
        let result = "";
        let final = this.calculate(this.initial(this.debug, this.addr_BA8()));
        final.forEach(i => result += hexString(i));

        return (
            "8404" +
            hexString(this.hex_CE0[7]) +
            hexString(this.hex_CE0[3]) +
            hexString(this.hex_CE0[1]) +
            hexString(this.hex_CE0[6]) +
            result
        );
    }
}

function generateGorgon(param, data, cookie) {
    let now = Math.floor(Date.now() / 1000);
    let Khronos = now.toString(16);
    let debug = [];

    let urlMD5 = crypto.createHash("md5").update(param).digest("hex");
    for (let i = 0; i < 8; i += 2)
        debug.push(parseInt(urlMD5.slice(i, i + 2), 16));

    if (data) {
        let dataMD5 = crypto.createHash("md5").update(data).digest("hex");
        for (let i = 0; i < 8; i += 2)
            debug.push(parseInt(dataMD5.slice(i, i + 2), 16));
    } else {
        debug.push(0, 0, 0, 0);
    }

    if (cookie) {
        let cookieMD5 = crypto.createHash("md5").update(cookie).digest("hex");
        for (let i = 0; i < 8; i += 2)
            debug.push(parseInt(cookieMD5.slice(i, i + 2), 16));
    } else {
        debug.push(0, 0, 0, 0);
    }

    debug.push(1, 1, 2, 4);

    for (let i = 0; i < 8; i += 2) {
        let x = parseInt(Khronos.slice(i, i + 2), 16);
        debug.push(x);
    }

    while (debug.length < 0x14) {
        debug.push(0);
    }

    return {
        "X-Gorgon": new XG(debug).main(),
        "X-Khronos": now.toString()
    };
}

// ======================================================
// ========== TikTok GET PROFILE (unique_id) ============
// ======================================================

async function getProfile(session_id, device_id, iid) {
    try {
        let param = `device_id=${device_id}&iid=${iid}&id=kaa&version_code=34.0.0&language=en&app_name=lite&app_version=34.0.0&carrier_region=SA&tz_offset=10800&locale=en&sys_region=SA&aid=473824`;
        let url = `https://api16.tiktokv.com/aweme/v1/user/profile/self/?${param}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        let res = await fetch(url, {
            headers: {
                "Cookie": `sessionid=${session_id}`,
                "User-Agent": "com.zhiliaoapp.musically/2022701030 (Linux; U; Android 9; en_US; RMX3551; Build/PQ3A.190705.003; Cronet/TTNetVersion:5c5a6994 2022-07-13)",
                "Accept-Encoding": "gzip, deflate"
            },
            signal: controller.signal
        });

        clearTimeout(timeout);

        if (!res.ok) {
            console.error(`API Error: ${res.status} ${res.statusText}`);
            return "None";
        }

        let data = await res.json();
        return data.user?.unique_id || "None";

    } catch (e) {
        console.error("Eroare în getProfile:", e.message);
        return "None";
    }
}

// ======================================================
// ========== TikTok CHANGE USERNAME ====================
// ======================================================

async function changeUsername(session_id, new_username) {
    let device_id = Math.floor(Math.random() * 9999999999).toString();
    let iid = Math.floor(Math.random() * 9999999999).toString();

    try {
        console.log("⏳ Obțin username-ul curent...");
        let lastUsername = await getProfile(session_id, device_id, iid);
        
        if (lastUsername === "None") {
            return "❌ Session ID invalid sau expirat!";
        }
        
        console.log(`Username curent: ${lastUsername}`);

        let data = `aid=364225&unique_id=${encodeURIComponent(new_username)}`;
        let param = `aid=364225&device_id=${device_id}&iid=${iid}`;
        
        console.log("⏳ Generez X-Gorgon...");
        let sig = generateGorgon(param, data, "");
        console.log(`X-Gorgon: ${sig["X-Gorgon"]}`);
        console.log(`X-Khronos: ${sig["X-Khronos"]}`);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        console.log("⏳ Trimit cererea la TikTok...");
        let res = await fetch(
            `https://api16.tiktokv.com/aweme/v1/commit/user/?${param}`,
            {
                method: "POST",
                headers: {
                    "Cookie": `sessionid=${session_id}`,
                    "User-Agent": "com.zhiliaoapp.musically/2022701030 (Linux; U; Android 9; en_US; RMX3551; Build/PQ3A.190705.003; Cronet/TTNetVersion:5c5a6994 2022-07-13)",
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept-Encoding": "gzip, deflate",
                    ...sig
                },
                body: data,
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        let responseText = await res.text();
        console.log(`Răspuns TikTok: ${responseText.substring(0, 200)}...`);

        if (!res.ok) {
            return `❌ Eroare HTTP ${res.status}: ${responseText.substring(0, 500)}`;
        }

        // Așteptăm puțin pentru ca schimbarea să fie procesată
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log("⏳ Verific noul username...");
        let changed = await getProfile(session_id, device_id, iid);
        console.log(`Noul username: ${changed}`);

        if (changed === new_username) {
            return `✔ Username schimbat cu succes!\nDe la: ${lastUsername}\nLa: ${changed}`;
        } else if (changed !== lastUsername) {
            return `⚠ Username schimbat, dar diferit de cel cerut.\nVeche: ${lastUsername}\nNou: ${changed}`;
        } else {
            return `❌ Username nu s-a schimbat. Răspuns TikTok:\n${responseText.substring(0, 1000)}`;
        }

    } catch (e) {
        console.error("Eroare în changeUsername:", e);
        return `❌ Eroare internă: ${e.message}`;
    }
}

// ======================================================
// ========== DISCORD BOT HANDLER =======================
// ======================================================

client.on("ready", () => {
    console.log(`🤖 Bot online ca ${client.user.tag}!`);
});

client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const data = getData();

    if (interaction.commandName === "set_session_id") {
        const session = interaction.options.getString("session");
        
        if (!session || session.length < 10) {
            return interaction.reply({ content: "❌ Session ID invalid!", ephemeral: true });
        }
        
        data.session_id = session;
        saveData(data);
        
        console.log(`Session ID salvat: ${session.substring(0, 10)}...`);
        return interaction.reply({ content: "✔ Session ID salvat!", ephemeral: true });
    }

    if (interaction.commandName === "check_session") {
        if (!data.session_id || data.session_id.trim() === "") {
            return interaction.reply({ content: "❌ Niciun session ID salvat.", ephemeral: true });
        }
        
        await interaction.deferReply({ ephemeral: true });
        
        let device_id = Math.floor(Math.random() * 9999999999).toString();
        let iid = Math.floor(Math.random() * 9999999999).toString();
        
        try {
            let username = await getProfile(data.session_id, device_id, iid);
            
            if (username === "None") {
                return interaction.editReply("❌ Session ID invalid sau expirat!");
            }
            
            return interaction.editReply(`✔ Session ID valid!\nUsername curent: **${username}**`);
        } catch (error) {
            return interaction.editReply(`❌ Eroare la verificare: ${error.message}`);
        }
    }

    if (interaction.commandName === "new_username") {
        if (!data.session_id || data.session_id.trim() === "") {
            return interaction.reply({ 
                content: "❌ Folosește întâi `/set_session_id` pentru a salva session ID-ul!", 
                ephemeral: true 
            });
        }

        const username = interaction.options.getString("username");
        
        // Validare username
        if (!username || username.length < 2 || username.length > 24) {
            return interaction.reply({ 
                content: "❌ Username-ul trebuie să aibă între 2 și 24 de caractere!", 
                ephemeral: true 
            });
        }
        
        // Trimitem mesajul de "În curs..."
        await interaction.deferReply();

        console.log(`Încep schimbarea username-ului la: ${username}`);
        
        let result = await changeUsername(data.session_id, username);
        
        console.log(`Rezultat: ${result.substring(0, 100)}...`);
        
        return interaction.editReply(result);
    }
});

// ======================================================
// ========== ERROR HANDLING ===========================
// ======================================================

process.on("unhandledRejection", (error) => {
    console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
    console.error("Uncaught exception:", error);
});

client.login(TOKEN).catch(error => {
    console.error("❌ Eroare la login:", error);
    process.exit(1);
});
