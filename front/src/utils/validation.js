export function validateSignup(values) {
  const errors = {};

  if (!values.username || values.username.trim().length < 4) {
    errors.username = "아이디는 4자 이상이어야 합니다.";
  }

  if (!/^(?=.*[A-Za-z])(?=.*[^A-Za-z0-9]).{7,}$/.test(values.password || "")) {
    errors.password = "비밀번호는 영문과 특수문자를 포함해 7자 이상이어야 합니다.";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email || "")) {
    errors.email = "올바른 이메일 형식이 아닙니다.";
  }

  return errors;
}

export function validateLogin(values) {
  const errors = {};
  if (!values.username) errors.username = "아이디를 입력하세요.";
  if (!values.password) errors.password = "비밀번호를 입력하세요.";
  return errors;
}
