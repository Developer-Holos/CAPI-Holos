const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");
const pool = require("./db");
const PORT = process.env.PORT || 3000;

const app = express();

// 🔧 Configuración
const PIXEL_ID = '';
const ACCESS_TOKEN = 'EAAO5UqGn1ZB0BPVserklJoUS8ZBmusJBxGZAZCw5MCZCT6M7z51mQNKa6QKauzVBCBFWg2qBPTBx0S2A4dm1kqHjmZBBkInQyZBrCGAahVLE2cw9G8RShaJ3MjZCC40kXZAtfxZAZBOZA0MhyX3L0becfHm6J0Q4bmxqHKyirnDyxQjvxWyHk5cCX8EofxX4XBo1Q1qDrwZDZD';
const VERIFY_TOKEN = "capiHolosToken";

// KOMMO
const PIPELINE_ID = 11867804; 
const KOMMO_WEBHOOK_URL = "https://holos.kommo.com/api/v4/leads";
const KOMMO_SECRET_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImJlNWU2ZGQxM2M3MmRmYjE3MmI2NzMwNjZlNDk5NGRkM2IwMmNhZDZhNDc0NjFjZGU1ZWM2MzQ0NGRmOTAzZGNlYjZmOTIyNzVkMjNhNTRlIn0.eyJhdWQiOiI1YmZjNjcxMC1iMDk4LTRlMjktODI5MC0yYTk5YzI3Yjc4ODEiLCJqdGkiOiJiZTVlNmRkMTNjNzJkZmIxNzJiNjczMDY2ZTQ5OTRkZDNiMDJjYWQ2YTQ3NDYxY2RlNWVjNjM0NDRkZjkwM2RjZWI2ZjkyMjc1ZDIzYTU0ZSIsImlhdCI6MTc1NjQzNjYwNCwibmJmIjoxNzU2NDM2NjA0LCJleHAiOjE5MTQxMDU2MDAsInN1YiI6IjExNjIyNjM2IiwiZ3JhbnRfdHlwZSI6IiIsImFjY291bnRfaWQiOjMwMDUzMjI1LCJiYXNlX2RvbWFpbiI6ImtvbW1vLmNvbSIsInZlcnNpb24iOjIsInNjb3BlcyI6WyJjcm0iLCJmaWxlcyIsImZpbGVzX2RlbGV0ZSIsIm5vdGlmaWNhdGlvbnMiLCJwdXNoX25vdGlmaWNhdGlvbnMiXSwidXNlcl9mbGFncyI6MSwiaGFzaF91dWlkIjoiOTFhMDRmY2UtMDlmZi00MDgxLTg3NzYtZWJlZmZhM2ZjYTg3IiwiYXBpX2RvbWFpbiI6ImFwaS1nLmtvbW1vLmNvbSJ9.p1IxPfo6o8cAt9Hlc5B_z-GdIs_Jrro-ZsmiFmhqzoeUfNgUQpZDu1OL3FwCTGawz2bkP6YBQJmcDyq44p6jceI0E8KoZ3sV1LAyn-iBAPrWB1-YM_pE_Q2QPfhKJa4gNv_W3yGkzPeENSrLasI698pYTuZ4nHnYxtoqWCvqrsz3SU8ELNfYltmYM1fut61x0OwkeZTJuW03SJ_e2IAWWV5jmEqRXiTvDOjswamaic3FGMTCb5lvVKeFR4lT-kfmvUs1HZqZXrL93VN63QF3_bI5T2XxLpt65F1B-6YTYWJx6_Pk8iMgAUaHE8wfKNymCIbAOPj3IcYuzkgrag7TcQ";


// ✅ Verificación del Webhook CAPI HOLOS
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


