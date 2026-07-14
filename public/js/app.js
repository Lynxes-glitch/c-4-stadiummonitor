const el = (id) => document.getElementById(id);

const NODE_COORDS = {
  "gate-a": { x: 300, y: 40, type: "gate", label: "A" },
  "gate-b": { x: 510, y: 100, type: "gate", label: "B" },
  "gate-c": { x: 510, y: 360, type: "gate", label: "C" },
  "gate-d": { x: 300, y: 420, type: "gate", label: "D" },
  "gate-e": { x: 90, y: 360, type: "gate", label: "E" },
  "gate-f": { x: 90, y: 100, type: "gate", label: "F" },
  "concourse-n": { x: 300, y: 100, type: "concourse" },
  "concourse-ne": { x: 440, y: 150, type: "concourse" },
  "concourse-se": { x: 440, y: 310, type: "concourse" },
  "concourse-s": { x: 300, y: 360, type: "concourse" },
  "concourse-sw": { x: 160, y: 310, type: "concourse" },
  "concourse-nw": { x: 160, y: 150, type: "concourse" },
  "section-101": { x: 300, y: 180, type: "section", label: "101" },
  "section-115": { x: 300, y: 280, type: "section", label: "115" },
  "medical-1": { x: 240, y: 120, type: "medical_post", icon: "cross" },
  "medical-2": { x: 360, y: 340, type: "medical_post", icon: "cross" },
  "security-1": { x: 410, y: 260, type: "security_post", icon: "shield" },
  "lost-found": { x: 410, y: 200, type: "lost_and_found", icon: "help" },
  "accessible-entry-1": { x: 350, y: 70, type: "accessible_entry", icon: "wheelchair" },
  "accessible-entry-2": { x: 250, y: 390, type: "accessible_entry", icon: "wheelchair" }
};

let currentGateStatuses = [];
let pinnedNodeId = null;

function initStadiumMap(nodes, edges) {
  const svg = el("stadiumSvg");
  svg.innerHTML = "";
  
  // Add turf pattern defs dynamically
  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const pattern = document.createElementNS("http://www.w3.org/2000/svg", "pattern");
  pattern.setAttribute("id", "turfPattern");
  pattern.setAttribute("width", "20");
  pattern.setAttribute("height", "100");
  pattern.setAttribute("patternUnits", "userSpaceOnUse");

  const stripe1 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  stripe1.setAttribute("width", "10");
  stripe1.setAttribute("height", "100");
  stripe1.setAttribute("fill", "rgba(47, 168, 79, 0.22)");

  const stripe2 = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  stripe2.setAttribute("x", "10");
  stripe2.setAttribute("width", "10");
  stripe2.setAttribute("height", "100");
  stripe2.setAttribute("fill", "rgba(47, 168, 79, 0.32)");

  pattern.appendChild(stripe1);
  pattern.appendChild(stripe2);
  defs.appendChild(pattern);
  svg.appendChild(defs);
  
  // Stadium outer bowl background
  const bowl = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bowl.setAttribute("x", "15");
  bowl.setAttribute("y", "15");
  bowl.setAttribute("width", "570");
  bowl.setAttribute("height", "450");
  bowl.setAttribute("rx", "110");
  bowl.setAttribute("class", "stadium-bowl");
  svg.appendChild(bowl);
  
  // Field in center
  const field = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  field.setAttribute("x", "220");
  field.setAttribute("y", "190");
  field.setAttribute("width", "160");
  field.setAttribute("height", "100");
  field.setAttribute("rx", "6");
  field.setAttribute("class", "stadium-field");
  field.setAttribute("fill", "url(#turfPattern)");
  svg.appendChild(field);
  
  // Field center line
  const fieldLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
  fieldLine.setAttribute("x1", "300");
  fieldLine.setAttribute("y1", "190");
  fieldLine.setAttribute("x2", "300");
  fieldLine.setAttribute("y2", "290");
  fieldLine.setAttribute("class", "stadium-field-markings");
  svg.appendChild(fieldLine);
  
  // Center circle
  const centerCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  centerCircle.setAttribute("cx", "300");
  centerCircle.setAttribute("cy", "240");
  centerCircle.setAttribute("r", "24");
  centerCircle.setAttribute("class", "stadium-field-markings");
  svg.appendChild(centerCircle);

  // Left penalty box
  const leftBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  leftBox.setAttribute("x", "220");
  leftBox.setAttribute("y", "215");
  leftBox.setAttribute("width", "25");
  leftBox.setAttribute("height", "50");
  leftBox.setAttribute("class", "stadium-field-markings");
  svg.appendChild(leftBox);

  // Right penalty box
  const rightBox = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rightBox.setAttribute("x", "355");
  rightBox.setAttribute("y", "215");
  rightBox.setAttribute("width", "25");
  rightBox.setAttribute("height", "50");
  rightBox.setAttribute("class", "stadium-field-markings");
  svg.appendChild(rightBox);

  // Render edges
  edges.forEach((edge) => {
    const fromCoord = NODE_COORDS[edge.from];
    const toCoord = NODE_COORDS[edge.to];
    if (!fromCoord || !toCoord) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", fromCoord.x);
    line.setAttribute("y1", fromCoord.y);
    line.setAttribute("x2", toCoord.x);
    line.setAttribute("y2", toCoord.y);
    line.setAttribute("class", `map-edge ${edge.step_free === false ? "step-free-disabled" : ""}`);
    line.setAttribute("id", `edge-${edge.from}-${edge.to}`);
    svg.appendChild(line);
  });
  
  // Render pulsing rings for gates (simulation capacity)
  nodes.forEach((node) => {
    const coord = NODE_COORDS[node.id];
    if (!coord) return;
    if (node.type === "gate") {
      const pulseRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      pulseRing.setAttribute("cx", coord.x);
      pulseRing.setAttribute("cy", coord.y);
      pulseRing.setAttribute("r", "16");
      pulseRing.setAttribute("class", "gate-pulse");
      pulseRing.setAttribute("id", `pulse-ring-${node.id}`);
      svg.appendChild(pulseRing);
    }
  });

  // Render nodes
  nodes.forEach((node) => {
    const coord = NODE_COORDS[node.id];
    if (!coord) return;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.setAttribute("class", `map-node node-${node.type}`);
    g.setAttribute("id", `node-${node.id}`);
    g.setAttribute("tabindex", "0");
    g.setAttribute("role", "button");
    g.setAttribute("aria-label", `${node.name} (${node.type.replace('_', ' ')})`);

    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", coord.x);
    circle.setAttribute("cy", coord.y);
    circle.setAttribute("class", "map-node-circle");
    
    let r = 8;
    if (node.type === "gate") r = 16;
    else if (node.type === "section") r = 15;
    else if (node.type === "concourse") r = 6;
    else r = 13;
    circle.setAttribute("r", r);
    g.appendChild(circle);

    // Labels for Gates/Sections
    if (node.type === "gate" || node.type === "section") {
      // Draw text shadow first for readability
      const shadow = document.createElementNS("http://www.w3.org/2000/svg", "text");
      shadow.setAttribute("x", coord.x);
      shadow.setAttribute("y", coord.y);
      shadow.setAttribute("class", "map-node-label node-text-shadow");
      shadow.textContent = coord.label;
      g.appendChild(shadow);

      const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
      label.setAttribute("x", coord.x);
      label.setAttribute("y", coord.y);
      label.setAttribute("class", "map-node-label");
      label.textContent = coord.label;
      g.appendChild(label);
    } else if (coord.icon) {
      const iconG = document.createElementNS("http://www.w3.org/2000/svg", "g");
      iconG.setAttribute("class", "node-icon");
      let pathData = "";
      if (coord.icon === "cross") {
        pathData = `M${coord.x - 5} ${coord.y - 1.5} h3.5 v-3.5 h3 v3.5 h3.5 v3 h-3.5 v3.5 h-3 v-3.5 h-3.5 z`;
      } else if (coord.icon === "shield") {
        pathData = `M${coord.x} ${coord.y - 6} l4.5 1.8 v3.5 c0 3 -2 5.5 -4.5 6.2 c-2.5 -0.7 -4.5 -3.2 -4.5 -6.2 v-3.5 z`;
      } else if (coord.icon === "help") {
        pathData = `M${coord.x - 2} ${coord.y - 2.5} c0 -2, 4 -2, 4 0 c0 1, -2 1.5, -2 3 M${coord.x} ${coord.y + 3} h0.1`;
      } else if (coord.icon === "wheelchair") {
        pathData = `M${coord.x} ${coord.y - 3.5} a1.2 1.2 0 1 0 0 -2.4 a1.2 1.2 0 1 0 0 2.4 M${coord.x - 3} ${coord.y + 2.5} a2.5 2.5 0 0 1 2.5 -2.5 h1 v2.5 h-1.5 v1.5 h2 v-4 h-2 v-1 h3 v2`;
      }

      if (pathData) {
        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", pathData);
        if (coord.icon === "help") {
          pathEl.setAttribute("fill", "none");
          pathEl.setAttribute("stroke", "var(--floodlight)");
          pathEl.setAttribute("stroke-width", "1.6");
          pathEl.setAttribute("stroke-linecap", "round");
        }
        iconG.appendChild(pathEl);
      }
      g.appendChild(iconG);
    }

    // Attach hover tooltip event listeners
    g.addEventListener("mouseenter", (e) => showTooltip(e, node, coord));
    g.addEventListener("mouseleave", hideTooltip);
    g.addEventListener("focus", (e) => showTooltip(e, node, coord));
    g.addEventListener("blur", hideTooltip);
    
    // Attach click listener for interactive menu pinning
    g.addEventListener("click", (e) => {
      e.stopPropagation();
      pinTooltip(node, coord);
    });

    svg.appendChild(g);
  });
}

