const APILogin = "/proxy/login";

const LoginForm = document.getElementById("LoginForm");

LoginForm.addEventListener("submit", async (Event) => {
  Event.preventDefault();

  console.log("dwad");

  const Form = new FormData(LoginForm);
  const Params = new URLSearchParams(Form);

  try {
    const Response = await fetch(APILogin, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: Params
    });

    const Data = await Response.json();
    console.log(Data);
  } catch (Error) {
    console.error(Error);
  }
});
