
// Supabase client (v2)
const supabase = window.supabase.createClient(
  "https://iazvpykfdckpffhakncd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhenZweWtmZGNrcGZmaGFrbmNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyNzA0MTEsImV4cCI6MjA5NTg0NjQxMX0.OOXhS1zLez30isOszxP0XOIyndpJq2jwqE90eY649bA"
);

let TECH_ID = null;
let mapInstance = null;

// UI helpers
function showToast(msg, ms = 2500) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), ms);
}

function setLoaderVisible(visible) {
  const loader = document.getElementById("loader");
  if (!loader) return;
  if (visible) loader.classList.remove("hidden");
  else loader.classList.add("hidden");
}

// Sidebar logic
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

// Panel switching
function setupPanels() {
  const links = document.querySelectorAll(".nav-link");
  const panels = document.querySelectorAll(".panel");
  const titleEl = document.getElementById("topbarTitle");

  links.forEach(link => {
    link.addEventListener("click", () => {
      const panelId = link.getAttribute("data-panel");
      if (!panelId) return;

      links.forEach(l => l.classList.remove("active"));
      link.classList.add("active");

      panels.forEach(p => p.classList.remove("active"));
      document.getElementById(panelId)?.classList.add("active");

      const label = link.textContent.trim();
      if (titleEl) titleEl.textContent = label;

      if (panelId === "panel-map") initMap();
    });
  });
}

// Mapbox
function initMap() {
  if (mapInstance) return;
  const container = document.getElementById("mapbox");
  if (!container) return;

  mapboxgl.accessToken = "pk.eyJ1IjoicGx1c2gtaW50ZW50aW9ucyIsImEiOiJjbXA5ejJlcGwwMzQxMnJwdXBpZTg5NmYxIn0.i0wFsO5_bt70k942AsMNcg";

  mapInstance = new mapboxgl.Map({
    container: "mapbox",
    style: "mapbox://styles/mapbox/dark-v11",
    center: [-82.18, 41.45],
    zoom: 10
  });
}

// Data loading
async function loadUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error(error);
    showToast("Auth error");
    return null;
  }
  return data.user;
}

async function loadAssignedJobs() {
  if (!TECH_ID) return;
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .eq("assigned_to", TECH_ID)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Error loading assigned jobs");
    return;
  }

  const grid = document.getElementById("assignedJobsGrid");
  grid.innerHTML = "";

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No assigned jobs.</p></div>`;
  } else {
    data.forEach(job => {
      grid.appendChild(renderJobCard(job, true));
    });
  }

  const count = data?.length || 0;
  document.getElementById("statAssigned").textContent = count;
  document.getElementById("msbAssigned").textContent = count;
  const badge = document.getElementById("badgeAssigned");
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.add("show");
    } else {
      badge.classList.remove("show");
    }
  }
}

async function loadAvailableJobs() {
  const { data, error } = await supabase
    .from("jobs")
    .select("*")
    .is("assigned_to", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    showToast("Error loading available jobs");
    return;
  }

  const grid = document.getElementById("availableJobsGrid");
  grid.innerHTML = "";

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><p>No available jobs.</p></div>`;
  } else {
    data.forEach(job => {
      grid.appendChild(renderJobCard(job, false));
    });
  }

  const count = data?.length || 0;
  document.getElementById("statAvailable").textContent = count;
  document.getElementById("msbAvailable").textContent = count;
  const badge = document.getElementById("badgeAvailable");
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.classList.add("show");
    } else {
      badge.classList.remove("show");
    }
  }
}

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
      const btnCheckIn = document.createElement("button");
      btnCheckIn.className = "btn-sm btn-success";
      btnCheckIn.textContent = "Check In";
      btnCheckIn.onclick = () => checkIn(job.id);
      actions.appendChild(btnCheckIn);
    }
    if (job.status === "in_progress") {
      const btnComplete = document.createElement("button");
      btnComplete.className = "btn-sm btn-primary";
      btnComplete.textContent = "Complete";
      btnComplete.onclick = () => completeJob(job.id);
      actions.appendChild(btnComplete);
    }
  } else {
    const btnAccept = document.createElement("button");
    btnAccept.className = "btn-sm btn-success";
    btnAccept.textContent = "Accept";
    btnAccept.onclick = () => acceptJob(job.id);

    const btnDecline = document.createElement("button");
    btnDecline.className = "btn-sm btn-outline";
    btnDecline.textContent = "Decline";
    btnDecline.onclick = () => declineJob(job.id);

    actions.appendChild(btnAccept);
    actions.appendChild(btnDecline);
  }

  return card;
}

