const setupAuthTabs = () => {
  const form = document.querySelector("[data-auth-form]");
  const tabs = Array.from(document.querySelectorAll("[data-auth-tab]"));
  const signupFields = Array.from(
    document.querySelectorAll("[data-auth-signup-field]"),
  );
  const submitButton = form?.querySelector('button[type="submit"]');
  const passwordInput = form?.querySelector('input[name="password"]');
  const note = document.querySelector(".p-auth__note");
  const noteLink = note?.querySelector("a");

  if (
    !(form instanceof HTMLFormElement) ||
    tabs.length === 0 ||
    !(submitButton instanceof HTMLButtonElement) ||
    !(passwordInput instanceof HTMLInputElement)
  ) {
    return;
  }

  const modeLabels = {
    login: {
      button: "ログインする",
      note: "アカウントをお持ちでない方は、",
      link: "新規登録",
      suffix: "から始められます。",
      passwordAutocomplete: "current-password",
    },
    signup: {
      button: "新規登録する",
      note: "すでにアカウントをお持ちの方は、",
      link: "ログイン",
      suffix: "できます。",
      passwordAutocomplete: "new-password",
    },
  };

  const setAuthMode = (mode) => {
    const isSignup = mode === "signup";
    const labels = modeLabels[mode] || modeLabels.login;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.authTab === mode;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;

      if (isActive) {
        form.setAttribute("aria-labelledby", tab.id);
      }
    });

    signupFields.forEach((field) => {
      field.hidden = !isSignup;
      const input = field.querySelector("input");

      if (input instanceof HTMLInputElement) {
        input.required = isSignup;
      }
    });

    submitButton.textContent = labels.button;
    passwordInput.autocomplete = labels.passwordAutocomplete;

    if (note instanceof HTMLElement && noteLink instanceof HTMLAnchorElement) {
      note.firstChild.textContent = labels.note;
      noteLink.textContent = labels.link;
      noteLink.dataset.authSwitch = isSignup ? "login" : "signup";
      note.lastChild.textContent = labels.suffix;
    }
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setAuthMode(tab.dataset.authTab || "login");
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
        return;
      }

      event.preventDefault();
      const currentIndex = tabs.indexOf(tab);
      const nextIndex =
        event.key === "ArrowRight"
          ? (currentIndex + 1) % tabs.length
          : (currentIndex - 1 + tabs.length) % tabs.length;
      const nextTab = tabs[nextIndex];

      nextTab.focus();
      setAuthMode(nextTab.dataset.authTab || "login");
    });
  });

  noteLink?.addEventListener("click", (event) => {
    event.preventDefault();
    setAuthMode(noteLink.dataset.authSwitch || "signup");
  });

  setAuthMode("login");
};

setupAuthTabs();
