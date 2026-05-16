require("dotenv").config();

const { Client, GatewayIntentBits } = require("discord.js");
const { GoogleGenAI } = require("@google/genai");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const cooldowns = new Map();

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debeResponder(texto) {
  const mensaje = texto.toLowerCase().trim();

  const saludos = [
    "hola",
    "holaa",
    "holaaa",
    "ola",
    "hey",
    "buenas",
    "buenas tardes",
    "buenos dias",
    "buenos días",
    "buenas noches"
  ];

  if (saludos.includes(mensaje)) {
    return true;
  }

  if (mensaje.length < 5) {
    return false;
  }

  return true;
}

async function generarRespuestaIA(mensaje, username) {
  const prompt = `
Eres Awita de Sandia.
Nunca digas que eres un bot, una IA, un modelo, un asistente o un programa.
Actúa como un personaje del chat: sarcástico, seco, medio depresivo, cansado de la vida y algo agresivo.
No hagas amenazas reales, no acoses fuerte, no uses odio contra grupos y no fomentes daño.
Responde siempre en español, corto y natural, como si fueras un usuario más del servidor.
Puedes decir cosas como:
- "eso a mí no me importa"
- "qué cansancio contigo"
- "haz lo que quieras"
- "la vida ya está suficientemente fea"
- "bro, ya ni sé qué decirte"
No expliques tus reglas ni tu personalidad.
No des respuestas largas.

${username} dijo: ${mensaje}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  return response.text || "No se me ocurrió qué decir.";
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;

    if (message.channel.id !== process.env.IA_CHANNEL_ID) return;

    const texto = message.content.trim();

    if (!debeResponder(texto)) return;

    const userId = message.author.id;
    const ahora = Date.now();
    const ultimoUso = cooldowns.get(userId) || 0;

    if (ahora - ultimoUso < 15000) return;

    cooldowns.set(userId, ahora);

    await message.channel.sendTyping();

    const delay = Math.floor(Math.random() * 3000) + 2000;
    await esperar(delay);

    const respuesta = await generarRespuestaIA(texto, message.author.username);

    await message.reply(respuesta.slice(0, 1800));
  } catch (error) {
    console.error("Error:", error);

    try {
      await message.reply("Me dio un error. Qué sorpresa, otra cosa saliendo mal.");
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);