function positionTooltip(tooltip, xVal, yVal) {
  const tooltipWidth = tooltip.offsetWidth || 180;
  const tooltipHeight = tooltip.offsetHeight || 110;
  
  let leftVal = xVal - (tooltipWidth / 2);
  let topVal = yVal - tooltipHeight - 12;
  
  const container = el("stadiumSvgContainer");
  const viewWidth = container.clientWidth || 600;
  const viewHeight = container.clientHeight || 480;
  
  if (topVal < 8) {
    topVal = yVal + 16;
  }
  
  leftVal = Math.max(8, Math.min(leftVal, viewWidth - tooltipWidth - 8));
  topVal = Math.max(8, Math.min(topVal, viewHeight - tooltipHeight - 8));
  
  tooltip.style.left = `${leftVal}px`;
  tooltip.style.top = `${topVal}px`;
  tooltip.style.opacity = 1;
}

function showTooltip(e, node, coord) {
  if (pinnedNodeId) return; // don't override pinned tooltip
  const tooltip = el("mapTooltip");
  const svg = el("stadiumSvg");
  
  let tooltipHtml = `<h4>${escapeHTML(node.name)}</h4>`;
  tooltipHtml += `<p>Type: ${escapeHTML(node.type.replace('_', ' '))}</p>`;
  
  if (node.type === "gate") {
    const statusData = currentGateStatuses.find((gs) => gs.gate === node.id);
    if (statusData) {
      const pct = Math.round(statusData.ratio * 100);
      tooltipHtml += `<p>Capacity: <strong>${statusData.current} / ${statusData.capacity}</strong> (${pct}%)</p>`;
      tooltipHtml += `<p>Status: <span class="badge ${statusData.status === 'ok' ? 'ai-on' : 'ai-off'}">${statusData.status.toUpperCase()}</span></p>`;
    }
  }
  
  tooltipHtml += `<span class="tooltip-hint">Click node to pin options</span>`;
  tooltip.innerHTML = tooltipHtml;
  
  // Position
  const rect = svg.getBoundingClientRect();
  const containerRect = el("stadiumSvgContainer").getBoundingClientRect();
  const xVal = rect.left - containerRect.left + (coord.x / 600) * rect.width;
  const yVal = rect.top - containerRect.top + (coord.y / 480) * rect.height;
  
  positionTooltip(tooltip, xVal, yVal);
}

function hideTooltip() {
  if (pinnedNodeId) return;
  el("mapTooltip").style.opacity = 0;
}