// ✅ Webhook de mensajes entrantes desde WhatsApp
app.post("/wstp/Holos", async (req, res) => {
  const body = req.body;

  if (body.object !== "whatsapp_business_account") return res.sendStatus(400);

  for (const entry of body.entry) {
    for (const change of entry.changes) {
      const message = change.value?.messages?.[0];
      const from = message?.from;
      const text = message?.text?.body || "";
      const name = change.value?.contacts?.[0]?.profile?.name || "Lead de WhatsApp";

      if (!from || !message) continue;

      // Solo procesamos leads con referral (clic en anuncio)
      if (message.referral?.ctwa_clid) {
        const click_id = message.referral.ctwa_clid;
        const ad_id = message.referral.source_id;

        try {
          // 1️⃣ Obtener info del anuncio desde Meta
          const url = `https://graph.facebook.com/v19.0/${ad_id}?fields=id,name,adset{id,name,campaign{id,name}}&access_token=${ACCESS_TOKEN}`;
          const fbRes = await axios.get(url);
          const adData = fbRes.data;

          const ad_info = {
            ad_id: adData.id,
            ad_name: adData.name,
            adset_id: adData.adset?.id,
            adset_name: adData.adset?.name,
            campaign_id: adData.adset?.campaign?.id,
            campaign_name: adData.adset?.campaign?.name,
          };

          // 2️⃣ Obtener métricas del anuncio (hoy)
          const metricsUrl = `https://graph.facebook.com/v23.0/${ad_id}/insights?fields=impressions,reach,spend,clicks,ctr&date_preset=today&access_token=${ACCESS_TOKEN}`;
          const metricsRes = await axios.get(metricsUrl);
          const metrics = metricsRes.data?.data?.[0] || {
            impressions: 0,
            reach: 0,
            spend: 0,
            clicks: 0,
            ctr: 0,
          };

          const today = new Date().toISOString().split("T")[0];

          // 3️⃣ Guardar o actualizar métricas por anuncio y fecha
          await pool.query(`
            INSERT INTO ads_metrics (
              ad_id, ad_name, adset_id, adset_name, campaign_id, campaign_name,
              impressions, reach, clicks, spend, ctr, date, updated_at, total_lead_value
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(), 0)
            ON CONFLICT (ad_id, date) DO UPDATE
            SET impressions = EXCLUDED.impressions,
                reach = EXCLUDED.reach,
                clicks = EXCLUDED.clicks,
                spend = EXCLUDED.spend,
                ctr = EXCLUDED.ctr,
                updated_at = NOW();
          `, [
            ad_info.ad_id,
            ad_info.ad_name,
            ad_info.adset_id,
            ad_info.adset_name,
            ad_info.campaign_id,
            ad_info.campaign_name,
            metrics.impressions,
            metrics.reach,
            metrics.clicks,
            metrics.spend,
            metrics.ctr,
            today
          ]);

          // 4️⃣ Enviar lead a Kommo
          const { lead_id, status } = await sendToKommo(name, from, click_id, ad_info, text);

          // 5️⃣ Insertar lead en leads
          const queryLead = `
            INSERT INTO leads (
              name, phone, click_id, ad_id, message, created_at, lead_id, status, lead_value
            )
            VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
            RETURNING id;
          `;
          const valuesLead = [
            name,
            from,
            click_id,
            ad_info.ad_id,
            text,
            lead_id,
            status,
            0 // lead_value inicial
          ];

          const result = await pool.query(queryLead, valuesLead);
          console.log("✅ Lead insertado con ID:", result.rows[0].id);

          // 6️⃣ Actualizar total_lead_value en ads_metrics
          await pool.query(`
            UPDATE ads_metrics
            SET total_lead_value = COALESCE((
              SELECT SUM(lead_value) FROM leads WHERE ad_id = $1
            ), 0)
            WHERE ad_id = $1;
          `, [ad_info.ad_id]);

        } catch (err) {
          console.error("❌ Error en el webhook:", err.response?.data || err.message);
        }
      } else {
        console.log("📨 Mensaje recibido sin referral. No se guardó tracking.");
      }

      console.log(`🟢 Mensaje de ${from}: ${text}`);
    }
  }

  res.sendStatus(200);
});


// ✅ Crear lead en Kommo
async function sendToKommo(name, phone, click_id, ad_info, message) {
  try {
    const contactsRes = await axios.get(`https://holos.kommo.com/api/v4/contacts?query=${phone}`,{ headers: { Authorization: `Bearer ${KOMMO_SECRET_TOKEN}` } });
    const contacts = contactsRes.data?._embedded?.contacts || [];
    let activeLead = null;
    if (contacts.length!== 0) {
      console.log("✅ Hay información del contacto");
      const withLeadsRes = await axios.get( `https://holos.kommo.com/api/v4/contacts?with=leads&query=${phone}`,{ headers: { Authorization: `Bearer ${KOMMO_SECRET_TOKEN}` } });
      const fullContacts = withLeadsRes.data?._embedded?.contacts || [];
      for (const contact of fullContacts) {
        const leads = contact._embedded?.leads || [];
        activeLead = leads.find((lead) => lead.status_id !== 142 && lead.status_id !== 143);
        if (activeLead) break;
      }
      if (activeLead) {
        const payload = {
          id: activeLead.id,
          pipeline_id: PIPELINE_ID,
          custom_fields_values: [
            { field_id: 797807, values: [{ value: click_id }] }, // Click ID
            { field_id: 797809, values: [{ value: ad_info.campaign_name }] },
            { field_id: 797811, values: [{ value: ad_info.campaign_id }] },
            { field_id: 797813, values: [{ value: ad_info.adset_name }] },
            { field_id: 797815, values: [{ value: ad_info.adset_id }] },
            { field_id: 797817, values: [{ value: ad_info.ad_name }] },
            { field_id: 797819, values: [{ value: ad_info.ad_id }] },
            { field_id: 797821, values: [{ value: message }] }
          ]
        };
        await axios.patch(KOMMO_WEBHOOK_URL, [payload], {
          headers: {
            Authorization: `Bearer ${KOMMO_SECRET_TOKEN}`,
            "Content-Type": "application/json"
          }
        });
        console.log("✅ Lead actualizado correctamente:", activeLead.id);
        const leadDetails = await fetchLeadDetails(activeLead.id);
        const status_name = await fetchStageName(leadDetails.pipeline_id, leadDetails.status_id);

        return { lead_id: activeLead.id, status: status_name };
      } else {
        console.log("📄 Mandar a Excel: contacto sin lead activo");
        return { lead_id: null, status_id: null };
      }
    }else{
      console.log("Mandar a excel")
    }
  } catch (err) {
    console.error("❌ Error en sendToKommo:", err.response?.data || err.message);
  }
}


