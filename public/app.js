const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileName = document.getElementById("fileName");
const form = document.getElementById("uploadForm");
const progressBar = document.getElementById("progressBar");
const loading = document.getElementById("loading");
const loadingText = document.getElementById("loadingText");
const success = document.getElementById("success");
const downloadBtn = document.getElementById("downloadBtn");
const submitBtn = document.querySelector(".btn");

let animateInterval = null;
let fakeConvert = null;
let isUploading = false;

/* ORIGINAL DROP ZONE HTML (for reset) */
const defaultDropHTML = `
  <i class="fa-solid fa-cloud-arrow-up upload-icon"></i>
  <p>Drag & Drop DOCX file here</p>
  <p>or click to select</p>
  <p class="sub-text">Max size: 10MB</p>
`;

/* =========================
   CLEAR INTERVALS
========================= */
function clearAllIntervals() {
  clearInterval(animateInterval);
  clearInterval(fakeConvert);
}

/* FILE SELECT */
dropZone.addEventListener("click", () => {
  if (isUploading) return;

  fileInput.value = "";
  fileInput.click();
});

dropZone.addEventListener("dragover", (e) => {
  if (isUploading) return;

  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  if (isUploading) return;

  e.preventDefault();
  dropZone.classList.remove("dragover");

  const file = e.dataTransfer.files[0];

  if (!file) return;

  /* FILE TYPE CHECK */
  if (!file.name.toLowerCase().endsWith(".docx")) {
    alert("Only DOCX files allowed");
    return;
  }

  fileInput.files = e.dataTransfer.files;

  showFile();
});

fileInput.addEventListener("change", showFile);

/* SHOW FILE + LOCK UI */
function showFile() {
  const file = fileInput.files[0];

  if (!file) return;

  /* FIXED MIME ISSUE */
  if (!file.name.toLowerCase().endsWith(".docx")) {
    alert("Only valid DOCX files are allowed.");
    fileInput.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("File must be below 10MB");
    fileInput.value = "";
    return;
  }

  /* LOCK DROP ZONE */
  dropZone.style.pointerEvents = "none";
  dropZone.style.opacity = "0.85";

  /* SAFE FILE NAME RENDER */
  dropZone.innerHTML = `
    <i class="fa-solid fa-file-word upload-icon"></i>
    <p><strong id="safeFileName"></strong></p>
    <p class="sub-text">DOCX file selected</p>
  `;

  document.getElementById("safeFileName").textContent = file.name;

  downloadBtn.style.display = "none";
}

/* RESET DROP ZONE */
function resetDropZone() {
  dropZone.style.pointerEvents = "auto";
  dropZone.style.opacity = "1";
  dropZone.innerHTML = defaultDropHTML;

  fileInput.value = "";
}

/* UPLOAD */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  if (isUploading) return;

  const file = fileInput.files[0];

  if (!file) {
    return alert("Select a DOCX file");
  }

  isUploading = true;

  submitBtn.disabled = true;
  submitBtn.innerText = "Converting...";

  const formData = new FormData();

  formData.append("word", file);

  const xhr = new XMLHttpRequest();

  xhr.open("POST", "/docxtopdf", true);

  xhr.responseType = "blob";

  /* REQUEST TIMEOUT */
  xhr.timeout = 60000;

  loading.style.display = "flex";

  progressBar.value = 0;
  progressBar.style.display = "block";

  success.style.display = "none";

  dropZone.classList.add("uploading");

  xhr.upload.onprogress = (e) => {
    if (!e.lengthComputable) return;

    let target = Math.round((e.loaded / e.total) * 100);

    let current = progressBar.value || 0;

    clearInterval(animateInterval);

    animateInterval = setInterval(() => {
      if (current >= target) {

        clearInterval(animateInterval);

        /* FIXED PROGRESS ISSUE */
        if (target >= 100) {

          let conversionProgress = 100;

          fakeConvert = setInterval(() => {

            if (conversionProgress >= 95) {
              clearInterval(fakeConvert);
              return;
            }

            conversionProgress++;

            progressBar.value = conversionProgress;

            loadingText.innerText =
              `Converting... ${conversionProgress}%`;

          }, 120);
        }

        return;
      }

      current++;

      progressBar.value = current;

      loadingText.innerText =
        `Uploading... ${current}%`;

    }, 10);
  };

  xhr.onload = () => {

    clearAllIntervals();

    loading.style.display = "none";

    submitBtn.disabled = false;
    submitBtn.innerText = "Convert to PDF";

    dropZone.classList.remove("uploading");

    progressBar.value = 100;

    progressBar.style.display = "none";

    loadingText.innerText = "Uploading...";

    isUploading = false;

    if (xhr.status !== 200) {
      resetDropZone();
      alert("Server error during conversion");
      return;
    }

    const blob = xhr.response;

    if (!blob || blob.size === 0) {
      resetDropZone();
      alert("Empty PDF received");
      return;
    }

    const url = URL.createObjectURL(blob);

    const safeName = file.name
      .replace(/[^a-z0-9.\-_]/gi, "_")
      .replace(/\.docx$/i, ".pdf");

    downloadBtn.href = url;
    downloadBtn.download = safeName;

    downloadBtn.style.display = "inline-block";

    /* DOWNLOAD CLICK → RESET UI */
    downloadBtn.onclick = () => {

      setTimeout(() => {

        URL.revokeObjectURL(url);

        downloadBtn.style.display = "none";

        resetDropZone();

      }, 1500);
    };

    success.style.display = "block";

    setTimeout(() => {
      success.style.display = "none";
    }, 2500);
  };

  xhr.onerror = () => {

    clearAllIntervals();

    loading.style.display = "none";

    submitBtn.disabled = false;
    submitBtn.innerText = "Convert to PDF";

    dropZone.classList.remove("uploading");

    progressBar.style.display = "none";

    isUploading = false;

    resetDropZone();

    alert("Network error");
  };

  xhr.ontimeout = () => {

    clearAllIntervals();

    loading.style.display = "none";

    submitBtn.disabled = false;
    submitBtn.innerText = "Convert to PDF";

    progressBar.style.display = "none";

    isUploading = false;

    resetDropZone();

    alert("Request timed out");
  };

  xhr.send(formData);
});