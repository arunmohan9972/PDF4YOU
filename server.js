const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const libre = require("libreoffice-convert");

const app = express();
const PORT = 3000;

app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

/* ================= DOCX → PDF (LIBREOFFICE) ================= */
app.post("/docxtopdf", upload.single("word"), (req, res) => {

  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const inputPath = req.file.path;
  const outputPath = path.join(__dirname, "uploads", `${Date.now()}.pdf`);

  const fileBuffer = fs.readFileSync(inputPath);

  const extend = ".pdf";

  libre.convert(fileBuffer, extend, undefined, (err, done) => {

    if (err) {
      console.error("LibreOffice conversion error:", err);
      cleanup();
      return res.status(500).send("Conversion failed");
    }

    fs.writeFileSync(outputPath, done);

    res.download(outputPath, "converted.pdf", (downloadErr) => {
      if (downloadErr) {
        console.error(downloadErr);
      }
      cleanup();
    });
  });

  function cleanup() {
    try {
      if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
      if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
    } catch (e) {
      console.error("Cleanup error:", e);
    }
  }
});

/* ================= START SERVER ================= */
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});