// LEAD GANADO
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
async function fetchLeadDetails(leadId) {
  const url = `https://holos.kommo.com/api/v4/leads/${leadId}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${KOMMO_SECRET_TOKEN}` }
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

async function fetchStageName(pipelineId, statusId) {
  const url = `https://holos.kommo.com/api/v4/leads/pipelines/${pipelineId}`;
  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${KOMMO_SECRET_TOKEN}` },
    });
    const stages = response.data?._embedded?.statuses || [];
    const stage = stages.find(s => s.id === statusId);
    return stage ? stage.name : "Etapa desconocida";
  } catch (error) {
    console.error("Error fetching stage name:", error.response?.data || error.message);
    return "Etapa desconocida";
  }
}

function getClickIdFromFields(fields = []) {
  if (!fields || !Array.isArray(fields)) return null;
  const field = fields.find(f => f.field_name === "Click ID");
  return field?.values?.[0]?.value || null;
}


app.post("/kommo/conversion", async (req, res) => {
  const leadUpdate = req.body?.leads?.status?.[0];
  if (!leadUpdate) {
    return res.sendStatus(200);
  }
  let leadDetails = null;
  leadDetails = await fetchLeadDetails(leadUpdate.id);
  console.log("Status ID recibido:", leadUpdate.status_id);
  const leadValue = leadDetails.price || 0;
  if (leadUpdate.status_id === "89830699") {
    if (!leadDetails) {
      return res.sendStatus(500);
    }
    const click_id = getClickIdFromFields(leadDetails.custom_fields_values);
    if (click_id) {
      console.log("✅ Click ID encontrado:", click_id);
      try {
        await sendMetaConversion(click_id, leadValue);
      } catch (e) {
        console.error("Error enviando conversión a Meta CAPI:", e);
      }
    } else {
      console.error("❌ No se encontró Click ID en detalles del lead");
    }
  }
  // 🔹 Obtenemos el nombre real de la etapa desde los detalles del lead
  const newStatus = await fetchStageName(leadDetails.pipeline_id, leadDetails.status_id);
  console.log(`📌 Nueva etapa: ${newStatus}`);
  const now = new Date();
   const updateQuery = `
    UPDATE leads
    SET status = $1,
        lead_value = $2,
        updated_at = $3
    WHERE lead_id = $4
    RETURNING *;
  `;
  const result = await pool.query(updateQuery, [newStatus, leadValue, now, leadUpdate.id]);
  if (result.rowCount > 0) {
    console.log(`✅ Lead ${leadUpdate.id} actualizado en BD. Nueva etapa: ${newStatus}`);
  } else {
    console.warn(`⚠️ No se encontró el lead ${leadUpdate.id} en la BD.`);
  }
  
  // 🔹 Actualizar total_lead_value en ads_metrics
  const updateMetricsQuery = `
    UPDATE ads_metrics
    SET total_lead_value = (
      SELECT COALESCE(SUM(lead_value),0)
      FROM leads
      WHERE ad_id = $1
    ),
    updated_at = NOW()
    WHERE ad_id = $1 AND date = $2
  `;
  await pool.query(updateMetricsQuery, [click_id, new Date().toISOString().split("T")[0]]);

  res.sendStatus(200);
});



// ✅ Envío a Meta CAPI
async function sendMetaConversion(click_id, leadValue) {
  const url = `https://graph.facebook.com/v23.0/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
  const eventTime = Math.floor(Date.now() / 1000);
  const page_id = "361404980388508"
  const payload = {
    data: [
      {
        action_source: "business_messaging",
        event_name: "Purchase", 
        event_time: eventTime,
        messaging_channel: "whatsapp",
        user_data: {
          ctwa_clid: click_id,  
          page_id: page_id      
        },
        custom_data: {
          currency: "PEN",
          value: leadValue
        }
      }
    ]
  };
  try {
    const response = await axios.post(url, payload);
    console.log("📈 Conversión enviada a Meta CAPI:", response.data);
  } catch (error) {
    console.error("❌ Error al enviar conversión a Meta CAPI:", error.response?.data || error.message);
  }
}

// ✅ Inicializar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
});