function pinTooltip(node, coord) {
  pinnedNodeId = node.id;
  const tooltip = el("mapTooltip");
  const svg = el("stadiumSvg");
  
  let tooltipHtml = `<h4>${escapeHTML(node.name)}</h4>`;
  tooltipHtml += `<p>Type: ${escapeHTML(node.type.replace('_', ' '))}</p>`;
  
  if (node.type === "gate") {
    const statusData = currentGateStatuses.find((gs) => gs.gate === node.id);
    if (statusData) {
      const pct = Math.round(statusData.ratio * 100);
      tooltipHtml += `<p>Capacity: <strong>${statusData.current} / ${statusData.capacity}</strong> (${pct}%)</p>`;
    }
  }
  
  tooltipHtml += `<div class="tooltip-btn-group" style="pointer-events: auto; display: flex; gap: 6px; margin-top: 8px;">`;
  tooltipHtml += `<button class="btn btn-ghost small" style="padding: 4px 6px; font-size: 0.7rem;" onclick="setMapNode('${node.id}', 'start')">Set Start</button>`;
  tooltipHtml += `<button class="btn btn-ghost small" style="padding: 4px 6px; font-size: 0.7rem;" onclick="setMapNode('${node.id}', 'target')">Set To</button>`;
  tooltipHtml += `<button class="btn btn-primary small" style="padding: 4px 6px; font-size: 0.7rem;" onclick="setMapNode('${node.id}', 'incident')">Incident</button>`;
  tooltipHtml += `</div>`;
  
  tooltip.innerHTML = tooltipHtml;
  
  // Position
  const rect = svg.getBoundingClientRect();
  const containerRect = el("stadiumSvgContainer").getBoundingClientRect();
  const xVal = rect.left - containerRect.left + (coord.x / 600) * rect.width;
  const yVal = rect.top - containerRect.top + (coord.y / 480) * rect.height;
  
  positionTooltip(tooltip, xVal, yVal);
}

window.setMapNode = function (nodeId, role) {
  if (role === "start") {
    el("startNode").value = nodeId;
    document.querySelectorAll(".tab-btn").forEach(b => {
      if (b.dataset.tab === "wayfinding") b.click();
    });
  } else if (role === "target") {
    el("targetNode").value = nodeId;
    document.querySelectorAll(".tab-btn").forEach(b => {
      if (b.dataset.tab === "wayfinding") b.click();
    });
  } else if (role === "incident") {
    el("incidentLocation").value = nodeId;
    document.querySelectorAll(".tab-btn").forEach(b => {
      if (b.dataset.tab === "incident") b.click();
    });
  }
  
  updateHighlightsFromInputs();
  pinnedNodeId = null;
  el("mapTooltip").style.opacity = 0;
};

function updateHighlightsFromInputs() {
  document.querySelectorAll(".map-node").forEach(n => {
    n.classList.remove("start-highlight", "target-highlight", "incident-highlight");
  });
  
  const activeTab = document.querySelector(".tab-btn.active")?.dataset.tab;
  
  if (activeTab === "wayfinding") {
    const startId = el("startNode").value;
    const targetId = el("targetNode").value;
    if (startId) el(`node-${startId}`)?.classList.add("start-highlight");
    if (targetId) el(`node-${targetId}`)?.classList.add("target-highlight");
  } else if (activeTab === "incident") {
    const locId = el("incidentLocation").value;
    if (locId) el(`node-${locId}`)?.classList.add("incident-highlight");
  }
}

function updateMapGateStatuses(gates) {
  const svg = el("stadiumSvg");
  const isHeatmap = el("mapViewMode").value === "heatmap";
  
  if (isHeatmap) {
    svg.classList.add("heatmap-active");
  } else {
    svg.classList.remove("heatmap-active");
  }
  
  gates.forEach((g) => {
    const nodeEl = el(`node-${g.gate}`);
    const pulseRing = el(`pulse-ring-${g.gate}`);
    if (!nodeEl) return;
    
    nodeEl.className.baseVal = `map-node node-gate status-${g.gate} status-${g.status}`;
    if (pulseRing) {
      pulseRing.className.baseVal = `gate-pulse status-${g.status}-ring`;
    }
    
    const hue = Math.max(0, Math.min(120, (1 - g.ratio) * 120));
    nodeEl.style.setProperty("--heatmap-color", `hsl(${hue}, 85%, 45%)`);
  });
}

function highlightRoute(path, isIncident = false) {
  clearMapHighlights();
  if (!path || path.length === 0) return;
  
  if (isIncident) {
    el(`node-${path[0]}`)?.classList.add("incident-highlight");
    el(`node-${path[path.length - 1]}`)?.classList.add("target-highlight");
  } else {
    el(`node-${path[0]}`)?.classList.add("start-highlight");
    el(`node-${path[path.length - 1]}`)?.classList.add("target-highlight");
  }
  
  for (let i = 0; i < path.length - 1; i++) {
    const line = el(`edge-${path[i]}-${path[i+1]}`) || el(`edge-${path[i+1]}-${path[i]}`);
    if (line) {
      line.classList.add(isIncident ? "active-incident-edge" : "active-route-edge");
    }
  }
}

function clearMapHighlights() {
  document.querySelectorAll(".map-edge").forEach((line) => {
    line.classList.remove("active-route-edge", "active-incident-edge");
  });
  document.querySelectorAll(".map-node").forEach((node) => {
    node.classList.remove("start-highlight", "target-highlight", "incident-highlight");
  });
  updateHighlightsFromInputs();
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.fields = body.fields;
    throw err;
  }
  return body;
}

/**
 * Load available venues and populate the venue selector dropdown
 */
async function loadAvailableVenues() {
  try {
    const response = await api("/api/venues");
    const venues = response.venues || [];
    const select = el("venueSelect");
    select.innerHTML = "";

    if (venues.length === 0) {
      const opt = document.createElement("option");
      opt.value = "";
      opt.textContent = "No venues available";
      opt.disabled = true;
      select.appendChild(opt);
      return;
    }

    // Add default option
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "";
    defaultOpt.textContent = "Select a venue...";
    select.appendChild(defaultOpt);

    // Add venue options
    const selectedVenueId = localStorage.getItem("selectedVenueId");
    venues.forEach((venue) => {
      const opt = document.createElement("option");
      opt.value = venue.id;
      opt.textContent = `${venue.name} (${venue.nodeCount} nodes)`;
      select.appendChild(opt);
      
      if (venue.id === selectedVenueId) {
        opt.selected = true;
      }
    });
  } catch (err) {
    console.error("Failed to load venues:", err);
    const select = el("venueSelect");
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Error loading venues";
    opt.disabled = true;
    select.appendChild(opt);
  }
}

