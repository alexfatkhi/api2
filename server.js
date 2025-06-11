const express = require("express");
const cors = require("cors");
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// Use 'python3' in production, 'python' in development
const pythonPath = process.env.NODE_ENV === "production" ? "python3" : "python";

// Konfigurasi CORS
const corsOptions = {
  origin: [
    "http://localhost:5174",
    "http://localhost:5173",
    "https://peduli-sehat.vercel.app",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
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
    const { symptoms } = req.body;

    if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Input gejala tidak valid",
      });
    }

    const pythonProcess = spawn(pythonPath, [
      "predict.py",
      JSON.stringify(symptoms),
    ]);
    let result = "";
    let error = "";

    pythonProcess.stdout.on("data", (data) => {
      result += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      error += data.toString();
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error("Python process error:", error);
        return res.status(500).json({
          success: false,
          error: "Gagal memproses prediksi",
        });
      }

      try {
        const prediction = JSON.parse(result);
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
        });
      }
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      error: "Terjadi kesalahan pada server",
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
