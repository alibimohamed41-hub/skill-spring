(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const STORAGE_KEY = "skillspring-state-v1";
  const courseInfo = {
    code: { title: "أساسيات البرمجة", time: "20 دقيقة يوميًا", category: "التقنية" },
    design: { title: "التصميم البصري", time: "15 دقيقة يوميًا", category: "الإبداع" },
    time: { title: "إدارة الوقت", time: "10 دقائق يوميًا", category: "مهارات الحياة" },
    ai: { title: "الذكاء الاصطناعي", time: "15 دقيقة يوميًا", category: "التقنية" },
    write: { title: "الكتابة الإبداعية", time: "15 دقيقة يوميًا", category: "الإبداع" },
    talk: { title: "التواصل الفعّال", time: "10 دقائق يوميًا", category: "مهارات الحياة" }
  };
  const quotes = [
    "لا تحتاج إلى رؤية الدرج كاملًا؛ يكفي أن تبدأ بالدرجة الأولى.",
    "التقدّم البسيط كل يوم يصنع نتائج كبيرة مع الوقت.",
    "لا تنتظر أن تكون مستعدًا تمامًا؛ ابدأ وتعلّم في الطريق.",
    "الاستمرارية أهم من السرعة. خذ وقتك وواصل.",
    "كل مهارة جديدة تفتح لك بابًا لم يكن ظاهرًا من قبل."
  ];
  let state = loadState();
  let toastTimeout;
  let timerSeconds = 25 * 60;
  let timerRunning = false;
  let timerInterval = null;

  function loadState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        saved: Array.isArray(parsed.saved) ? parsed.saved.filter(id => courseInfo[id]) : [],
        completed: Array.isArray(parsed.completed) ? parsed.completed.filter(id => courseInfo[id]) : [],
        focusMinutes: Number.isFinite(parsed.focusMinutes) ? parsed.focusMinutes : 0,
        theme: parsed.theme === "light" ? "light" : "dark",
        quoteIndex: Number.isInteger(parsed.quoteIndex) ? parsed.quoteIndex : 0
      };
    } catch {
      return { saved: [], completed: [], focusMinutes: 0, theme: "dark", quoteIndex: 0 };
    }
  }
  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
    catch { showToast("تعذّر الحفظ في المتصفح. تأكد من إعدادات التخزين."); }
  }
  function showToast(message) {
    const toast = $("#toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => toast.classList.remove("show"), 2600);
  }
  function updateStats() {
    $("#savedCount").textContent = state.saved.length;
    $("#completedCount").textContent = state.completed.length;
    $("#focusMinutes").textContent = state.focusMinutes;
    const percent = state.saved.length ? Math.round(state.completed.length / state.saved.length * 100) : 0;
    $("#heroProgress").textContent = percent + "%";
    $("#heroProgressBar").style.width = percent + "%";
    $("#streakCount").textContent = state.completed.length + (state.completed.length === 1 ? " مهمة" : " مهام");
  }
  function renderPlan() {
    const list = $("#planList");
    list.replaceChildren();
    const empty = $("#planEmpty");
    empty.hidden = state.saved.length > 0;
    state.saved.forEach(id => {
      const info = courseInfo[id];
      const done = state.completed.includes(id);
      const item = document.createElement("div");
      item.className = "plan-item" + (done ? " done" : "");
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = done;
      checkbox.setAttribute("aria-label", "إكمال " + info.title);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) {
          if (!state.completed.includes(id)) state.completed.push(id);
          showToast("يعطيك الصحة! تم تسجيل إنجازك ✨");
        } else {
          state.completed = state.completed.filter(value => value !== id);
        }
        persist(); renderPlan(); updateStats(); syncSaveButtons();
      });
      const main = document.createElement("div");
      main.className = "plan-item-main";
      const title = document.createElement("strong"); title.textContent = info.title;
      const meta = document.createElement("small"); meta.textContent = info.category + " · " + info.time;
      main.append(title, meta);
      const remove = document.createElement("button");
      remove.className = "remove-plan"; remove.type = "button"; remove.textContent = "×";
      remove.setAttribute("aria-label", "حذف " + info.title);
      remove.addEventListener("click", () => {
        state.saved = state.saved.filter(value => value !== id);
        state.completed = state.completed.filter(value => value !== id);
        persist(); renderPlan(); updateStats(); syncSaveButtons();
        showToast("تم حذف المهارة من خطتك.");
      });
      item.append(checkbox, main, remove);
      list.append(item);
    });
  }
  function syncSaveButtons() {
    $$("[data-save]").forEach(button => {
      const saved = state.saved.includes(button.dataset.save);
      button.classList.toggle("saved", saved);
      button.textContent = saved ? "✓ في خطتك" : "＋ أضف إلى خطتي";
    });
  }
  $$("[data-save]").forEach(button => button.addEventListener("click", () => {
    const id = button.dataset.save;
    if (state.saved.includes(id)) {
      state.saved = state.saved.filter(value => value !== id);
      state.completed = state.completed.filter(value => value !== id);
      showToast("تمت إزالة المهارة من خطتك.");
    } else {
      state.saved.push(id);
      showToast("أُضيفت المهارة إلى خطتك. انطلق! ✨");
    }
    persist(); renderPlan(); updateStats(); syncSaveButtons();
  }));
  $("#filterRow").addEventListener("click", event => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    $$(".filter-chip").forEach(chip => chip.classList.toggle("active", chip === button));
    filterCourses();
  });
  $("#searchInput").addEventListener("input", filterCourses);
  function filterCourses() {
    const filter = $(".filter-chip.active")?.dataset.filter || "all";
    const term = $("#searchInput").value.trim().toLocaleLowerCase();
    let shown = 0;
    $$(".course-card").forEach(card => {
      const matchesCategory = filter === "all" || card.dataset.category === filter;
      const matchesText = (card.dataset.title + " " + card.textContent).toLocaleLowerCase().includes(term);
      const visible = matchesCategory && matchesText;
      card.hidden = !visible;
      if (visible) shown++;
    });
    $("#emptyState").hidden = shown > 0;
  }
  $("#themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    applyTheme(); persist();
  });
  function applyTheme() {
    document.body.classList.toggle("light", state.theme === "light");
    $("#themeToggle").textContent = state.theme === "light" ? "☾" : "☼";
    $("#themeToggle").setAttribute("aria-label", state.theme === "light" ? "التبديل إلى المظهر الداكن" : "التبديل إلى المظهر الفاتح");
  }
  function renderQuote() {
    $("#quoteText").textContent = quotes[state.quoteIndex % quotes.length];
  }
  $("#newQuote").addEventListener("click", () => {
    state.quoteIndex = (state.quoteIndex + 1) % quotes.length;
    persist(); renderQuote();
  });
  function formatTime(seconds) {
    const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return mins + ":" + secs;
  }
  function renderTimer() { $("#timerDisplay").textContent = formatTime(timerSeconds); }
  function stopTimer() {
    timerRunning = false;
    clearInterval(timerInterval);
    timerInterval = null;
    $("#timerStart").textContent = "ابدأ التركيز";
  }
  $("#timerStart").addEventListener("click", () => {
    if (timerRunning) {
      stopTimer();
      $("#timerStart").textContent = "واصل التركيز";
      return;
    }
    timerRunning = true;
    $("#timerStart").textContent = "إيقاف مؤقت";
    timerInterval = setInterval(() => {
      timerSeconds--;
      renderTimer();
      if (timerSeconds <= 0) {
        stopTimer();
        state.focusMinutes += 25;
        persist(); updateStats();
        timerSeconds = 25 * 60; renderTimer();
        showToast("أحسنت! أكملت جلسة تركيز من 25 دقيقة 🎉");
      }
    }, 1000);
  });
  $("#timerReset").addEventListener("click", () => {
    stopTimer(); timerSeconds = 25 * 60; renderTimer();
  });
  $("#year").textContent = new Date().getFullYear();
  applyTheme(); renderPlan(); updateStats(); syncSaveButtons(); renderQuote(); renderTimer();
})();