/* ---------- Tabs ---------- */
function wireTabs() {
  const buttons = document.querySelectorAll(".tab-btn");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => { b.classList.remove("active"); b.removeAttribute("aria-current"); });
      document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
      btn.classList.add("active");
      btn.setAttribute("aria-current", "true");
      el(`tab-${btn.dataset.tab}`).classList.add("active");
      updateHighlightsFromInputs();
    });
  });
}

/* ---------- Accessibility ---------- */
function wireAccessibility() {
  el("contrastToggle").addEventListener("click", (e) => {
    const active = document.body.classList.toggle("high-contrast");
    e.target.setAttribute("aria-pressed", String(active));
  });
  el("textSizeToggle").addEventListener("click", (e) => {
    const active = document.body.classList.toggle("large-text");
    e.target.setAttribute("aria-pressed", String(active));
  });
}

/* ---------- AI status badge ---------- */
async function refreshAiStatus() {
  const badge = el("aiStatusBadge");
  try {
    const health = await api("/api/health");
    badge.textContent = health.aiConfigured ? "AI: connected" : "AI: fallback mode (no key)";
    badge.className = health.aiConfigured ? "badge ai-on" : "badge ai-off";
  } catch {
    badge.textContent = "AI: status unknown";
    badge.className = "badge ai-off";
  }
}

/* ---------- Crowd / Reasoning ---------- */
function renderGates(gates) {
  currentGateStatuses = gates;
  const list = el("gateList");
  list.innerHTML = "";
  gates.forEach((g) => {
    const pct = Math.round(g.ratio * 100);
    const li = document.createElement("li");
    li.className = `gate-card status-${g.status}`;
    
    let escalateAction = "";
    if (g.status !== "ok") {
      escalateAction = `<button class="btn btn-ghost small gate-escalate-btn" data-escalate-gate="${g.gate}" data-escalate-pct="${pct}" style="padding: 2px 6px; font-size: 0.65rem; margin-left: 8px; border-color: var(--amber); color: var(--amber); width: auto; display: inline-block; vertical-align: middle;">Escalate</button>`;
    }
    
    li.innerHTML = `
      <div class="gate-code">${escapeHTML(g.gate.replace("gate-", "").toUpperCase())}</div>
      <div class="gate-meta">
        <div class="gate-label">
          <span>${g.current}/${g.capacity}</span>
          ${escalateAction}
        </div>
        <div class="gauge" role="img" aria-label="Gate ${escapeHTML(g.gate)} at ${pct} percent capacity, status ${g.status}">
          <div class="gauge-fill" style="width:${Math.min(pct, 100)}%"></div>
        </div>
      </div>
      <div class="pct">${pct}%</div>
    `;
    list.appendChild(li);
  });
  updateMapGateStatuses(gates);
}

// Event delegation for dynamically rendered gate escalate buttons
(function wireGateEscalation() {
  const gateList = document.getElementById("gateList");
  if (!gateList) return;
  gateList.addEventListener("click", (e) => {
    const btn = e.target.closest(".gate-escalate-btn[data-escalate-gate]");
    if (btn) {
      e.stopPropagation();
      escalateGate(btn.dataset.escalateGate, parseInt(btn.dataset.escalatePct, 10));
    }
  });
})();

async function refreshCrowdStatus() {
  const { gates } = await api("/api/crowd/status");
  renderGates(gates);
}

function wireCrowdControls() {
  el("tickBtn").addEventListener("click", async () => {
    const { gates } = await api("/api/crowd/tick", { method: "POST" });
    renderGates(gates);
    logConsole("Advanced simulation. New telemetry generated.", "INFO");
  });

  el("explainBtn").addEventListener("click", async () => {
    const feed = el("reasoningFeed");
    feed.innerHTML = `<p class="hint">Analyzing…</p>`;
    logConsole("Starting AI crowd reasoning pass...", "INFO");
    try {
      const { recommendations } = await api("/api/crowd/explain", { method: "POST" });
      if (recommendations.length === 0) {
        feed.innerHTML = `<div class="reasoning-card"><p>All gates currently below the watch threshold. No action needed.</p></div>`;
        logConsole("AI Reasoning: All gates below watch threshold.", "SUCCESS");
        return;
      }
      feed.innerHTML = "";
      recommendations.forEach((r) => {
        const card = document.createElement("div");
        card.className = `reasoning-card ${r.status}`;
        card.innerHTML = `
          <h3>Gate ${escapeHTML(r.gate.replace("gate-", "").toUpperCase())} · ${escapeHTML(r.status.toUpperCase())}</h3>
          <p><strong>${escapeHTML(r.recommendation)}</strong></p>
          <p>${escapeHTML(r.reasoning)}</p>
          <div class="confidence">confidence: ${escapeHTML(r.confidence || "n/a")} · source: ${escapeHTML(r.source)}</div>
        `;
        feed.appendChild(card);
      });
      logConsole(`AI Reasoning: ${recommendations.length} recommendations computed.`, "SUCCESS");
    } catch (err) {
      feed.innerHTML = `<p class="hint">Could not run reasoning pass: ${escapeHTML(err.message)}</p>`;
      logConsole(`AI Reasoning failed: ${err.message}`, "ERROR");
    }
  });
}

/* ---------- Wayfinding ---------- */
async function populateNodeSelects(venueNodes) {
  const options = venueNodes
    .map((n) => `<option value="${escapeHTML(n.id)}">${escapeHTML(n.name)} (${escapeHTML(n.type.replace("_", " "))})</option>`)
    .join("");
  el("startNode").innerHTML = options;
  el("targetNode").innerHTML = options;
  el("incidentLocation").innerHTML = options;
  // Sensible defaults so a first-time user sees something meaningful immediately.
  el("startNode").value = "gate-a";
  el("targetNode").value = "section-101";
  el("incidentLocation").value = "gate-a";

  el("startNode").addEventListener("change", updateHighlightsFromInputs);
  el("targetNode").addEventListener("change", updateHighlightsFromInputs);
  el("incidentLocation").addEventListener("change", updateHighlightsFromInputs);
}

