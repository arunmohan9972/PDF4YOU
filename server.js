const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const os = require("os");

const libre = require("libreoffice-convert");

const helmet = require("helmet");
const compression = require("compression");
const cors = require("cors");

const rateLimit = require("express-rate-limit");

const app = express();

const PORT = process.env.PORT || 3000;

/* =========================
   SECURITY
========================= */

app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        upgradeInsecureRequests: null
      }
    }
  })
);

app.use(cors());

app.use(compression());

/* =========================
   RATE LIMITING
========================= */

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000
  })
);

/* =========================
   STATIC FILES
========================= */

app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: "1d"
  })
);

/* =========================
   MULTER CONFIG
========================= */

const upload = multer({
  dest: os.tmpdir(),

  limits: {
    fileSize: 10 * 1024 * 1024
  },

  fileFilter: (req, file, cb) => {

    const allowedMime =
      file.mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    const allowedExt =
      path.extname(file.originalname).toLowerCase() === ".docx";

    if (!allowedMime || !allowedExt) {
      return cb(new Error("Only DOCX allowed"));
    }

    cb(null, true);
  }
});

/* =========================
   HEALTH CHECK
========================= */

app.get("/health", (req, res) => {
  res.json({
    status: "online",
    service: "PDF4YOU"
  });
});

/* =========================
   DOCX → PDF
========================= */

app.post("/docxtopdf", upload.single("word"), (req, res) => {

  if (!req.file) {
    return res.status(400).send("No file uploaded");
  }

  const inputPath = req.file.path;

  const outputPath = path.join(
    os.tmpdir(),
    `${Date.now()}.pdf`
  );

  res.on("finish", cleanup);
  res.on("close", cleanup);

  try {

    const fileBuffer = fs.readFileSync(inputPath);

    libre.convert(
      fileBuffer,
      ".pdf",
      undefined,
      (err, done) => {

        if (err) {

          console.error("LibreOffice conversion error:", err);

          cleanup();

          return res.status(500).send("Conversion failed");
        }

        fs.writeFileSync(outputPath, done);

        res.download(outputPath, "converted.pdf");
      }
    );

  } catch (err) {

    console.error("Server error:", err);

    cleanup();

    return res.status(500).send("Server error");
  }

  function cleanup() {

    try {

      if (fs.existsSync(inputPath)) {
        fs.unlinkSync(inputPath);
      }

      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

    } catch (e) {

      console.error("Cleanup error:", e);
    }
  }
});

/* =========================
   ERROR HANDLER
========================= */

app.use((err, req, res, next) => {

  console.error(err);

  if (err.message === "Only DOCX allowed") {
    return res.status(400).send("Only DOCX files allowed");
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).send("File too large");
  }

  res.status(500).send("Server Error");
});

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {

  console.log(`Server running on http://localhost:${PORT}`);

});