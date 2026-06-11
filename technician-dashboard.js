// Supabase client (v2)

  <!-- Supabase v2 -->
 import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

const supabase = window.supabase.createClient(
  "https://iazvpykfdckpffhakncd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhenZweWtmZGNrcGZmaGFrbmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNzA0MTEsImV4cCI6MjA5NTg0NjQxMX0.OOXhS1zLez30isOszxP0XOIyndpJq2jwqE90eY649bA"
);

let TECH_ID = null;
let mapInstance = null;

// Toast
function showToast(msg, ms = 2500) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), ms);
}

// Loader
function setLoaderVisible(visible) {
  const loader = document.getElementById("loader");
  if (!loader) return;
  visible ? loader.classList.remove("hidden") : loader.classList.add("hidden");
}

// Sidebar
function setupSidebar() {
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  const openBtn = document.getElementById("sidebarOpenBtn");
  const closeBtn = document.getElementById("sidebarCloseBtn");

  const open = () => {
    sidebar.classList.add("open");
    backdrop.classList.add("show");
  };
  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");
  };

  openBtn?.addEventListener("click", open);
  closeBtn?.addEventListener("click", close);
  backdrop?.addEventListener("click", close);
}

// Panel switching (FIXED)
function setupPanels() {
  const links = document.querySelectorAll(".nav-link");
  const panels = document.querySelectorAll(".panel");
  const titleEl = document.getElementById("topbarTitle");
  const sidebar = document.getElementById("sidebar");
  const backdrop = document.getElementById("sidebarBackdrop");

  links.forEach(link => {
    link.addEventListener("click", () => {
      const panelId = link.getAttribute("data-panel");
      if (!panelId) return;

      // Switch nav active
      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      // Switch panel active
      panels.forEach(p => p.classList.remove("active"));
      document.getElementById(panelId)?.classList.add("active");

      // Update topbar title
      titleEl.textContent = link.textContent.trim();

      // Close sidebar on mobile AFTER switching
      sidebar.classList.remove("open");
      backdrop.classList.remove("show");

      // Load map only when needed
      if (panelId === "panel-map") initMap();
    });
  });
}

// Mapbox
function initMap() {
  if (mapInstance) return;

  mapboxgl.accessToken = "pk.eyJ1IjoicGx1c2gtaW50ZW50aW9ucyIsImEiOiJjbXA5ejJlcGwwMzQxMnJwdXBpZTg5NmYxIn0.i0wFsO5_bt70k942AsMNcg";

  mapInstance = new mapboxgl.Map({
    container: "mapbox",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-82.18, 41.45],
    zoom: 10
  });
}

// Load user
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}

// Load assigned jobs
async function loadAssignedJobs() {
  if (!TECH_ID) return;

  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("assigned_to", TECH_ID)
    .order("created_at", { ascending: false });

  const grid = document.getElementById("assignedJobsGrid");
  grid.innerHTML = "";

  if (error || !data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No assigned jobs.</p></div>`;
  } else {
    data.forEach(job => grid.appendChild(renderJobCard(job, true)));
  }

  const count = data?.length || 0;
  document.getElementById("statAssigned").textContent = count;
  document.getElementById("msbAssigned").textContent = count;

  const badge = document.getElementById("badgeAssigned");
  if (badge) {
    count > 0 ? (badge.textContent = count, badge.classList.add("show")) : badge.classList.remove("show");
  }
}

// Load available jobs
async function loadAvailableJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .is("assigned_to", null)
    .order("created_at", { ascending: false });

  const grid = document.getElementById("availableJobsGrid");
  grid.innerHTML = "";

  if (error || !data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No available jobs.</p></div>`;
  } else {
    data.forEach(job => grid.appendChild(renderJobCard(job, false)));
  }

  const count = data?.length || 0;
  document.getElementById("statAvailable").textContent = count;
  document.getElementById("msbAvailable").textContent = count;

  const badge = document.getElementById("badgeAvailable");
  if (badge) {
    count > 0 ? (badge.textContent = count, badge.classList.add("show")) : badge.classList.remove("show");
  }
}