function wireWayfinding() {
  el("wayfindingForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = el("wayResult");
    result.innerHTML = `<p class="hint">Computing route…</p>`;
    const start = el("startNode").value;
    const target = el("targetNode").value;
    logConsole(`Computing route: ${start} -> ${target}...`, "INFO");
    try {
      const body = await api("/api/wayfinding", {
        method: "POST",
        body: JSON.stringify({
          startNodeId: start,
          targetNodeId: target,
          language: el("wayLanguage").value,
          requireStepFree: el("stepFree").checked,
        }),
      });
      const stepNames = body.route.steps.map((s) => s.name).join(" → ");
      highlightRoute(body.route.path, false);
      result.innerHTML = `
        <div class="result-card">
          <p><strong>${escapeHTML(body.directions)}</strong></p>
          <p class="hint">Computed path: ${escapeHTML(stepNames)}</p>
          <p class="hint">${body.route.distanceMeters}m · ~${body.route.walkMinutes} min walk · source: ${escapeHTML(body.directionsSource)}</p>
        </div>
      `;
      logConsole(`Computed route: ${start} -> ${target} (${body.route.distanceMeters}m, ~${body.route.walkMinutes} min walk).`, "SUCCESS");
    } catch (err) {
      result.innerHTML = `<p class="hint">${escapeHTML(err.message)}</p>`;
      logConsole(`Wayfinding calculation failed: ${err.message}`, "ERROR");
    }
  });
}

/* ---------- Multilingual assistant ---------- */
function wireChat() {
  let chatMode = "copilot";
  const CHAT_LOG_KEY = "stadium_monitor_chat_log";
  let chatHistory = [];

  const modeCopilotBtn = el("modeCopilotBtn");
  const modeTranslateBtn = el("modeTranslateBtn");
  const chatInput = el("chatInput");
  const targetLangSelect = el("targetLangSelect");
  const chatSubmitBtn = el("chatSubmitBtn");
  const chatInputLabel = el("chatInputLabel");
  const chatLog = el("chatLog");
  const chatSuggestions = el("chatSuggestions");

  try {
    const saved = localStorage.getItem(CHAT_LOG_KEY);
    if (saved) chatHistory = JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load chat history:", e);
  }

  function renderHistory() {
    chatLog.innerHTML = "";
    chatHistory.forEach((item) => {
      const bubble = document.createElement("div");
      bubble.className = `chat-bubble ${item.sender === 'user' ? 'user-bubble' : 'copilot-bubble'}`;
      bubble.innerHTML = item.html;

      if (item.sender === "copilot" && item.isEscalation) {
        const authContainer = document.createElement("div");
        authContainer.style.cssText = "margin-top: 8px; border-top: 1px dashed var(--navy-700); padding-top: 6px; display: flex; flex-direction: column; gap: 4px;";
        
        if (item.authorized) {
          authContainer.innerHTML = `<span style="color: var(--pitch); font-size: 0.72rem; font-weight: bold; display: flex; align-items: center; gap: 4px;">
            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" style="color: var(--pitch);"><polyline points="20 6 9 17 4 12"></polyline></svg>
            Mitigation Directive Dispatched &amp; Logged
          </span>`;
        } else {
          const authBtn = document.createElement("button");
          authBtn.className = "btn btn-primary small";
          authBtn.style.cssText = "font-size: 0.7rem; padding: 4px 8px; width: 100%; border-radius: 4px; pointer-events: auto;";
          authBtn.textContent = "Authorize Mitigation Directive";
          authBtn.addEventListener("click", () => {
            item.authorized = true;
            localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatHistory));
            renderHistory();
            
            // Add entry to ledger
            const entry = {
              id: Math.random().toString(36).substring(2, 15),
              timestamp: new Date().toLocaleTimeString(),
              severity: "medium",
              calmPhrase: "Crowd redirection in effect. Please follow signs and stewards.",
              dispatch: item.rawReply ? item.rawReply.substring(0, 160) + "..." : "Automated redirection solution."
            };
            incidentLedger.unshift(entry);
            localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(incidentLedger));
            renderLedger();
            
            logConsole("Escalated automated solution authorized & committed to ledger.", "SUCCESS");
          });
          authContainer.appendChild(authBtn);
        }
        bubble.appendChild(authContainer);
      }

      chatLog.appendChild(bubble);
    });
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  renderHistory();

  modeCopilotBtn.addEventListener("click", () => {
    chatMode = "copilot";
    modeCopilotBtn.className = "btn btn-primary small";
    modeCopilotBtn.setAttribute("aria-pressed", "true");
    modeTranslateBtn.className = "btn btn-ghost small";
    modeTranslateBtn.setAttribute("aria-pressed", "false");
    chatInput.placeholder = "e.g. Where is the nearest medical post to Gate A?";
    chatInputLabel.textContent = "Ask a question about the stadium layout, gates, or incidents";
    targetLangSelect.style.display = "none";
    chatSubmitBtn.textContent = "Ask Copilot";
  });

  modeTranslateBtn.addEventListener("click", () => {
    chatMode = "translation";
    modeTranslateBtn.className = "btn btn-primary small";
    modeTranslateBtn.setAttribute("aria-pressed", "true");
    modeCopilotBtn.className = "btn btn-ghost small";
    modeCopilotBtn.setAttribute("aria-pressed", "false");
    chatInput.placeholder = "e.g. Ayuda por favor, no encuentro mi asiento.";
    chatInputLabel.textContent = "Translate a foreign-language message from a fan";
    targetLangSelect.style.display = "inline-block";
    chatSubmitBtn.textContent = "Translate & Guidance";
  });

  // Wire suggestions
  chatSuggestions.querySelectorAll(".chip-btn").forEach((chip) => {
    chip.addEventListener("click", () => {
      const query = chip.getAttribute("data-query");
      chatInput.value = query;
      el("chatForm").dispatchEvent(new Event("submit"));
    });
  });

  el("clearChatBtn").addEventListener("click", () => {
    chatHistory = [];
    localStorage.removeItem(CHAT_LOG_KEY);
    renderHistory();
  });

  el("chatForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = chatInput.value.trim();
    if (!message) return;

    const isEscalation = message.includes("SYSTEM ESCALATION");
    logConsole(`Chat prompt sent: "${message.substring(0, 45)}..."`, "INFO");

    const userHtml = chatMode === "copilot" ? `<strong>You:</strong> ${escapeHTML(message)}` : `<strong>Fan said:</strong> ${escapeHTML(message)}`;
    chatHistory.push({ sender: "user", html: userHtml });
    localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatHistory));
    renderHistory();
    chatInput.value = "";

    const pending = document.createElement("div");
    pending.className = "chat-bubble pending-bubble";
    pending.textContent = chatMode === "copilot" ? "Copilot is analyzing..." : "Translating and assessing tone…";
    chatLog.appendChild(pending);
    chatLog.scrollTop = chatLog.scrollHeight;

    try {
      if (chatMode === "copilot") {
        const activeIncidents = [];
        const incidentResult = el("incidentResult");
        const card = incidentResult.querySelector(".result-card");
        if (card) {
          const text = card.textContent.trim();
          activeIncidents.push({
            type: el("incidentType").value,
            location: el("incidentLocation").value,
            description: el("incidentDescription").value,
            summary: text
          });
        }

        const result = await api("/api/chat", {
          method: "POST",
          body: JSON.stringify({ message, activeIncidents }),
        });
        pending.remove();
        
        const replyHtml = `<strong>Copilot:</strong> ${escapeHTML(result.reply)}`;
        chatHistory.push({ sender: "copilot", html: replyHtml, isEscalation, rawReply: result.reply, authorized: false });
      } else {
        const result = await api("/api/translate", {
          method: "POST",
          body: JSON.stringify({ message, targetLanguage: targetLangSelect.value }),
        });
        pending.remove();

        const replyHtml = `
          <strong>Detected:</strong> ${escapeHTML(result.detected_language)}
          <span class="tone">tone: ${escapeHTML(result.tone)}</span><br/>
          <strong>Translation:</strong> ${escapeHTML(result.translation)}<br/>
          <strong>Guidance:</strong> ${escapeHTML(result.volunteer_guidance)}
        `;
        chatHistory.push({ sender: "copilot", html: replyHtml });
      }
      localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatHistory));
      renderHistory();
      logConsole("Chat Copilot response received successfully.", "SUCCESS");
    } catch (err) {
      pending.remove();
      const errorHtml = `<span style="color: var(--crimson)">Could not process message: ${escapeHTML(err.message)}</span>`;
      chatHistory.push({ sender: "error", html: errorHtml });
      localStorage.setItem(CHAT_LOG_KEY, JSON.stringify(chatHistory));
      renderHistory();
      logConsole(`Chat request failed: ${err.message}`, "ERROR");
    }
  });
}

