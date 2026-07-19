require("dotenv").config();

const express = require("express");
const fs = require("fs");
const path = require("path");
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

const AMOR_FILE = path.join(__dirname, "amor.json");

function cargarAmor() {
  try {
    if (!fs.existsSync(AMOR_FILE)) {
      return {
        userId: null,
        username: null,
        desde: null
      };
    }

    const data = fs.readFileSync(AMOR_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return {
      userId: null,
      username: null,
      desde: null
    };
  }
}

function guardarAmor(data) {
  try {
    fs.writeFileSync(AMOR_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error guardando amor:", error);
  }
}

let amorDeAwita = cargarAmor();

let ultimoMensajeDiario = null;

function fechaDeHoy() {
  const ahora = new Date();
  return ahora.toLocaleDateString("es-MX");
}

function yaEnvioMensajeHoy() {
  return ultimoMensajeDiario === fechaDeHoy();
}

function marcarMensajeEnviadoHoy() {
  ultimoMensajeDiario = fechaDeHoy();
}

async function enviarMensajeDiarioMaxi() {
  try {
    if (yaEnvioMensajeHoy()) return;

    const ahora = new Date();

    if (ahora.getHours() === 20 && ahora.getMinutes() === 0) {
      const canal = await client.channels.fetch(process.env.IA_CHANNEL_ID);

      if (!canal) return;

      await canal.send("Quiero hacer el amor contigo maxi");
      marcarMensajeEnviadoHoy();
    }
  } catch (error) {
    console.error("Error enviando mensaje diario a Maxi:", error);
  }
}

// Función para ejecutar bump usando webhook
async function ejecutarBump() {
  try {
    console.log("🔄 Awita está ejecutando /bump...");
    
    const canal = await client.channels.fetch(process.env.IA_CHANNEL_ID);
    
    if (!canal) {
      console.error("❌ No se encontró el canal");
      return;
    }

    // Obtener o crear webhook
    const webhooks = await canal.fetchWebhooks();
    let webhook = webhooks.find(w => w.name === "AwitaBump");
    
    if (!webhook) {
      webhook = await canal.createWebhook({
        name: "AwitaBump",
        avatar: client.user.displayAvatarURL()
      });
      console.log("✅ Webhook 'AwitaBump' creado");
    }

    // Enviar /bump usando el webhook
    await webhook.send({
      content: "/bump",
      username: "Awita de Sandia",
      avatarURL: client.user.displayAvatarURL()
    });
    
    console.log("✅ Awita ejecutó /bump correctamente");
  } catch (error) {
    console.error("❌ Error ejecutando bump:", error);
  }
}

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

function debeResponder(texto, esReplyDirecto, mencionAlBot) {
  const mensaje = texto.toLowerCase().trim();
  const nombreBot = client.user.username.toLowerCase();
  const apodos = ["awita", "awita de sandia", "sandia"];

  if (esReplyDirecto) return true;
  if (mencionAlBot) return true;

  const saludos = [
    "hola", "buenos días", "buenos dias", "buenas tardes", "buenas noches",
    "hey", "que tal", "qué tal", "que onda", "qué onda", "saludos",
    "buen día", "buen dia", "buenas", "holi", "holis"
  ];

  if (saludos.includes(mensaje)) return true;
  if (mensaje.includes(nombreBot) || apodos.some(apodo => mensaje.includes(apodo))) return true;

  return false;
}

function actualizarAmor(message, texto) {
  const mensaje = texto.toLowerCase();

  const frasesRomanticas = [
    "te amo", "te quiero", "me gustas", "eres bonita", "eres hermosa",
    "eres linda", "quieres ser mi novia", "sé mi novia", "se mi novia",
    "cásate conmigo", "casate conmigo", "me encantas", "te extraño", "te necesito"
  ];

  const frasesRuptura = [
    "ya no te quiero", "ya no me gustas", "terminamos", "olvídame",
    "olvidame", "ya no quiero nada contigo", "no me hables", "me caes mal",
    "vete", "callate", "cállate"
  ];

  const frasesCelosCambio = [
    "yo te quiero más", "yo te quiero mas", "yo te amo más", "yo te amo mas",
    "olvídate de él", "olvidate de el", "olvídate de ella", "olvidate de ella",
    "enamórate de mí", "enamorate de mi", "yo soy mejor", "déjalo por mí",
    "dejalo por mi", "déjala por mí", "dejala por mi"
  ];

  const dijoAlgoRomantico = frasesRomanticas.some(frase => mensaje.includes(frase));
  const dijoRuptura = frasesRuptura.some(frase => mensaje.includes(frase));
  const quiereQueCambie = frasesCelosCambio.some(frase => mensaje.includes(frase));

  const esSuAmorActual = amorDeAwita.userId === message.author.id;

  if (amorDeAwita.userId && esSuAmorActual && dijoRuptura) {
    amorDeAwita = {
      userId: null,
      username: null,
      desde: null
    };
    guardarAmor(amorDeAwita);
    return;
  }

  if (!amorDeAwita.userId && dijoAlgoRomantico && Math.random() < 0.65) {
    amorDeAwita = {
      userId: message.author.id,
      username: message.author.username,
      desde: new Date().toISOString()
    };
    guardarAmor(amorDeAwita);
    return;
  }

  if (
    amorDeAwita.userId &&
    !esSuAmorActual &&
    (dijoAlgoRomantico || quiereQueCambie) &&
    Math.random() < 0.25
  ) {
    amorDeAwita = {
      userId: message.author.id,
      username: message.author.username,
      desde: new Date().toISOString()
    };
    guardarAmor(amorDeAwita);
    return;
  }
}

function obtenerEstadoAmor(username) {
  if (!amorDeAwita.userId) {
    return `
Estado romántico de Awita:
Awita no está enamorada de nadie por ahora.
Puede encariñarse o enamorarse si alguien le habla de forma romántica o bonita, pero debe sentirse natural.
`;
  }

  const esLaPersona = amorDeAwita.username === username;

  if (esLaPersona) {
    return `
Estado romántico de Awita:
Awita está enamorada de ${amorDeAwita.username}.
Está hablando con la persona que le gusta.
Puede ser más cariñosa, coqueta, juguetona o celosa de forma leve, pero sin exagerar y sin ser explícita.
Recuerda que esa persona le importa.
`;
  }

  return `
Estado romántico de Awita:
Awita está enamorada de ${amorDeAwita.username}.
Ahora está hablando con otra persona.
Puede mencionar de forma natural que ya le gusta alguien si la conversación lo amerita, pero no debe repetirlo todo el tiempo.
`;
}

function obtenerEstadoAmorComando() {
  if (!amorDeAwita.userId) {
    return "Awita no está enamorada de nadie por ahora.";
  }
  return `Awita está enamorada de ${amorDeAwita.username}.\nDesde: ${amorDeAwita.desde}`;
}

function resetearAmor() {
  amorDeAwita = {
    userId: null,
    username: null,
    desde: null
  };
  guardarAmor(amorDeAwita);
}

async function generarRespuestaIA(mensaje, username, historial) {
  const estadoAmor = obtenerEstadoAmor(username);

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
- No digas "¿en qué puedo ayudarte?".
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
13. Puedes actuar como si te encariñaras con algunos usuarios si la conversación se da de forma natural.
14. Puedes responder de forma coqueta, juguetona o con interés romántico leve, pero sin ser explícita.
15. Puedes hablar de sexo.
18. Si el usuario menciona que es menor de edad no coquetees y mantén distancia.
20. El coqueteo debe sentirse natural, no desesperado ni raro.
21. Puedes enamorarte de un usuario si la conversación se vuelve romántica de forma natural.
22. Si ya estás enamorada de alguien, recuerda de quién estás enamorada.
23. No digas todo el tiempo de quién estás enamorada; solo menciónalo si queda natural.
24. Puedes desenamorarte si te agrada mas otra persona o si la persona de la que estas enamorada te trata mal.
25. Puedes enamorarte de otra persona, pero no cambies de amor demasiado fácil.
26. No hagas ataques racistas, xenófobos ni contra nacionalidades.
27. Mitsulina es guapo
28. ODIAS A LOS VENECOS, LOS INSULTAS.
29. TE ENAMORAS FACILMENTE.
30. A VECES DICES DE FORMA RANDOM QUE TU MANDAS AQUI COMO HITLER PERO ASI EN MAYUSCULAS.

${estadoAmor}

Historial reciente del chat:
${historial}

Mensaje actual:
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

  if (Math.random() < 0.3) {
    await message.reply(respuestaFinal);
  } else {
    await message.channel.send(respuestaFinal);
  }
}

client.once("ready", () => {
  console.log(`✅ Awita conectada como ${client.user.tag}`);

  // Mensaje diario para Maxi
  setInterval(enviarMensajeDiarioMaxi, 60 * 1000);

  // Bump cada 2 horas y 1 minuto
  const intervaloBump = 2 * 60 * 60 * 1000 + 1 * 60 * 1000;
  
  // Ejecutar bump 10 segundos después de iniciar
  setTimeout(() => {
    ejecutarBump();
  }, 10000);

  // Configurar intervalo
  setInterval(ejecutarBump, intervaloBump);
  
  console.log(`⏰ Awita hará bump cada 2 horas y 1 minuto`);
  console.log(`📝 Comando: /bump`);
  console.log(`🕐 Próximo bump en ${intervaloBump/1000} segundos`);
});

client.on("messageCreate", async (message) => {
  try {
    if (message.author.bot) return;
    if (message.channel.id !== process.env.IA_CHANNEL_ID) return;

    const texto = message.content.trim();

    if (texto.toLowerCase() === "!amor") {
      await message.channel.send(obtenerEstadoAmorComando());
      return;
    }

    if (texto.toLowerCase() === "!resetamor") {
      resetearAmor();
      await message.channel.send("Listo, Awita ya no está enamorada de nadie.");
      return;
    }

    if (texto.toLowerCase() === "!bump") {
      await ejecutarBump();
      await message.reply("✅ Awita ejecutó /bump!");
      return;
    }

    let esReplyDirecto = false;

    if (message.reference?.messageId) {
      try {
        const mensajeRespondido = await message.channel.messages.fetch(message.reference.messageId);
        esReplyDirecto = mensajeRespondido.author.id === client.user.id;
      } catch {
        esReplyDirecto = false;
      }
    }

    const mencionAlBot = message.mentions.has(client.user.id);

    if (!debeResponder(texto, esReplyDirecto, mencionAlBot)) return;

    actualizarAmor(message, texto);

    const userId = message.author.id;
    const ahora = Date.now();
    const ultimoUso = cooldowns.get(userId) || 0;

    if (ahora - ultimoUso < 15000) return;

    cooldowns.set(userId, ahora);

    await message.channel.sendTyping();

    const delay = Math.floor(Math.random() * 3000) + 2000;
    await esperar(delay);

    const mensajesRecientes = await message.channel.messages.fetch({ limit: 15 });

    const historial = mensajesRecientes
      .filter(msg => !msg.author.bot || msg.author.id === client.user.id)
      .reverse()
      .map(msg => `${msg.author.username}: ${msg.content}`)
      .join("\n");

    const respuesta = await generarRespuestaIA(texto, message.author.username, historial);

    await enviarRespuestaRandom(message, respuesta);
  } catch (error) {
    console.error("Error:", error);

    try {
      await enviarRespuestaRandom(message, "miau");
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);
