
(() => {
  "use strict";

  const CONFIG = window.KAIOKEN_MARKET_CONFIG || {};
  const isConfigured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(CONFIG.supabaseUrl || "") &&
    /^sb_publishable_/i.test(CONFIG.supabasePublishableKey || "") &&
    !CONFIG.supabasePublishableKey.includes("REPLACE_ME");

  const setupState = document.getElementById("setup-state");
  const statusEl = document.getElementById("market-status");
  const grid = document.getElementById("listing-grid");
  const emptyState = document.getElementById("empty-state");
  const emptyText = document.getElementById("empty-state-text");
  const listingDialog = document.getElementById("listing-dialog");
  const reportDialog = document.getElementById("report-dialog");
  const listingForm = document.getElementById("listing-form");
  const reportForm = document.getElementById("report-form");
  const template = document.getElementById("listing-card-template");

  let db = null;
  let user = null;
  let listings = [];
  let currentTab = "active";
  let refreshTimer = null;
  let catalogSearchTimer = null;
  let selectedCatalogItem = null;

  const allowedCategories = new Set([
    "equipment","scroll","consumable","etc","material","currency","dragon_ball",
    "gachapon","special","service","other"
  ]);
  const allowedSides = new Set(["sell","buy"]);

  function setStatus(message = "", type = "") {
    statusEl.textContent = message;
    statusEl.className = "market-status" + (type ? ` ${type}` : "");
  }

  function safeString(value, max = 240) {
    return String(value ?? "").trim().slice(0, max);
  }

  function formatMesos(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "0 mesos";
    return `${new Intl.NumberFormat().format(n)} mesos`;
  }

  function daysSince(dateValue) {
    const ms = Date.now() - new Date(dateValue).getTime();
    return Math.max(0, Math.floor(ms / 86400000));
  }

  function listingState(row) {
    if (row.sold_at) return "sold";
    if (row.market_state === "waiting" || row.market_state === "active") return row.market_state;
    return daysSince(row.refreshed_at || row.created_at) >= 7 ? "waiting" : "active";
  }

  function relativeAge(row) {
    const days = daysSince(row.refreshed_at || row.created_at);
    if (days === 0) return "Today";
    if (days === 1) return "1 day";
    return `${days} days`;
  }

  function displayUserName() {
    if (!user) return "Browsing as guest";
    const meta = user.user_metadata || {};
    return safeString(meta.full_name || meta.name || meta.user_name || "Discord user", 60);
  }

  function updateAccountUI() {
    document.getElementById("account-name").textContent = displayUserName();
    document.getElementById("discord-login").hidden = !!user;
    document.getElementById("sign-out").hidden = !user;
  }

  async function refreshStaffAccess() {
    const link = document.getElementById("staff-console-link");
    link.hidden = true;
    if (!user || !db) return;
    const { data, error } = await db.rpc("market_staff_role");
    if (!error && (data === "editor" || data === "game_developer")) {
      link.hidden = false;
      link.textContent = data === "editor" ? "🛠 Staff Console • Editor" : "🛠 Staff Console • Developer";
    }
  }

  function itemPlaceholder(item) {
    if (item?.category === "dragon_ball") return "🐉";
    if (item?.category === "scroll") return "📜";
    if (item?.category === "equipment") return "⚔️";
    if (item?.category === "material") return "💎";
    if (item?.category === "currency") return "🪙";
    if (item?.category === "service") return "🛠️";
    return "📦";
  }

  function setSelectedCatalogItem(item) {
    selectedCatalogItem = item || null;
    const search = document.getElementById("listing-item-search");
    const selected = document.getElementById("selected-catalog-item");
    const results = document.getElementById("catalog-results");
    const img = document.getElementById("selected-item-image");
    const placeholder = document.getElementById("selected-item-placeholder");
    results.hidden = true;

    if (!item) {
      document.getElementById("listing-catalog-id").value = "";
      document.getElementById("listing-item").value = "";
      document.getElementById("listing-category").value = "";
      document.getElementById("listing-category-display").value = "Choose an item first";
      search.hidden = false;
      search.value = "";
      selected.hidden = true;
      img.hidden = true;
      img.removeAttribute("src");
      placeholder.hidden = false;
      return;
    }

    document.getElementById("listing-catalog-id").value = safeString(item.id, 80);
    document.getElementById("listing-item").value = safeString(item.name, 60);
    document.getElementById("listing-category").value = safeString(item.category, 30);
    document.getElementById("listing-category-display").value = safeString(item.category, 30).replaceAll("_", " ");
    document.getElementById("selected-item-name").textContent = safeString(item.name, 120);
    document.getElementById("selected-item-meta").textContent = `${safeString(item.category, 30).replaceAll("_", " ")} • ${item.kind === "kaioken_custom" ? "KaiokenMS Custom" : item.kind === "service" ? "Service" : "MapleStory"}`;
    placeholder.textContent = itemPlaceholder(item);
    if (item.image_url) {
      img.src = item.image_url;
      img.hidden = false;
      placeholder.hidden = true;
      img.onerror = () => { img.hidden = true; placeholder.hidden = false; };
    } else {
      img.hidden = true;
      placeholder.hidden = false;
    }
    search.hidden = true;
    selected.hidden = false;
  }

  function renderCatalogResults(rows) {
    const box = document.getElementById("catalog-results");
    box.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "catalog-result";
      empty.textContent = "No approved items found.";
      box.append(empty);
      box.hidden = false;
      return;
    }
    rows.forEach(item => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "catalog-result";
      const icon = document.createElement("div");
      icon.className = "catalog-result-icon";
      if (item.image_url) {
        const img = document.createElement("img");
        img.src = item.image_url; img.alt = ""; img.loading = "lazy";
        img.onerror = () => { icon.replaceChildren(document.createTextNode(itemPlaceholder(item))); };
        icon.append(img);
      } else icon.textContent = itemPlaceholder(item);
      const text = document.createElement("div");
      const name = document.createElement("b"); name.textContent = safeString(item.name, 120);
      const meta = document.createElement("span"); meta.textContent = safeString(item.category, 30).replaceAll("_", " ");
      text.append(name, meta);
      const kind = document.createElement("span");
      kind.className = "catalog-kind";
      kind.textContent = item.kind === "kaioken_custom" ? "KaiokenMS" : item.kind === "service" ? "Service" : "Maple";
      b.append(icon, text, kind);
      b.addEventListener("click", () => setSelectedCatalogItem(item));
      box.append(b);
    });
    box.hidden = false;
  }

  async function searchCatalog(query = "") {
    if (!db) return;
    const q = safeString(query, 80);
    const { data, error } = await db.rpc("market_search_items", { p_query: q, p_limit: 20 });
    if (error) {
      console.error(error);
      setStatus("Could not search the item catalog.", "error");
      return;
    }
    renderCatalogResults(Array.isArray(data) ? data : []);
  }

  function updateCounts() {
    const active = listings.filter(x => listingState(x) === "active").length;
    const waiting = listings.filter(x => listingState(x) === "waiting").length;
    const mine = user ? listings.filter(x => x.owner_id === user.id && !x.sold_at).length : 0;
    document.getElementById("active-count").textContent = active;
    document.getElementById("waiting-count").textContent = waiting;
    document.getElementById("mine-count").textContent = mine;
  }

  function filteredListings() {
    const search = document.getElementById("market-search").value.trim().toLowerCase();
    const side = document.getElementById("side-filter").value;
    const category = document.getElementById("category-filter").value;
    const sort = document.getElementById("sort-filter").value;

    let rows = listings.filter(row => {
      const state = listingState(row);
      if (currentTab === "active" && state !== "active") return false;
      if (currentTab === "waiting" && state !== "waiting") return false;
      if (currentTab === "mine" && (!user || row.owner_id !== user.id || row.sold_at)) return false;
      if (side !== "all" && row.side !== side) return false;
      if (category !== "all" && row.category !== category) return false;

      if (search) {
        const haystack = [
          row.item_name, row.ign, row.notes, row.contact, row.category
        ].map(v => safeString(v).toLowerCase()).join(" ");
        if (!haystack.includes(search)) return false;
      }
      return true;
    });

    rows.sort((a,b) => {
      if (sort === "price-low") return Number(a.price_mesos) - Number(b.price_mesos);
      if (sort === "price-high") return Number(b.price_mesos) - Number(a.price_mesos);
      if (sort === "oldest") return new Date(a.created_at) - new Date(b.created_at);
      return new Date(b.created_at) - new Date(a.created_at);
    });
    return rows;
  }

  function button(label, className, handler) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `card-btn ${className || ""}`.trim();
    b.textContent = label;
    b.addEventListener("click", handler);
    return b;
  }

  function render() {
    grid.replaceChildren();
    updateCounts();

    const rows = filteredListings();
    emptyState.hidden = rows.length > 0;
    grid.hidden = rows.length === 0;

    if (!rows.length) {
      emptyText.textContent =
        currentTab === "mine" && !user
          ? "Sign in with Discord to see and manage your listings."
          : "Try another filter or be the first player to post.";
      return;
    }

    rows.forEach(row => {
      const frag = template.content.cloneNode(true);
      const card = frag.querySelector(".listing-card");
      const state = listingState(row);
      const isMine = !!user && row.owner_id === user.id;

      if (state === "waiting") card.classList.add("waiting");
      if (isMine) card.classList.add("mine");

      const sideBadge = frag.querySelector(".side-badge");
      sideBadge.textContent = row.side === "sell" ? "SELLING" : "BUYING";
      sideBadge.classList.add(row.side === "sell" ? "sell" : "buy");

      frag.querySelector(".category-badge").textContent = safeString(row.category, 20).toUpperCase();
      frag.querySelector(".age-badge").textContent =
        state === "waiting" ? `WAITING • ${relativeAge(row)}` : `ACTIVE • ${relativeAge(row)}`;

      frag.querySelector(".item-name").textContent = safeString(row.item_name, 60);
      const listingImg = frag.querySelector(".listing-item-image");
      const listingPlaceholder = frag.querySelector(".listing-item-placeholder");
      listingPlaceholder.textContent = itemPlaceholder(row);
      if (row.item_image_url) {
        listingImg.src = row.item_image_url;
        listingImg.hidden = false;
        listingPlaceholder.hidden = true;
        listingImg.onerror = () => { listingImg.hidden = true; listingPlaceholder.hidden = false; };
      }
      frag.querySelector(".listing-price").textContent =
        `${formatMesos(row.price_mesos)}${row.negotiable ? " • Negotiable" : ""}`;
      frag.querySelector(".listing-quantity").textContent = `Qty: ${Number(row.quantity || 1)}`;
      frag.querySelector(".listing-ign").textContent = `IGN: ${safeString(row.ign, 20)}`;
      frag.querySelector(".listing-notes").textContent = safeString(row.notes || "No extra notes.", 240);
      frag.querySelector(".listing-contact").textContent =
        row.contact ? `Contact: ${safeString(row.contact, 80)}` : "Contact: use the listed IGN";
      frag.querySelector(".listing-time").textContent =
        `Posted ${new Date(row.created_at).toLocaleString()}`;

      const actions = frag.querySelector(".listing-actions");
      actions.append(
        button("Copy IGN", "", async () => {
          try {
            await navigator.clipboard.writeText(safeString(row.ign, 20));
            setStatus("IGN copied.", "success");
          } catch {
            setStatus(`IGN: ${safeString(row.ign, 20)}`);
          }
        })
      );

      if (row.contact) {
        actions.append(
          button("Copy Contact", "", async () => {
            try {
              await navigator.clipboard.writeText(safeString(row.contact, 80));
              setStatus("Contact copied.", "success");
            } catch {
              setStatus(`Contact: ${safeString(row.contact, 80)}`);
            }
          })
        );
      }

      if (isMine) {
        actions.append(button("Edit", "", () => openEdit(row)));
        if (state === "waiting") {
          actions.append(button("Renew 7 Days", "renew", () => renewListing(row.id)));
        }
        actions.append(button("Mark Sold", "sold", () => markSold(row.id)));
        actions.append(button("Delete", "delete", () => deleteListing(row.id)));
      } else {
        actions.append(button("Report", "delete", () => openReport(row.id)));
      }

      grid.append(frag);
    });
  }

  async function loadListings() {
    if (!isConfigured || !db) {
      listings = [];
      render();
      return;
    }
    setStatus("Loading market...");
    const { data, error } = await db
      .from("market_public_listings")
      .select("id,owner_id,side,category,item_name,quantity,price_mesos,negotiable,ign,contact,notes,created_at,refreshed_at,updated_at,sold_at,market_state,catalog_item_id,item_image_url,item_kind,item_subcategory")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error(error);
      setStatus("Could not load market listings.", "error");
      return;
    }
    listings = Array.isArray(data) ? data : [];
    setStatus(`Market updated • ${new Date().toLocaleTimeString()}`, "success");
    render();
  }

  async function requireUser() {
    if (user) return true;
    setStatus("Sign in with Discord before posting or managing listings.", "error");
    return false;
  }

  function resetListingForm() {
    listingForm.reset();
    document.getElementById("listing-id").value = "";
    document.getElementById("listing-quantity").value = "1";
    document.getElementById("listing-price").value = "0";
    document.getElementById("listing-dialog-title").textContent = "Post a Listing";
    document.getElementById("save-listing").textContent = "Publish Listing";
    document.getElementById("notes-count").textContent = "0";
    setSelectedCatalogItem(null);
  }

  async function openPost() {
    if (!(await requireUser())) return;
    resetListingForm();
    listingDialog.showModal();
    await searchCatalog("");
    document.getElementById("listing-item-search").focus();
  }

  function openEdit(row) {
    resetListingForm();
    document.getElementById("listing-id").value = row.id;
    document.getElementById("listing-side").value = row.side;
    if (row.catalog_item_id) {
      setSelectedCatalogItem({
        id: row.catalog_item_id, name: row.item_name, category: row.category,
        image_url: row.item_image_url || null, kind: row.item_kind || "maple",
        subcategory: row.item_subcategory || null
      });
    } else {
      document.getElementById("listing-item-search").value = safeString(row.item_name, 60);
      setStatus("This is a legacy listing. Choose its catalog item before saving changes.");
    }
    document.getElementById("listing-quantity").value = Number(row.quantity || 1);
    document.getElementById("listing-price").value = Number(row.price_mesos || 0);
    document.getElementById("listing-negotiable").checked = !!row.negotiable;
    document.getElementById("listing-ign").value = safeString(row.ign, 20);
    document.getElementById("listing-contact").value = safeString(row.contact, 80);
    document.getElementById("listing-notes").value = safeString(row.notes, 240);
    document.getElementById("notes-count").textContent = safeString(row.notes, 240).length;
    document.getElementById("listing-dialog-title").textContent = "Edit Listing";
    document.getElementById("save-listing").textContent = "Save Changes";
    listingDialog.showModal();
  }

  function listingPayload() {
    const side = document.getElementById("listing-side").value;
    const category = document.getElementById("listing-category").value;
    const item = safeString(document.getElementById("listing-item").value, 60);
    const catalogItemId = safeString(document.getElementById("listing-catalog-id").value, 80);
    const qty = Number(document.getElementById("listing-quantity").value);
    const price = Number(document.getElementById("listing-price").value);
    const ign = safeString(document.getElementById("listing-ign").value, 20);
    const contact = safeString(document.getElementById("listing-contact").value, 80);
    const notes = safeString(document.getElementById("listing-notes").value, 240);

    if (!allowedSides.has(side)) throw new Error("Invalid listing type.");
    if (!allowedCategories.has(category)) throw new Error("Choose an approved catalog item.");
    if (!/^[0-9a-f-]{36}$/i.test(catalogItemId)) throw new Error("Choose an approved catalog item.");
    if (item.length < 2) throw new Error("Choose an approved catalog item.");
    if (!Number.isInteger(qty) || qty < 1 || qty > 999999) throw new Error("Invalid quantity.");
    if (!Number.isSafeInteger(price) || price < 0 || price > 99999999999) throw new Error("Invalid price.");
    if (!/^[A-Za-z0-9_]{2,20}$/.test(ign)) throw new Error("IGN must use 2–20 letters, numbers or underscore.");

    return {
      side,
      category,
      item_name: item,
      catalog_item_id: catalogItemId,
      quantity: qty,
      price_mesos: price,
      negotiable: document.getElementById("listing-negotiable").checked,
      ign,
      contact: contact || null,
      notes: notes || null
    };
  }

  async function saveListing(event) {
    event.preventDefault();
    if (!(await requireUser())) return;

    let payload;
    try {
      payload = listingPayload();
    } catch (err) {
      setStatus(err.message, "error");
      return;
    }

    const id = document.getElementById("listing-id").value;
    document.getElementById("save-listing").disabled = true;

    try {
      let result;
      if (id) {
        result = await db.from("market_listings").update(payload).eq("id", id);
      } else {
        result = await db.from("market_listings").insert(payload);
      }
      if (result.error) throw result.error;
      listingDialog.close();
      setStatus(id ? "Listing updated." : "Listing published.", "success");
      await loadListings();
    } catch (err) {
      console.error(err);
      setStatus(err.message || "Could not save listing.", "error");
    } finally {
      document.getElementById("save-listing").disabled = false;
    }
  }

  async function renewListing(id) {
    if (!(await requireUser())) return;
    const { error } = await db.rpc("market_renew_listing", { p_listing_id: id });
    if (error) {
      setStatus(error.message || "Could not renew listing.", "error");
      return;
    }
    setStatus("Listing renewed for another 7 days.", "success");
    await loadListings();
  }

  async function markSold(id) {
    if (!(await requireUser())) return;
    if (!confirm("Mark this listing as sold? It will leave the public market.")) return;
    const { error } = await db.from("market_listings")
      .update({ sold_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return setStatus(error.message, "error");
    setStatus("Listing marked sold.", "success");
    await loadListings();
  }

  async function deleteListing(id) {
    if (!(await requireUser())) return;
    if (!confirm("Delete this listing permanently?")) return;
    const { error } = await db.from("market_listings").delete().eq("id", id);
    if (error) return setStatus(error.message, "error");
    setStatus("Listing deleted.", "success");
    await loadListings();
  }

  function openReport(id) {
    if (!user) {
      setStatus("Sign in with Discord before reporting a listing.", "error");
      return;
    }
    document.getElementById("report-listing-id").value = id;
    reportForm.reset();
    document.getElementById("report-listing-id").value = id;
    reportDialog.showModal();
  }

  async function submitReport(event) {
    event.preventDefault();
    if (!(await requireUser())) return;
    const listingId = document.getElementById("report-listing-id").value;
    const reason = document.getElementById("report-reason").value;
    const details = safeString(document.getElementById("report-details").value, 160);

    const { error } = await db.from("market_reports").insert({
      listing_id: listingId,
      reason,
      details: details || null
    });
    if (error) {
      setStatus(error.code === "23505" ? "You already reported this listing." : error.message, "error");
      return;
    }
    reportDialog.close();
    setStatus("Report submitted. Thank you.", "success");
  }

  async function signInDiscord() {
    if (!isConfigured) return setStatus("Market backend is not connected yet.", "error");
    const redirectTo = CONFIG.redirectUrl || window.location.href.split("#")[0].split("?")[0];
    const { error } = await db.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo }
    });
    if (error) setStatus(error.message, "error");
  }

  async function signOut() {
    if (!db) return;
    await db.auth.signOut();
  }

  function bindUI() {
    document.getElementById("nav-refresh-btn").addEventListener("click", () => window.location.reload());
    document.getElementById("open-listing-form").addEventListener("click", openPost);
    document.getElementById("close-listing-form").addEventListener("click", () => listingDialog.close());
    document.getElementById("cancel-listing").addEventListener("click", () => listingDialog.close());
    document.getElementById("discord-login").addEventListener("click", signInDiscord);
    document.getElementById("sign-out").addEventListener("click", signOut);
    listingForm.addEventListener("submit", saveListing);
    reportForm.addEventListener("submit", submitReport);
    document.getElementById("close-report").addEventListener("click", () => reportDialog.close());
    document.getElementById("cancel-report").addEventListener("click", () => reportDialog.close());

    document.getElementById("listing-notes").addEventListener("input", e => {
      document.getElementById("notes-count").textContent = String(e.target.value.length);
    });

    document.getElementById("listing-item-search").addEventListener("input", e => {
      clearTimeout(catalogSearchTimer);
      catalogSearchTimer = setTimeout(() => searchCatalog(e.target.value), 180);
    });
    document.getElementById("listing-item-search").addEventListener("focus", e => searchCatalog(e.target.value));
    document.getElementById("clear-selected-item").addEventListener("click", () => {
      setSelectedCatalogItem(null);
      searchCatalog("");
      document.getElementById("listing-item-search").focus();
    });

    ["market-search","side-filter","category-filter","sort-filter"].forEach(id => {
      document.getElementById(id).addEventListener(id === "market-search" ? "input" : "change", render);
    });

    document.querySelectorAll(".market-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".market-tab").forEach(x => x.classList.remove("active"));
        btn.classList.add("active");
        currentTab = btn.dataset.marketTab;
        render();
      });
    });
  }

  async function init() {
    bindUI();

    if (!isConfigured) {
      setupState.hidden = false;
      setStatus("Preview mode: connect Supabase to enable shared listings.");
      updateAccountUI();
      render();
      return;
    }

    db = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    const { data } = await db.auth.getSession();
    user = data?.session?.user || null;
    updateAccountUI();
    await refreshStaffAccess();

    db.auth.onAuthStateChange((_event, session) => {
      user = session?.user || null;
      updateAccountUI();
      refreshStaffAccess();
      render();
    });

    await loadListings();

    // Public market data does not need to hammer the backend.
    // Refresh once per minute while the page is open.
    refreshTimer = window.setInterval(loadListings, 60000);
  }

  window.addEventListener("beforeunload", () => {
    if (refreshTimer) clearInterval(refreshTimer);
  });

  init().catch(err => {
    console.error(err);
    setStatus("Market initialization failed.", "error");
  });
})();
