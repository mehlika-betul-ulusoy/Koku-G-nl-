const STORAGE_KEY = "scent-journal-entries";

const form = document.getElementById("entry-form");
const list = document.getElementById("entry-list");
const stats = document.getElementById("stats");
const mapCanvas = document.getElementById("map");
const mapCtx = mapCanvas.getContext("2d");

const filters = {
  text: document.getElementById("search-text"),
  mood: document.getElementById("filter-mood"),
  minRating: document.getElementById("min-rating"),
  fromDate: document.getElementById("from-date"),
  toDate: document.getElementById("to-date")
};

const entries = loadEntries();

document.getElementById("entry-date").valueAsDate = new Date();

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const entry = {
    id: crypto.randomUUID(),
    type: document.getElementById("entry-type").value,
    locationName: document.getElementById("location-name").value.trim(),
    latitude: Number(document.getElementById("latitude").value),
    longitude: Number(document.getElementById("longitude").value),
    date: document.getElementById("entry-date").value,
    mood: document.getElementById("mood").value,
    notes: document.getElementById("notes").value.trim(),
    rating: Number(document.getElementById("rating").value)
  };

  if (!isValidEntry(entry)) {
    alert("Lütfen tüm alanları geçerli değerlerle doldurun.");
    return;
  }

  entries.unshift(entry);
  persistEntries();
  form.reset();
  document.getElementById("entry-date").valueAsDate = new Date();
  refreshUI();
});

document.getElementById("use-location").addEventListener("click", () => {
  if (!navigator.geolocation) {
    alert("Tarayıcınız konum özelliğini desteklemiyor.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (position) => {
      document.getElementById("latitude").value = position.coords.latitude.toFixed(6);
      document.getElementById("longitude").value = position.coords.longitude.toFixed(6);
    },
    () => alert("Konum alınamadı.")
  );
});

Object.values(filters).forEach((input) => input.addEventListener("input", refreshUI));

refreshUI();

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function persistEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function isValidEntry(entry) {
  return (
    entry.locationName &&
    entry.notes &&
    entry.date &&
    Number.isFinite(entry.latitude) &&
    Number.isFinite(entry.longitude) &&
    entry.latitude <= 90 &&
    entry.latitude >= -90 &&
    entry.longitude <= 180 &&
    entry.longitude >= -180 &&
    entry.rating >= 1 &&
    entry.rating <= 5
  );
}

function filteredEntries() {
  const text = filters.text.value.toLowerCase().trim();
  const mood = filters.mood.value;
  const minRating = Number(filters.minRating.value || 0);
  const fromDate = filters.fromDate.value;
  const toDate = filters.toDate.value;

  return entries.filter((entry) => {
    const matchText = !text || [entry.type, entry.locationName, entry.notes].join(" ").toLowerCase().includes(text);
    const matchMood = !mood || entry.mood === mood;
    const matchRating = !minRating || entry.rating >= minRating;
    const matchFrom = !fromDate || entry.date >= fromDate;
    const matchTo = !toDate || entry.date <= toDate;
    return matchText && matchMood && matchRating && matchFrom && matchTo;
  });
}

function refreshUI() {
  const activeEntries = filteredEntries();
  renderList(activeEntries);
  renderStats(activeEntries);
  renderMap(activeEntries);
}

function renderList(activeEntries) {
  list.innerHTML = "";
  if (!activeEntries.length) {
    list.innerHTML = "<li>Kayıt bulunamadı.</li>";
    return;
  }
  for (const entry of activeEntries) {
    const item = document.createElement("li");
    item.innerHTML = `
      <strong>${escapeHtml(entry.type)} • ${escapeHtml(entry.locationName)}</strong><br/>
      ${escapeHtml(entry.date)} | ${escapeHtml(entry.mood)} | ${entry.rating}/5<br/>
      Notlar: ${escapeHtml(entry.notes)}<br/>
      Koordinat: ${entry.latitude.toFixed(4)}, ${entry.longitude.toFixed(4)}
    `;
    list.appendChild(item);
  }
}

function renderStats(activeEntries) {
  const total = activeEntries.length;
  const averageRating = total ? (activeEntries.reduce((sum, e) => sum + e.rating, 0) / total).toFixed(2) : "0.00";

  const moodCounts = {};
  const noteCounts = {};
  for (const entry of activeEntries) {
    moodCounts[entry.mood] = (moodCounts[entry.mood] || 0) + 1;
    for (const note of entry.notes.split(",").map((n) => n.trim().toLowerCase()).filter(Boolean)) {
      noteCounts[note] = (noteCounts[note] || 0) + 1;
    }
  }
  const topMood = topKey(moodCounts) || "-";
  const topNote = topKey(noteCounts) || "-";

  stats.innerHTML = `
    <li>Toplam kayıt: ${total}</li>
    <li>Ortalama puan: ${averageRating}</li>
    <li>En sık duygu: ${escapeHtml(topMood)}</li>
    <li>En sık nota: ${escapeHtml(topNote)}</li>
  `;
}

function renderMap(activeEntries) {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.fillStyle = "#d8e4ff";
  mapCtx.fillRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.strokeStyle = "#8aa0d8";
  mapCtx.strokeRect(0, 0, mapCanvas.width, mapCanvas.height);
  mapCtx.fillStyle = "#2e3f72";
  mapCtx.fillText("Mekan Bazlı Koku Haritası (lat/lon)", 8, 14);

  for (const entry of activeEntries) {
    const x = ((entry.longitude + 180) / 360) * mapCanvas.width;
    const y = ((90 - entry.latitude) / 180) * mapCanvas.height;
    mapCtx.beginPath();
    mapCtx.fillStyle = "#6236ff";
    mapCtx.arc(x, y, 4, 0, Math.PI * 2);
    mapCtx.fill();
  }
}

function topKey(record) {
  return Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