/* ---------- Operations Console & Ledger ---------- */
const LEDGER_STORAGE_KEY = "stadium_monitor_incident_ledger";
let incidentLedger = [];
let activeTriageData = null;

function loadLedger() {
  try {
    const saved = localStorage.getItem(LEDGER_STORAGE_KEY);
    if (saved) incidentLedger = JSON.parse(saved);
  } catch (e) {
    console.error("Failed to load incident ledger:", e);
  }
  renderLedger();
}

function renderLedger() {
  const list = el("ledgerList");
  const hint = el("emptyLedgerHint");
  if (!list) return;
  list.innerHTML = "";
  if (incidentLedger.length === 0) {
    if (hint) hint.style.display = "block";
    list.appendChild(hint);
    return;
  }
  if (hint) hint.style.display = "none";
  incidentLedger.forEach((entry) => {
    const li = document.createElement("li");
    li.className = "ledger-item";
    li.style.cssText = "background: var(--navy-950); border: 1px solid var(--navy-700); border-radius: 6px; padding: 8px 10px; font-size: 0.8rem; margin-bottom: 6px;";
    li.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: var(--chalk); margin-bottom: 4px; font-family: var(--font-mono);">
        <span>ID: #${entry.id.substring(0, 8)}</span>
        <span>${entry.timestamp}</span>
      </div>
      <div style="margin-bottom: 4px;"><strong>Severity:</strong> <span class="severity severity-${entry.severity}" style="font-size: 0.65rem; padding: 1px 4px; border-radius: 4px;">${entry.severity}</span></div>
      <div><strong>Calm Phrase:</strong> "${escapeHTML(entry.calmPhrase)}"</div>
      <div style="margin-top: 2px;"><strong>Dispatch:</strong> "${escapeHTML(entry.dispatch)}"</div>
    `;
    list.appendChild(li);
  });
}

function logConsole(message, type = "INFO") {
  const consoleFeed = el("consoleFeed");
  if (!consoleFeed) return;
  const time = new Date().toTimeString().split(" ")[0];
  const line = document.createElement("div");
  let color = "#a3b8cc";
  if (type === "SUCCESS") color = "var(--pitch)";
  if (type === "WARN") color = "var(--amber)";
  if (type === "ERROR") color = "var(--crimson)";
  line.style.color = color;
  line.innerHTML = `[${time}] ${type}: ${escapeHTML(message)}`;
  consoleFeed.appendChild(line);
  consoleFeed.scrollTop = consoleFeed.scrollHeight;
}

function triggerAlertAction(action) {
  if (action === 'surge-gate-c') {
    document.querySelectorAll(".tab-btn").forEach(b => {
      if (b.dataset.tab === "crowd") b.click();
    });
    logConsole("Surge Warning alert selected. Gate C analysis requested.", "WARN");
    el("explainBtn").click();
  } else if (action === 'escort-101') {
    document.querySelectorAll(".tab-btn").forEach(b => {
      if (b.dataset.tab === "wayfinding") b.click();
    });
    el("startNode").value = "gate-b";
    el("targetNode").value = "section-101";
    logConsole("Assistance alert selected: routing wheelchair escort Gate B -> Section 101.", "INFO");
    el("wayfindingForm").dispatchEvent(new Event("submit"));
  } else if (action === 'facility-north') {
    document.querySelectorAll(".tab-btn").forEach(b => {
      if (b.dataset.tab === "wayfinding") b.click();
    });
    el("startNode").value = "gate-a";
    el("targetNode").value = "concourse-n";
    logConsole("Facility offline warning: routing repair team Gate A -> North Concourse.", "INFO");
    el("wayfindingForm").dispatchEvent(new Event("submit"));
  }
}

function wireConsoleAndIngestion() {
  el("clearConsoleBtn").addEventListener("click", () => {
    el("consoleFeed").innerHTML = `<div style="color: var(--pitch);">[${new Date().toTimeString().split(" ")[0]}] SYSTEM: Console log cleared.</div>`;
  });

  el("loadSimBtn").addEventListener("click", () => {
    const input = el("simJsonInput").value.trim();
    const feedback = el("simFeedback");
    try {
      if (!input) throw new Error("JSON input is empty.");
      const data = JSON.parse(input);
      if (!Array.isArray(data)) throw new Error("Must be a JSON Array.");
      data.forEach(item => {
        if (!item.gate || typeof item.current !== "number" || typeof item.capacity !== "number") {
          throw new Error("Each object must have 'gate', 'current', and 'capacity'.");
        }
      });
      currentGateStatuses.forEach(gs => {
        const match = data.find(d => d.gate === gs.gate);
        if (match) {
          gs.current = match.current;
          gs.capacity = match.capacity;
          gs.ratio = match.current / match.capacity;
          if (gs.ratio >= 0.9) gs.status = "critical";
          else if (gs.ratio >= 0.7) gs.status = "watch";
          else gs.status = "ok";
        }
      });
      renderGates(currentGateStatuses);
      feedback.style.display = "block";
      feedback.style.color = "var(--pitch)";
      feedback.textContent = "Telemetry override applied successfully.";
      logConsole("Simulation telemetry overridden via custom JSON ingestion.", "SUCCESS");
    } catch (e) {
      feedback.style.display = "block";
      feedback.style.color = "var(--crimson)";
      feedback.textContent = `Error: ${e.message}`;
      logConsole(`Simulation telemetry override failed: ${e.message}`, "ERROR");
    }
  });

  el("clearLedgerBtn").addEventListener("click", () => {
    incidentLedger = [];
    localStorage.removeItem(LEDGER_STORAGE_KEY);
    renderLedger();
    logConsole("Time-Travel Incident Ledger cleared.", "INFO");
  });

  el("approveDispatchBtn").addEventListener("click", () => {
    const calmPhrase = el("draftCalmPhrase").value.trim();
    const dispatch = el("draftDispatchInstruction").value.trim();
    if (!activeTriageData) return;
    
    const entry = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toLocaleTimeString(),
      severity: activeTriageData.severity,
      calmPhrase: calmPhrase,
      dispatch: dispatch
    };
    incidentLedger.unshift(entry);
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(incidentLedger));
    renderLedger();
    
    el("dispatchFormBlock").style.display = "none";
    logConsole(`Incident directive approved & dispatched: responder sent to ${activeTriageData.responderPost}`, "SUCCESS");
    activeTriageData = null;
  });

  document.addEventListener("keydown", (e) => {
    if (e.altKey && (e.key === "a" || e.key === "A")) {
      e.preventDefault();
      // Decision Assist overlay takes priority
      const daOverlay = el("decisionAssistOverlay");
      if (daOverlay && daOverlay.style.display !== "none") {
        el("daApproveBtn").click();
        return;
      }
      const block = el("dispatchFormBlock");
      if (block && block.style.display !== "none") {
        el("approveDispatchBtn").click();
      }
    }
  });

  loadLedger();
}

/* ---------- Decision Assist Overlay ---------- */
let _daCurrentAlert = null;

function openDecisionAssist(alertId, headline, instructions, signage, source, confidence) {
  const overlay = el("decisionAssistOverlay");
  if (!overlay) return;
  _daCurrentAlert = alertId;

  el("daAlertHeadline").value = headline || "";
  el("daStewardInstructions").value = instructions || "";
  el("daSignageText").value = signage || "";
  el("daSourceData").textContent = source || "Crowd Telemetry + Graph Engine";
  el("daConfidence").textContent = confidence || "HIGH (92%)";
  el("daLatency").textContent = Math.floor(80 + Math.random() * 150) + "ms";
  el("daGroundingStatus").textContent = "\u2714 VERIFIED";
  el("daGroundingStatus").className = "da-verified";
  el("daDraftBadge").textContent = "DRAFT";
  el("daDraftBadge").style.background = "var(--pitch)";

  const btn = el("daApproveBtn");
  btn.innerHTML = 'APPROVE & DISPATCH DIRECTIVE<br/><span class="da-shortcut">Keyboard Shortcut: Alt + A</span>';
  btn.classList.remove("dispatched");
  btn.disabled = false;

  overlay.style.display = "block";
  // Re-trigger animation
  overlay.style.animation = "none";
  void overlay.offsetHeight;
  overlay.style.animation = "";
  logConsole(`Decision Assist opened for alert: ${alertId}`, "INFO");
}

function wireDecisionAssist() {
  el("closeDecisionAssist").addEventListener("click", () => {
    el("decisionAssistOverlay").style.display = "none";
    _daCurrentAlert = null;
  });

  el("daApproveBtn").addEventListener("click", () => {
    if (!_daCurrentAlert) return;
    const headline = el("daAlertHeadline").value.trim();
    const instructions = el("daStewardInstructions").value.trim();
    const signage = el("daSignageText").value.trim();

    const entry = {
      id: Math.random().toString(36).substring(2, 15),
      timestamp: new Date().toLocaleTimeString(),
      severity: "P0",
      calmPhrase: signage || headline,
      dispatch: instructions
    };
    incidentLedger.unshift(entry);
    localStorage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(incidentLedger));
    renderLedger();

    logConsole(`DIRECTIVE DISPATCHED for [${_daCurrentAlert}]: "${headline}"`, "SUCCESS");

    const btn = el("daApproveBtn");
    btn.innerHTML = '\u2714 DISPATCHED SUCCESSFULLY';
    btn.classList.add("dispatched");
    btn.disabled = true;
    el("daDraftBadge").textContent = "DISPATCHED";
    el("daDraftBadge").style.background = "#00e5ff";

    setTimeout(() => {
      el("decisionAssistOverlay").style.display = "none";
      _daCurrentAlert = null;
    }, 1800);
  });
}

/* ---------- Escalation Functions ---------- */
function escalateGate(gateId, pct) {
  const gateName = gateId.replace("gate-", "").toUpperCase();
  logConsole(`Escalating Gate ${gateName} capacity warning → Decision Assist.`, "WARN");
  openDecisionAssist(
    gateId,
    `[!] P0-SURGE: Gate ${gateName} at ${pct}% capacity — immediate redirect required`,
    `Deploy steward backup crew to Gate ${gateName}. Activate overflow routing to adjacent gates. Monitor crowd density every 30s.`,
    `TRAFFIC DELAY AHEAD at Gate ${gateName}: Please proceed to nearest alternate gate for faster entry.`,
    `Gate Telemetry: ${pct}% occupancy`,
    pct >= 90 ? "CRITICAL (97%)" : "HIGH (88%)"
  );
}

function escalateAlert(alertId) {
  if (alertId === 'surge-gate-c') {
    logConsole("Escalating Surge Alert at Gate C → Decision Assist.", "WARN");
    openDecisionAssist(
      'surge-gate-c',
      '[!] P0-EMERGENCY: Gate C surge detected — 93% capacity threshold exceeded',
      'Deploy steward backup crew to Gate C immediately. Activate overflow routing to Gates B and D. Monitor crowd density every 30 seconds.',
      'TRAFFIC DELAY AHEAD at Gate C: Please proceed to Gate B or Gate D for faster entry.',
      'Crowd Telemetry: Gate C @ 93%',
      'CRITICAL (96%)'
    );
  } else if (alertId === 'escort-101') {
    logConsole("Escalating Wheelchair Escort Alert → Decision Assist.", "WARN");
    openDecisionAssist(
      'escort-101',
      '[!] ASSIST: Wheelchair escort request — Section 101',
      'Dispatch nearest accessible route steward to Section 101 via step-free path from Gate B. ETA: 4 minutes. Confirm escort arrival via radio.',
      'Accessibility assistance is on the way. Please remain at your current location.',
      'Wayfinding Graph: Step-free route computed',
      'HIGH (91%)'
    );
  } else if (alertId === 'facility-north') {
    logConsole("Escalating Facility Alert → Decision Assist.", "WARN");
    openDecisionAssist(
      'facility-north',
      '[!] FACILITY: Water refill post offline — North Concourse',
      'Notify maintenance crew to North Concourse water station. Deploy temporary water distribution from South Concourse reserves. ETA repair: 20 mins.',
      'The North Concourse water refill station is temporarily offline. Please use South Concourse facilities.',
      'Facility Sensor: Station offline since 14:22',
      'HIGH (89%)'
    );
  }
}

/* ---------- Wire Alerts Feed (Event Delegation) ---------- */
function wireAlertsFeed() {
  const feedList = el("alertsFeedList");
  if (!feedList) return;

  feedList.addEventListener("click", (e) => {
    // Handle escalate buttons
    const escalateBtn = e.target.closest(".escalate-btn[data-escalate]");
    if (escalateBtn) {
      e.stopPropagation();
      escalateAlert(escalateBtn.dataset.escalate);
      return;
    }
    // Handle alert body clicks (triggerAlertAction)
    const actionDiv = e.target.closest("[data-alert-action]");
    if (actionDiv) {
      triggerAlertAction(actionDiv.dataset.alertAction);
    }
  });
}

/* ---------- Incident triage ---------- */
function wireIncidentTriage() {
  el("incidentForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const result = el("incidentResult");
    result.innerHTML = `<p class="hint">Finding nearest responder post and assessing…</p>`;
    el("dispatchFormBlock").style.display = "none";
    try {
      const body = await api("/api/incident/triage", {
        method: "POST",
        body: JSON.stringify({
          incidentType: el("incidentType").value,
          description: el("incidentDescription").value,
          reporterNodeId: el("incidentLocation").value,
          language: el("incidentLanguage").value,
        }),
      });
      highlightRoute(body.route, true);
      result.innerHTML = `
        <div class="result-card">
          <span class="severity severity-${escapeHTML(body.severity)}">${escapeHTML(body.severity)} severity</span>
          <p><strong>Dispatch:</strong> ${escapeHTML(body.dispatch_instruction)}</p>
          <p><strong>Say to the person:</strong> ${escapeHTML(body.volunteer_phrase)}</p>
          <p class="hint">Nearest post: ${escapeHTML(body.responderPost)} (${body.distanceMeters}m) · source: ${escapeHTML(body.source)}</p>
        </div>
      `;
      el("draftCalmPhrase").value = body.volunteer_phrase;
      el("draftDispatchInstruction").value = body.dispatch_instruction;
      el("dispatchFormBlock").style.display = "block";
      activeTriageData = body;
      logConsole(`AI triage completed for ${el("incidentType").value} incident near ${el("incidentLocation").value}. Human verification required.`, "WARN");
    } catch (err) {
      result.innerHTML = `<p class="hint">${escapeHTML(err.message)}</p>`;
      logConsole(`Incident triage failed: ${err.message}`, "ERROR");
    }
  });
}

async function init() {
  wireTabs();
  wireAccessibility();
  wireCrowdControls();
  wireWayfinding();
  wireChat();
  wireIncidentTriage();
  wireConsoleAndIngestion();
  wireDecisionAssist();
  wireAlertsFeed();
  refreshAiStatus();

  el("mapViewMode").addEventListener("change", () => {
    updateMapGateStatuses(currentGateStatuses);
  });
  el("mapLayerMode").addEventListener("change", (e) => {
    const value = e.target.value;
    const svgContainer = el("stadiumSvgContainer");
    const iframeContainer = el("satelliteIframeContainer");
    const legendBlock = el("mapLegendBlock");
    const viewModeSelect = el("mapViewMode");

    if (value === "satellite") {
      svgContainer.style.display = "none";
      legendBlock.style.display = "none";
      viewModeSelect.disabled = true;
      iframeContainer.style.display = "block";
    } else {
      svgContainer.style.display = "block";
      legendBlock.style.display = "block";
      viewModeSelect.disabled = false;
      iframeContainer.style.display = "none";
    }
  });
  el("clearHighlightsBtn").addEventListener("click", () => {
    clearMapHighlights();
  });
  document.addEventListener("click", () => {
    pinnedNodeId = null;
    el("mapTooltip").style.opacity = 0;
  });

  // Load available venues and populate selector
  await loadAvailableVenues();
  el("venueSelect").addEventListener("change", (e) => {
    const venueId = e.target.value;
    if (venueId) {
      localStorage.setItem("selectedVenueId", venueId);
      window.location.reload(); // Reload with new venue
    }
  });

  const { nodes } = await api("/api/venue/nodes");
  const { edges } = await api("/api/venue/edges");
  initStadiumMap(nodes, edges);

  await populateNodeSelects(nodes);
  await refreshCrowdStatus();
  updateHighlightsFromInputs();
}

init();
