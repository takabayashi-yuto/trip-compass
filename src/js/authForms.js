import { isSupabaseConfigured, supabase } from "./supabaseClient.js";

const AUTH_REDIRECT_PATH = "/create";

const getAuthErrorMessage = (error) => {
  const message = error?.message || "";

  if (message.includes("Invalid login credentials")) {
    return "メールアドレスまたはパスワードが正しくありません。";
  }

  if (message.includes("User already registered")) {
    return "このメールアドレスはすでに登録されています。";
  }

  if (message.includes("Password should be at least")) {
    return "パスワードは8文字以上で入力してください。";
  }

  if (message.includes("Email not confirmed")) {
    return "メールアドレスの確認が完了していません。確認メールをご確認ください。";
  }

  return "認証処理に失敗しました。時間をおいて再度お試しください。";
};

const getFieldValue = (form, name) => {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement ? field.value.trim() : "";
};

const setMessage = (form, type, text) => {
  const message = form.querySelector("[data-auth-message]");

  if (!(message instanceof HTMLElement)) {
    return;
  }

  message.hidden = false;
  message.textContent = text;
  message.classList.toggle("is-error", type === "error");
  message.classList.toggle("is-success", type === "success");
};

const setSubmitting = (form, isSubmitting) => {
  const fields = Array.from(form.elements).filter(
    (field) =>
      field instanceof HTMLInputElement ||
      field instanceof HTMLButtonElement,
  );

  fields.forEach((field) => {
    field.disabled = isSubmitting;
  });
};

const handleSignup = async (form) => {
  const username = getFieldValue(form, "username");
  const email = getFieldValue(form, "email");
  const password = getFieldValue(form, "password");

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
      emailRedirectTo: `${window.location.origin}/login`,
    },
  });

  if (error) {
    throw error;
  }

  if (data.session) {
    window.location.assign(AUTH_REDIRECT_PATH);
    return;
  }

  form.reset();
  setMessage(
    form,
    "success",
    "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
  );
};

const handleLogin = async (form) => {
  const email = getFieldValue(form, "email");
  const password = getFieldValue(form, "password");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  window.location.assign(AUTH_REDIRECT_PATH);
};

const setupAuthForms = () => {
  const forms = Array.from(document.querySelectorAll("[data-auth-form]"));

  forms.forEach((form) => {
    if (!(form instanceof HTMLFormElement)) {
      return;
    }

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      if (!isSupabaseConfigured || !supabase) {
        setMessage(
          form,
          "error",
          "Supabaseの環境変数が設定されていません。.env.localを確認してください。",
        );
        return;
      }

      setSubmitting(form, true);

      try {
        if (form.dataset.authMode === "signup") {
          await handleSignup(form);
        } else {
          await handleLogin(form);
        }
      } catch (error) {
        setMessage(form, "error", getAuthErrorMessage(error));
      } finally {
        setSubmitting(form, false);
      }
    });
  });
};

setupAuthForms();
