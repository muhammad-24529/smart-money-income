const http = require("http");

const secret = "my-super-secret-daily-income-2026";

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/investments/daily-income",
  method: "POST",
  headers: {
    Authorization: `Bearer ${secret}`,
  },
};

const req = http.request(options, (res) => {
  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    console.log(`Status: ${res.statusCode}`);
    console.log(data);
  });
});

req.on("error", (error) => {
  console.error("Daily income request failed:", error.message);
});

req.end();