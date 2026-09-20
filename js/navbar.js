async function LoadNavBar() {
  const Response = await fetch("/html/navbar.html");
  const Content = await Response.text();

  document.getElementById("NavBar").innerHTML = Content;
}

LoadNavBar();
