const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const pool = require("./db");

const app = express();
const PORT = 3000;

// 🔧 Configuración
const PIXEL_ID = '';
const ACCESS_TOKEN = '';
const VERIFY_TOKEN = "";

// ✅ Verificación del Webhook
app.get("/facebook/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verificado correctamente.");
    res.status(200).send(challenge);
  } else {
    console.log("❌ Verificación fallida.");
    res.sendStatus(403);
  }
});