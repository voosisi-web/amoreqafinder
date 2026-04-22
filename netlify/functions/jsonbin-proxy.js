export async function handler(event) {
  const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;
  const QA_BIN_ID = process.env.JSONBIN_QA_BIN_ID;
  const IDS_BIN_ID = process.env.JSONBIN_IDS_BIN_ID;

  const method = event.httpMethod;

  try {
    if (method === "GET") {
      const type = event.queryStringParameters.type;

      const binId = type === "ids" ? IDS_BIN_ID : QA_BIN_ID;

      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
        headers: {
          "X-Master-Key": MASTER_KEY
        }
      });

      const data = await res.json();

      return {
        statusCode: 200,
        body: JSON.stringify(data.record)
      };
    }

    if (method === "POST") {
      const { type, payload } = JSON.parse(event.body);

      const binId = type === "ids" ? IDS_BIN_ID : QA_BIN_ID;

      const res = await fetch(`https://api.jsonbin.io/v3/b/${binId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Master-Key": MASTER_KEY
        },
        body: JSON.stringify(payload)
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ success: true })
      };
    }

    return {
      statusCode: 405,
      body: "Method Not Allowed"
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
}