// Render job card
function renderJobCard(job, isAssigned) {
  const card = document.createElement("div");
  card.className = "card";

  const statusClass =
    job.status === "completed" ? "badge-completed" :
    job.status === "in_progress" ? "badge-in_progress" :
    "badge-assigned";

  card.innerHTML = `
    <div class="card-top">
      <div>
        <div class="card-title">${job.title || "Job #" + job.id}</div>
        <div class="card-sub">${job.customer_name || ""}</div>
      </div>
      <span class="badge ${statusClass}">${(job.status || "").replace("_", " ")}</span>
    </div>

    <div class="card-body">
      <span>${job.description || ""}</span>
      <span>${job.address || ""}</span>
      <span>${job.scheduled_time ? new Date(job.scheduled_time).toLocaleString() : ""}</span>
      <span>${job.price ? "$" + job.price.toFixed(2) : ""}</span>
    </div>

    <div class="card-actions"></div>
  `;

  const actions = card.querySelector(".card-actions");

  if (isAssigned) {
    if (job.status === "assigned") {
      const btn = document.createElement("button");
      btn.className = "btn-sm btn-success";
      btn.textContent = "Check In";
      btn.onclick = () => checkIn(job.id);
      actions.appendChild(btn);
    }
    if (job.status === "in_progress") {
      const btn = document.createElement("button");
      btn.className = "btn-sm btn-primary";
      btn.textContent = "Complete";
      btn.onclick = () => completeJob(job.id);
      actions.appendChild(btn);
    }
  } else {
    const accept = document.createElement("button");
    accept.className = "btn-sm btn-success";
    accept.textContent = "Accept";
    accept.onclick = () => acceptJob(job.id);

    const decline = document.createElement("button");
    decline.className = "btn-sm btn-outline";
    decline.textContent = "Decline";
    decline.onclick = () => declineJob(job.id);

    actions.appendChild(accept);
    actions.appendChild(decline);
  }

  return card;
}

// Job actions
async function acceptJob(jobId) {
  if (!TECH_ID) return;

  await supabase.from("jobs").update({
    assigned_to: TECH_ID,
    status: "assigned"
  }).eq("id", jobId);

  await supabase.from("job_requests").insert({
    job_id: jobId,
    technician_id: TECH_ID
  });

  showToast("Job accepted");
  loadAssignedJobs();
  loadAvailableJobs();
}

async function declineJob(jobId) {
  if (!TECH_ID) return;

  await supabase.from("job_declines").insert({
    job_id: jobId,
    technician_id: TECH_ID
  });

  showToast("Job declined");
  loadAvailableJobs();
}

async function checkIn(jobId) {
  await supabase.from("jobs").update({
    status: "in_progress",
    check_in_time: new Date().toISOString()
  }).eq("id", jobId);

  showToast("Checked in");
  loadAssignedJobs();
}

async function completeJob(jobId) {
  await supabase.from("jobs").update({
    status: "completed",
    completed_time: new Date().toISOString()
  }).eq("id", jobId);

  showToast("Job completed");
  loadAssignedJobs();
  loadEarnings();
}

// Earnings
async function loadEarnings() {
  if (!TECH_ID) return;

  const { data } = await supabase
    .from("jobs")
    .select("price, completed_time")
    .eq("assigned_to", TECH_ID)
    .eq("status", "completed");

  let today = 0, week = 0, month = 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  (data || []).forEach(job => {
    if (!job.price || !job.completed_time) return;

    const completed = new Date(job.completed_time);

    if (completed.toDateString() === now.toDateString()) today += job.price;
    if (completed >= weekAgo) week += job.price;
    if (completed.getMonth() === now.getMonth()) month += job.price;
  });

  const fmt = v => "$" + v.toFixed(2);

  document.getElementById("earnToday").textContent = fmt(today);
  document.getElementById("earnWeek").textContent = fmt(week);
  document.getElementById("earnMonth").textContent = fmt(month);

  document.getElementById("dashToday").textContent = fmt(today);
  document.getElementById("dashWeek").textContent = fmt(week);
  document.getElementById("dashMonth").textContent = fmt(month);
}

// Realtime
function subscribeJobs() {
  supabase
    .channel("jobs-tech")
    .on("postgres_changes", { event: "*", schema: "public", table: "jobs" }, () => {
      loadAssignedJobs();
      loadAvailableJobs();
      loadEarnings();
    })
    .subscribe();
}

// Sign out
function setupSignOut() {
  document.getElementById("btnSignOut")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
  });
}

// Refresh
function setupRefresh() {
  document.getElementById("btnRefresh")?.addEventListener("click", () => {
    loadAssignedJobs();
    loadAvailableJobs();
    loadEarnings();
    showToast("Refreshed");
  });
}

// Boot
async function boot() {
  setLoaderVisible(true);

  setupSidebar();
  setupPanels();
  setupSignOut();
  setupRefresh();

  const user = await loadUser();
  if (!user) {
    setLoaderVisible(false);
    window.location.href = "/login.html";
    return;
  }

  TECH_ID = user.id;
  document.getElementById("signedInEmail").textContent = user.email || "";

  await Promise.all([
    loadAssignedJobs(),
    loadAvailableJobs(),
    loadEarnings()
  ]);

  subscribeJobs();
  setLoaderVisible(false);
}

document.addEventListener("DOMContentLoaded", boot);
