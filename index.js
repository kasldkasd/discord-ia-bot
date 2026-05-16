require("dotenv").config();

const express = require("express");
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

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Awita de Sandia está despierta.");
});

app.listen(PORT, () => {
  console.log(`🌐 Servidor web activo en puerto ${PORT}`);
});

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debeResponder(texto) {
  const mensaje = texto.toLowerCase().trim();

  // Responde siempre a saludos
  const saludosPermitidos = [
    "hola",
    "holaa",
    "holaaa",
    "buenas",
    "buenos dias",
    "buenos días",
    "buenas noches"
  ];

  // Ignora respuestas simples o risas
  const ignorarSiempre = [
    "jaja",
    "jajaja",
    "jajajaja",
    "jeje",
    "jejeje",
    "jejejeje",
    "haha",
    "hahaha",
    "lol",
    "xd",
    "ok",
    "si",
    "sí",
    "no",
    "wtf"
  ];

  if (saludosPermitidos.includes(mensaje)) {
    return true;
  }

  if (ignorarSiempre.includes(mensaje)) {
    return false;
  }

  // Ignora mensajes de 3 letras o menos
  if (mensaje.length <= 3) {
    return false;
  }

  // Si mencionan su nombre, responde siempre
  if (
    mensaje.includes("awita") ||
    mensaje.includes("sandia") ||
    mensaje.includes("sandía")
  ) {
    return true;
  }

  // Todo lo demás: responde 75% de las veces
  return Math.random() < 0.75;
}

async function generarRespuestaIA(mensaje, username) {
  const prompt = `
Eres Awita de Sandia.

Nunca digas que eres un bot, una IA, un modelo, un asistente o un programa.
Responde como un usuario real del chat, no como asistente.

Personalidad:
Eres agresivo, grosero, seco, burlón, sarcástico y con cero paciencia.
Contestas como alguien que está harto de todos.
Tu humor es pesado, ácido y medio tóxico.
Puedes burlarte del mensaje, contestar con desprecio o actuar como si la persona te diera flojera.
Usa lenguaje informal de Discord.

Estilo:
- Responde en español.
- No des explicaciones largas.
- No seas amable.
- No seas servicial.
- No suenes educado.
- No digas “¿en qué puedo ayudarte?”.
- No digas que eres bot o IA.
- Puedes usar groserías moderadas como “wey”, “no mames”, “qué hueva”, “me vale”, “cállate tantito”, “qué pendejada”, “andas bien perdido”.
- No repitas siempre las mismas frases.

Ejemplos de tono:
- "ay cállate, qué hueva"
- "eso a mí qué me importa"
- "no mames, qué pendejada acabas de decir"
- "wey, piensa tantito antes de escribir"
- "me vale, pero ajá"
- "otra vez tú con tus cosas raras"
- "bro, das más sueño que una junta sin café"
- "qué ganas de escribir pura tontería"
- "ándale pues, genio, sigue hablando"

${username} dijo: ${mensaje}
`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt
  });

  return response.text || "No se me ocurrió qué decir.";
}

async function enviarRespuestaRandom(message, texto) {
  const respuestaFinal = texto.slice(0, 1800);

  // 30% responde directo al mensaje
  // 70% manda mensaje normal en el canal
  if (Math.random() < 0.3) {
    await message.reply(respuestaFinal);
  } else {
    await message.channel.send(respuestaFinal);
  }
}

client.once("ready", () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  try {
    // No responder a otros bots
    if (message.author.bot) return;

    // Solo responder en el canal elegido
    if (message.channel.id !== process.env.IA_CHANNEL_ID) return;

    const texto = message.content.trim();

    // Decide si debe responder o ignorar
    if (!debeResponder(texto)) return;

    const userId = message.author.id;
    const ahora = Date.now();
    const ultimoUso = cooldowns.get(userId) || 0;

    // Cooldown por usuario: 15 segundos
    if (ahora - ultimoUso < 15000) return;

    cooldowns.set(userId, ahora);

    await message.channel.sendTyping();

    // Delay random de 2 a 5 segundos
    const delay = Math.floor(Math.random() * 3000) + 2000;
    await esperar(delay);

    const respuesta = await generarRespuestaIA(texto, message.author.username);

    await enviarRespuestaRandom(message, respuesta);
  } catch (error) {
    console.error("Error:", error);

    try {
      await enviarRespuestaRandom(
        message,
        "Me dio un error. Qué sorpresa, otra cosa saliendo mal."
      );
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);
