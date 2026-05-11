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

/* FILE SELECT */
dropZone.addEventListener("click", () => {
  fileInput.value = "";
  fileInput.click();
});

dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
  dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropZone.classList.remove("dragover");
  fileInput.files = e.dataTransfer.files;
  showFile();
});

fileInput.addEventListener("change", showFile);

function showFile() {
  const file = fileInput.files[0];
  if (!file) return;

  if (!file.name.toLowerCase().endsWith(".docx")) {
    alert("Only DOCX files are allowed.");
    fileInput.value = "";
    fileName.innerHTML = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("File must be below 10MB");
    fileInput.value = "";
    fileName.innerHTML = "";
    return;
  }

  fileName.innerHTML = `<strong>Selected:</strong> ${file.name}`;
  downloadBtn.style.display = "none";
}

/* UPLOAD */
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const file = fileInput.files[0];
  if (!file) return alert("Select a DOCX file");

  submitBtn.disabled = true;
  submitBtn.innerText = "Converting...";

  const formData = new FormData();
  formData.append("word", file);

  const xhr = new XMLHttpRequest();
  xhr.open("POST", "/docxtopdf", true);
  xhr.responseType = "blob";

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
        return;
      }

      current++;
      progressBar.value = current;
      loadingText.innerText = `Uploading... ${current}%`;
    }, 10);
  };

  xhr.onload = () => {

    loading.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "Convert to PDF";

    dropZone.classList.remove("uploading");
    progressBar.style.display = "none";

    loadingText.innerText = "Uploading...";

    if (xhr.status !== 200) {
      alert("Server error during conversion");
      return;
    }

    const blob = xhr.response;

    if (!blob || blob.size === 0) {
      alert("Empty PDF received");
      return;
    }

    const url = URL.createObjectURL(blob);
    const name = file.name.replace(/\.docx$/i, ".pdf");

    downloadBtn.href = url;
    downloadBtn.download = name;
    downloadBtn.style.display = "inline-block";

    success.style.display = "block";
    setTimeout(() => success.style.display = "none", 2500);
  };

  xhr.onerror = () => {
    loading.style.display = "none";
    submitBtn.disabled = false;
    submitBtn.innerText = "Convert to PDF";
    dropZone.classList.remove("uploading");
    progressBar.style.display = "none";
    alert("Network error");
  };

  xhr.send(formData);
});