// Job actions
async function acceptJob(jobId) {
  if (!TECH_ID) return;
  const { error } = await supabase
    .from("jobs")
    .update({ assigned_to: TECH_ID, status: "assigned" })
    .eq("id", jobId);

  if (error) {
    console.error(error);
    showToast("Error accepting job");
    return;
  }

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
  const { error } = await supabase
    .from("job_declines")
    .insert({ job_id: jobId, technician_id: TECH_ID });

  if (error) {
    console.error(error);
    showToast("Error declining job");
    return;
  }

  showToast("Job declined");
  loadAvailableJobs();
}

async function checkIn(jobId) {
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "in_progress",
      check_in_time: new Date().toISOString()
    })
    .eq("id", jobId);

  if (error) {
    console.error(error);
    showToast("Error checking in");
    return;
  }

  showToast("Checked in");
  loadAssignedJobs();
}

async function completeJob(jobId) {
  const { error } = await supabase
    .from("jobs")
    .update({
      status: "completed",
      completed_time: new Date().toISOString()
    })
    .eq("id", jobId);

  if (error) {
    console.error(error);
    showToast("Error completing job");
    return;
  }

  showToast("Job completed");
  loadAssignedJobs();
  loadEarnings();
}

// Earnings
async function loadEarnings() {
  if (!TECH_ID) return;
  const { data, error } = await supabase
    .from("jobs")
    .select("price, completed_time")
    .eq("assigned_to", TECH_ID)
    .eq("status", "completed");

  if (error) {
    console.error(error);
    showToast("Error loading earnings");
    return;
  }

  let today = 0, week = 0, month = 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);

  (data || []).forEach(job => {
    if (!job.price || !job.completed_time) return;
    const completed = new Date(job.completed_time);

    if (completed.toDateString() === now.toDateString()) today += job.price;
    if (completed >= weekAgo) week += job.price;
    if (completed.getMonth() === now.getMonth() && completed.getFullYear() === now.getFullYear()) {
      month += job.price;
    }
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
  const btn = document.getElementById("btnSignOut");
  btn?.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "/login.html";
  });
}

// Refresh button
function setupRefresh() {
  const btn = document.getElementById("btnRefresh");
  btn?.addEventListener("click", () => {
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
  const emailEl = document.getElementById("signedInEmail");
  if (emailEl) emailEl.textContent = user.email || "";

  await Promise.all([
    loadAssignedJobs(),
    loadAvailableJobs(),
    loadEarnings()
  ]);

  subscribeJobs();
  setLoaderVisible(false);
}

links.forEach(link => {
  link.addEventListener("click", () => {
    const panelId = link.getAttribute("data-panel");
    if (!panelId) return;

    // Switch active nav link
    links.forEach(l => l.classList.remove("active"));
    link.classList.add("active");

    // Switch active panel
    panels.forEach(p => p.classList.remove("active"));
    document.getElementById(panelId)?.classList.add("active");

    // Update topbar title
    titleEl.textContent = link.textContent.trim();

    // Close sidebar on mobile
    sidebar.classList.remove("open");
    backdrop.classList.remove("show");

    // Load map if needed
    if (panelId === "panel-map") initMap();
  });
});


document.addEventListener("DOMContentLoaded", boot);
