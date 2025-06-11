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
  origin: ["http://localhost:5174", "https://peduli-sehat.vercel.app"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.use(express.json());

// Sajikan file statis dari direktori saat ini
app.use(express.static("."));

// Dapatkan daftar gejala
app.get("/symptoms", async (req, res) => {
  try {
    console.log("Membaca gejala dari selected_gejala_v2.json");
    const data = await fs.readFile("selected_gejala_v2.json", "utf8");
    const symptoms = JSON.parse(data);
    console.log(`Ditemukan ${symptoms.length} gejala`);
    res.json({
      success: true,
      symptoms: symptoms,
    });
  } catch (error) {
    console.error("Error membaca gejala:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Lakukan prediksi
app.post("/predict", async (req, res) => {
  const symptoms = req.body.symptoms;
  if (!symptoms || !Array.isArray(symptoms)) {
    return res.status(400).json({
      success: false,
      error: "Data gejala tidak valid",
    });
  }

  try {
    await fs.writeFile("temp_input.json", JSON.stringify(symptoms));

    const python = spawn(pythonPath, ["predict.py"]);
    let dataString = "";
    let errorString = "";

    python.stdout.on("data", (data) => {
      dataString += data.toString();
    });

    python.stderr.on("data", (data) => {
      console.error(`Error Python: ${data}`);
      errorString += data.toString();
    });

    python.on("close", (code) => {
      try {
        // Hanya coba hapus jika file ada
        fs.access("temp_input.json")
          .then(() => fs.unlink("temp_input.json"))
          .catch(() => {}); // Abaikan jika file tidak ada

        if (code !== 0) {
          console.error("Proses Python keluar dengan kode:", code);
          console.error("Output error:", errorString);
          return res.status(500).json({
            success: false,
            error: "Error menjalankan script prediksi",
          });
        }

        const result = JSON.parse(dataString);
        res.json(result);
      } catch (error) {
        console.error("Error memproses hasil:", error);
        res.status(500).json({
          success: false,
          error: "Error memproses hasil prediksi",
        });
      }
    });
  } catch (error) {
    console.error("Error server:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Mulai server
app.listen(port, () => {
  console.log(`Server berjalan di port ${port}`);
  console.log("Menggunakan Python dari:", pythonPath);
  console.log("Pastikan Anda memiliki semua file yang diperlukan:");
  console.log("- train1_model_v2.joblib");
  console.log("- label_train_v2.joblib");
  console.log("- selected_gejala_v2.json");
});
