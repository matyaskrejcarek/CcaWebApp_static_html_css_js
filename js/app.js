
(function () {
    const EVENT_NAMES = {
        "333": "3x3x3 Cube",
        "222": "2x2x2 Cube",
        "444": "4x4x4 Cube",
        "555": "5x5x5 Cube",
        "666": "6x6x6 Cube",
        "777": "7x7x7 Cube",
        "333bf": "3x3x3 Blindfolded",
        "333fm": "3x3x3 Fewest Moves",
        "333oh": "3x3x3 One-Handed",
        "clock": "Clock",
        "minx": "Megaminx",
        "pyram": "Pyraminx",
        "skewb": "Skewb",
        "sq1": "Square-1",
        "444bf": "4x4x4 Blindfolded",
        "555bf": "5x5x5 Blindfolded",
        "333mbf": "3x3x3 Multi-Blind"
    };

    document.addEventListener("click", function (event) {
        const nav = event.target.closest(".nav-scrollable a");
        if (nav) {
            const toggle = document.querySelector(".navbar-toggler");
            if (toggle) toggle.checked = false;
        }
    });

    function escapeHtml(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function normalizeWcaUrl(value) {
        if (!value) return "";
        if (String(value).startsWith("http")) return value;
        if (String(value).startsWith("/")) return `https://www.worldcubeassociation.org${value}`;
        return value;
    }

    function formatDate(value, withYear = true) {
        if (!value) return "";
        const date = new Date(`${value}T00:00:00`);
        return date.toLocaleDateString("cs-CZ", {
            day: "numeric",
            month: "numeric",
            ...(withYear ? { year: "numeric" } : {})
        });
    }

    function formatDateTime(value) {
        if (!value) return "";
        return new Date(value).toLocaleString("cs-CZ", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit"
        });
    }

    function formatDateForApi(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
    }

    function addYears(date, years) {
        const copy = new Date(date.getTime());
        copy.setFullYear(copy.getFullYear() + years);
        return copy;
    }

    function getCompetitionsUrl() {
        const start = new Date();
        start.setDate(start.getDate() - 14);
        const end = addYears(start, 2);
        return `https://www.worldcubeassociation.org/api/v0/competitions?country_iso2=CZ&start=${formatDateForApi(start)}&end=${formatDateForApi(end)}&per_page=100`;
    }

    async function fetchJson(url) {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        if (!response.ok) {
            throw new Error(`${response.status} ${response.statusText}`);
        }
        return await response.json();
    }

    function getEvents(competition) {
        const events = [];
        if (Array.isArray(competition.event_ids)) {
            events.push(...competition.event_ids);
        }
        if (Array.isArray(competition.events)) {
            for (const event of competition.events) {
                if (typeof event === "string") events.push(event);
                else if (event && typeof event === "object") events.push(event.id || event.event_id || event.name);
            }
        }
        return [...new Set(events.filter(Boolean))];
    }

    function dateRangeText(competition, withYear = true) {
        const start = formatDate(competition.start_date, withYear);
        const end = formatDate(competition.end_date, withYear);
        return competition.end_date && competition.end_date !== competition.start_date ? `${start} – ${end}` : start;
    }

    function getCompetitionStatus(competition) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(`${competition.start_date}T00:00:00`);
        const end = new Date(`${competition.end_date || competition.start_date}T23:59:59`);
        const registrationOpen = competition.registration_open ? new Date(competition.registration_open) : null;
        const registrationClose = competition.registration_close ? new Date(competition.registration_close) : null;

        if (start <= today && end >= today) return { text: "Právě probíhá", css: "running" };
        if (end < today) return { text: "Soutěž již proběhla", css: "past" };
        if (registrationOpen && now < registrationOpen) return { text: `Registrace od ${formatDate(registrationOpen.toISOString().slice(0, 10))}`, css: "upcoming" };
        if (registrationClose && now <= registrationClose) return { text: `Registrace do ${formatDate(registrationClose.toISOString().slice(0, 10))}`, css: "open" };
        if (registrationClose && now > registrationClose) return { text: "Registrace uzavřena", css: "closed" };
        return { text: "Registrace bude upřesněna", css: "unknown" };
    }

    function registrationText(competition) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(`${competition.start_date}T00:00:00`);
        const end = new Date(`${competition.end_date || competition.start_date}T23:59:59`);
        const registrationOpen = competition.registration_open ? new Date(competition.registration_open) : null;
        const registrationClose = competition.registration_close ? new Date(competition.registration_close) : null;

        if (start <= today && end >= today) return "soutěž právě probíhá";
        if (end < today) return "soutěž již proběhla";
        if (registrationOpen && now < registrationOpen) return `od ${formatDateTime(competition.registration_open)}`;
        if (registrationClose && now <= registrationClose) return `otevřená do ${formatDateTime(competition.registration_close)}`;
        if (registrationClose && now > registrationClose) return "registrace uzavřena";
        return "dle WCA stránky";
    }

    function eventIcon(eventId) {
        const id = escapeHtml(eventId);
        return `<span class="cubing-icon event-${id}" title="${escapeHtml(EVENT_NAMES[eventId] || eventId)}" aria-hidden="true"></span>`;
    }

    function competitionCard(competition) {
        const status = getCompetitionStatus(competition);
        const events = getEvents(competition).slice(0, 18);
        return `
            <a class="competition-card" href="soutez.html?id=${encodeURIComponent(competition.id)}">
                <div class="competition-meta">
                    <span class="date-badge competition-date">${escapeHtml(dateRangeText(competition, false))}</span>
                    <span class="status-pill ${escapeHtml(status.css)}">${escapeHtml(status.text)}</span>
                </div>
                <h2>${escapeHtml(competition.name)}</h2>
                <p>${escapeHtml(competition.city || "")}</p>
                ${events.length ? `<div class="competition-card-icon-list">${events.map(eventIcon).join("")}</div>` : ""}
            </a>`;
    }

    async function loadHomeCompetitions() {
        const target = document.getElementById("home-competitions");
        if (!target) return;
        try {
            const competitions = await fetchJson(getCompetitionsUrl());
            if (!Array.isArray(competitions) || competitions.length === 0) {
                target.innerHTML = `<p>Momentálně jsme nenašli žádné nadcházející WCA soutěže v Česku.</p>`;
                return;
            }
            const cards = competitions.slice(0, 6).map(c => `
                <a class="mini-competition" href="soutez.html?id=${encodeURIComponent(c.id)}">
                    <strong>${escapeHtml(c.name)}</strong>
                    <span>${escapeHtml(formatDate(c.start_date, false))} – ${escapeHtml(c.city || "")}</span>
                </a>`).join("");
            target.innerHTML = `${cards}<a class="text-link" href="souteze.html">Zobrazit celý kalendář →</a>`;
        } catch (error) {
            target.innerHTML = `<div class="error-panel">Soutěže se nepodařilo načíst z WCA API.</div>`;
        }
    }

    async function loadCompetitions() {
        const target = document.getElementById("competitions-list");
        if (!target) return;
        try {
            const competitions = await fetchJson(getCompetitionsUrl());
            if (!Array.isArray(competitions) || competitions.length === 0) {
                target.className = "empty-state panel";
                target.innerHTML = `<h2>Žádné soutěže k zobrazení</h2><p>WCA API aktuálně nevrátilo žádné soutěže v Česku pro vybrané období.</p>`;
                return;
            }
            target.className = "competition-grid";
            target.innerHTML = competitions.map(competitionCard).join("");
        } catch (error) {
            target.className = "error-panel";
            target.innerHTML = `Nepodařilo se načíst soutěže z WCA API: ${escapeHtml(error.message)}`;
        }
    }

    function simpleMarkdown(value) {
        if (!value) return "";
        let text = escapeHtml(value);
        text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
        text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        return text.split(/\n{2,}/).map(part => `<p>${part.replace(/\n/g, "<br>")}</p>`).join("");
    }

    function initials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
        if (!parts.length) return "?";
        if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }

    function personCard(person) {
        const avatar = person.avatar && (person.avatar.thumb_url || person.avatar.url);
        const avatarHtml = avatar
            ? `<img src="${escapeHtml(normalizeWcaUrl(avatar))}" alt="${escapeHtml(person.name)}" loading="lazy" />`
            : `<div class="competition-person-initials">${escapeHtml(initials(person.name))}</div>`;
        const wcaId = person.wca_id || person.wcaId;
        const nameHtml = wcaId
            ? `<a href="https://www.worldcubeassociation.org/persons/${encodeURIComponent(wcaId)}" target="_blank" rel="noopener noreferrer">${escapeHtml(person.name)}</a>`
            : `<strong>${escapeHtml(person.name)}</strong>`;
        return `
            <div class="competition-person-card">
                ${avatar ? avatarHtml : avatarHtml}
                <div>
                    ${nameHtml}
                    ${wcaId ? `<span>${escapeHtml(wcaId)}</span>` : ""}
                </div>
            </div>`;
    }

    function teamSection(competition) {
        const delegates = Array.isArray(competition.delegates) ? competition.delegates : [];
        const organizers = Array.isArray(competition.organizers) ? competition.organizers : [];
        if (!delegates.length && !organizers.length) return "";

        return `
            <section class="detail-section competition-team-section">
                <h2>Organizační tým</h2>
                <div class="competition-team-grid">
                    ${delegates.length ? `
                        <div class="competition-team-group">
                            <h3>Delegáti</h3>
                            <div class="competition-person-list">${delegates.map(personCard).join("")}</div>
                        </div>` : ""}
                    ${organizers.length ? `
                        <div class="competition-team-group">
                            <h3>Organizátoři</h3>
                            <div class="competition-person-list">${organizers.map(personCard).join("")}</div>
                        </div>` : ""}
                </div>
            </section>`;
    }

    async function loadCompetitionDetail() {
        const target = document.getElementById("competition-detail");
        if (!target) return;
        const id = new URLSearchParams(window.location.search).get("id");
        if (!id) {
            target.className = "empty-state panel";
            target.innerHTML = `<p class="eyebrow">WCA soutěž</p><h1>Soutěž nenalezena</h1><p>V odkazu chybí ID soutěže.</p><a class="btn btn-primary" href="souteze.html">Zpět na soutěže</a>`;
            return;
        }

        try {
            const response = await fetchJson(`https://www.worldcubeassociation.org/api/v0/competitions/${encodeURIComponent(id)}`);
            const competition = response.competition || response;
            if (!competition || !competition.id) {
                throw new Error("Soutěž nebyla nalezena.");
            }

            document.title = `${competition.name} | CCA`;
            const events = getEvents(competition);
            const mainEvent = competition.main_event_id;
            const wcaUrl = `https://www.worldcubeassociation.org/competitions/${encodeURIComponent(competition.id)}`;
            const registrationUrl = `${wcaUrl}/register`;

            target.className = "competition-detail panel";
            target.innerHTML = `
                <a class="text-link" href="souteze.html">← Zpět na soutěže</a>
                <p class="eyebrow">${escapeHtml(dateRangeText(competition, true))}</p>
                <h1>${escapeHtml(competition.name)}</h1>
                <p class="lead">${escapeHtml(competition.city || "")}</p>

                <div class="detail-actions">
                    <a class="btn btn-primary btn-lg" href="${registrationUrl}" target="_blank" rel="noopener noreferrer">Registrace na WCA</a>
                    <a class="btn btn-outline-dark btn-lg" href="${wcaUrl}" target="_blank" rel="noopener noreferrer">Oficiální stránka WCA</a>
                </div>

                ${(events.length || mainEvent) ? `
                    <div class="competition-events-layout">
                        ${events.length ? `
                            <section class="detail-section event-list-section">
                                <h2>Disciplíny</h2>
                                <div class="event-icon-grid">
                                    ${events.map(eventId => `<span class="event-icon-pill" title="${escapeHtml(EVENT_NAMES[eventId] || eventId)}">${eventIcon(eventId)}</span>`).join("")}
                                </div>
                            </section>` : ""}
                        ${mainEvent ? `
                            <section class="detail-section event-feature-section">
                                <h2>Hlavní disciplína</h2>
                                <div class="main-event-card" title="${escapeHtml(EVENT_NAMES[mainEvent] || mainEvent)}">${eventIcon(mainEvent)}</div>
                            </section>` : ""}
                    </div>` : ""}

                <div class="info-grid">
                    <div>
                        <span>Termín</span>
                        <strong>${escapeHtml(dateRangeText(competition, true))}</strong>
                    </div>
                    <div>
                        <span>Adresa</span>
                        <strong>${escapeHtml(competition.venue_address || "dle WCA stránky")}</strong>
                    </div>
                    <div>
                        <span>Registrace</span>
                        <strong>${escapeHtml(registrationText(competition))}</strong>
                    </div>
                    ${competition.venue ? `
                        <div class="markdown-content">
                            <span>Místo</span>
                            ${simpleMarkdown(competition.venue)}
                        </div>` : ""}
                </div>

                ${teamSection(competition)}
            `;
        } catch (error) {
            target.className = "empty-state panel";
            target.innerHTML = `<p class="eyebrow">WCA soutěž</p><h1>Soutěž nenalezena</h1><p>Detail se nepodařilo načíst z WCA API: ${escapeHtml(error.message)}</p><a class="btn btn-primary" href="souteze.html">Zpět na soutěže</a>`;
        }
    }

    const page = document.body.dataset.page;
    if (page === "home") loadHomeCompetitions();
    if (page === "competitions") loadCompetitions();
    if (page === "competition-detail") loadCompetitionDetail();
})();
