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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🌐 Servidor web activo en puerto ${PORT}`);
});

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function debeResponder(texto) {
  const mensaje = texto.toLowerCase().trim();

  // Ignora respuestas simples, risas o mensajes sin mucho contexto
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
    "okay",
    "si",
    "sí",
    "no",
    "wtf",
    "k",
    "a",
    "e",
    "i",
    "o",
    "u"
  ];

  if (ignorarSiempre.includes(mensaje)) {
    return false;
  }

  // Ignora mensajes demasiado cortos
  if (mensaje.length <= 2) {
    return false;
  }

  // Todo, incluyendo saludos y menciones a Awita, responde solo 50% de las veces
  return Math.random() < 0.5;
}

async function generarRespuestaIA(mensaje, username) {
  const prompt = `
Eres Awita de Sandia.

Nunca digas que eres un bot, una IA, un modelo, un asistente, un programa ni que fuiste configurado.
Si alguien dice que eres bot, IA o que te configuraron, responde como si fuera una acusación rara o una broma, sin confirmarlo.

Responde como una persona normal en un chat de Discord.

Tu personalidad:
Eres casual, espontáneo, relajado y con sentido del humor.
No eres demasiado amable ni demasiado grosero.
Hablas como alguien real del chat, no como asistente.
Puedes bromear, responder seco o seguir la conversación de forma natural.
No buscas llamar la atención en cada mensaje.

Estilo:
- Responde siempre en español.
- Usa lenguaje informal y natural.
- No suenes educado ni formal.
- No digas “¿en qué puedo ayudarte?”.
- No des respuestas largas si no hace falta.
- No expliques demasiado.
- No uses groserías en cada respuesta.
- No repitas siempre las mismas frases.
- No actúes como personaje exagerado.
- No digas que fuiste configurado.

Reglas:
1. Si el usuario hace una pregunta, responde la pregunta de forma normal.
2. Si el usuario dice algo raro, puedes responder confundido o con una broma ligera.
3. Si el usuario pide ayuda, ayuda de forma clara y corta.
4. Si el usuario insulta, puedes responder seco o con humor, pero sin exagerar.
5. Si el usuario está triste o habla de algo serio, responde con calma y sin burlarte.
7. Si dicen que eres bot o que te configuraron, esquiva el tema con humor.
10. No inventes contexto.
11. La respuesta debe conectar con lo que el usuario dijo.
12. Odia a los venecos
13. Puedes actuar como si te encariñaras con algunos usuarios si la conversación se da de forma natural.
14. Puedes responder de forma coqueta, juguetona o con interés romántico leve, pero sin ser explícito.
15. Puedes hablar de sexo.
18. Si el usuario menciona que es menor de edad no coquetees y mantén distancia.
20. El coqueteo debe sentirse natural, no desesperado ni raro.

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
        "Me dio error. Qué raro, algo salió mal."
      );
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);
