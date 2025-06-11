const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Detect Python command based on platform and environment
const getPythonCommand = () => {
  if (process.env.NODE_ENV === "production") {
    return "/opt/venv/bin/python3"; // Use venv Python in production
  } else {
    return process.platform === "win32" ? "python" : "python3";
  }
};

const pythonPath = getPythonCommand();

// Enable CORS for all routes
app.use(cors());

// Add headers before the routes are defined
app.use(function (req, res, next) {
  // Website you wish to allow to connect
  res.setHeader("Access-Control-Allow-Origin", "*");

  // Request methods you wish to allow
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, OPTIONS, PUT, PATCH, DELETE"
  );

  // Request headers you wish to allow
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Set to true if you need the website to include cookies in the requests sent
  // to the API (e.g. in case you use sessions)
  res.setHeader("Access-Control-Allow-Credentials", "true");

  // Handle OPTIONS method
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(express.json());

// Sajikan file statis dari direktori saat ini
app.use(express.static("."));

// Get available symptoms
app.get("/symptoms", async (req, res) => {
  try {
    const symptoms = await fs.readFile(
      path.join(__dirname, "selected_gejala_v2.json"),
      "utf8"
    );
    res.json({
      success: true,
      symptoms: JSON.parse(symptoms),
    });
  } catch (error) {
    console.error("Error reading symptoms:", error);
    res.status(500).json({
      success: false,
      error: "Gagal memuat daftar gejala",
    });
  }
});

// Predict disease
app.post("/predict", async (req, res) => {
  try {
    console.log("Received prediction request with body:", req.body);
    const { symptoms } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      console.log("Invalid symptoms input:", symptoms);
      return res.status(400).json({
        success: false,
        error: "Input gejala tidak valid",
      });
    }

    console.log("Processing symptoms:", symptoms);
    console.log("Using Python command:", pythonPath);

    const pythonProcess = spawn(pythonPath, [
      path.join(__dirname, "predict.py"),
      JSON.stringify(symptoms),
    ]);

    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      console.log("Python process output:", data.toString());
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      console.error("Python process error output:", data.toString());
      error += data.toString();
    });

    pythonProcess.on("error", (err) => {
      console.error("Failed to start Python process:", err);
      res.status(500).json({
        success: false,
        error: "Gagal menjalankan proses prediksi",
        details: err.message,
      });
    });

    pythonProcess.on("close", (code) => {
      console.log("Python process exited with code:", code);
      if (code !== 0) {
        console.error("Python process error:", error);
        return res.status(500).json({
          success: false,
          error: "Gagal memproses prediksi",
          details: error,
        });
      }

      try {
        console.log("Raw prediction result:", result);
        const prediction = JSON.parse(result);
        console.log("Parsed prediction:", prediction);
        res.json({
          success: true,
          prediction: prediction.disease,
          confidence: prediction.confidence,
        });
      } catch (e) {
        console.error("Error parsing prediction result:", e);
        res.status(500).json({
          success: false,
          error: "Gagal memproses hasil prediksi",
          details: e.message,
        });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan pada server",
      details: error.message,
    });
  }
});

// Mulai server
app.listen(port, () => {
  console.log(`ML Service running on port ${port}`);
  console.log("Menggunakan Python dari:", pythonPath);
  console.log("Pastikan Anda memiliki semua file yang diperlukan:");
  console.log("- train1_model_v2.joblib");
  console.log("- label_train_v2.joblib");
  console.log("- selected_gejala_v2.json");
});
