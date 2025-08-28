const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
// const pool = require("./db");
const PORT = process.env.PORT || 3000;

const app = express();

// 🔧 Configuración
const PIXEL_ID = '';
const ACCESS_TOKEN = 'EAAO5UqGn1ZB0BPVserklJoUS8ZBmusJBxGZAZCw5MCZCT6M7z51mQNKa6QKauzVBCBFWg2qBPTBx0S2A4dm1kqHjmZBBkInQyZBrCGAahVLE2cw9G8RShaJ3MjZCC40kXZAtfxZAZBOZA0MhyX3L0becfHm6J0Q4bmxqHKyirnDyxQjvxWyHk5cCX8EofxX4XBo1Q1qDrwZDZD';
const VERIFY_TOKEN = "capiHolosToken";

// ✅ Verificación del Webhook
app.get("/wstp/Holos", (req, res) => {
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